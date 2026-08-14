-- Apply bounded equipped achievement-charm bonuses to the five shared reward games.

begin;

do $$
begin
  if pg_catalog.to_regprocedure('private.claim_game_reward_passive_internal(uuid,uuid,jsonb)') is null then
    alter function public.claim_game_reward(uuid, uuid, jsonb)
      rename to claim_game_reward_passive_internal;
    alter function public.claim_game_reward_passive_internal(uuid, uuid, jsonb)
      set schema private;
  end if;
end
$$;

revoke all on function private.claim_game_reward_passive_internal(uuid, uuid, jsonb)
from public, anon, authenticated;

create or replace function public.claim_game_reward(
  claim_session_id uuid,
  claim_idempotency_key uuid,
  claim_evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  claim_result jsonb;
  reward_event public.game_reward_events%rowtype;
  favor_multiplier_bps integer := 0;
  material_multiplier_bps integer := 0;
  base_favor integer := 0;
  favor_bonus integer := 0;
  cap_remaining integer := 0;
  favor_result jsonb;
  material_entry jsonb;
  material_result jsonb;
  material_bonus integer;
  enriched_materials jsonb := '[]'::jsonb;
begin
  claim_result := private.claim_game_reward_passive_internal(
    claim_session_id,
    claim_idempotency_key,
    claim_evidence
  );

  if claim_result ->> 'replayed' = 'true' then
    return claim_result;
  end if;
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select event.*
  into reward_event
  from public.game_reward_events as event
  where event.id = (claim_result ->> 'reward_event_id')::uuid
    and event.user_id = caller_id
    and event.session_id = claim_session_id
  for update;

  if reward_event.id is null then
    raise exception using errcode = '55000', message = 'Reward event could not be verified';
  end if;

  select
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,game_favor_multiplier_bps}' ~ '^[0-9]{1,4}$'
          then (achievement.reward #>> '{effects,game_favor_multiplier_bps}')::integer
        else 0
      end
    ), 0))::integer,
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,game_material_multiplier_bps}' ~ '^[0-9]{1,4}$'
          then (achievement.reward #>> '{effects,game_material_multiplier_bps}')::integer
        else 0
      end
    ), 0))::integer
  into favor_multiplier_bps, material_multiplier_bps
  from public.user_relic_charms as charm
  join public.user_achievements as unlocked
    on unlocked.user_id = charm.user_id
    and unlocked.achievement_key = charm.data #>> '{source,key}'
  join public.achievement_catalog as achievement
    on achievement.achievement_key = unlocked.achievement_key
    and achievement.active
  where charm.user_id = caller_id
    and charm.data ->> 'equipped' = 'true'
    and charm.data #>> '{source,type}' = 'achievement'
    and charm.data ->> 'charm_key' = achievement.reward ->> 'charm_key';

  base_favor := coalesce((claim_result #>> '{favor,delta}')::integer, 0);
  cap_remaining := coalesce((claim_result #>> '{favor,cap_remaining}')::integer, 0);
  if base_favor > 0 and favor_multiplier_bps > 0 and cap_remaining > 0 then
    favor_bonus := least(
      cap_remaining,
      greatest(1, pg_catalog.ceil(base_favor::numeric * favor_multiplier_bps / 10000)::integer)
    );
    favor_result := private.post_favor_entry(
      caller_id,
      favor_bonus,
      'game_reward_bonus',
      reward_event.id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'passive:favor'),
      pg_catalog.jsonb_build_object(
        'game_key', reward_event.game_key,
        'session_id', reward_event.session_id,
        'effect_key', 'game_favor_multiplier_bps',
        'effect_value', favor_multiplier_bps
      )
    );

    update public.game_reward_cap_buckets
    set favor_earned = favor_earned + favor_bonus,
        updated_at = reward_event.created_at
    where user_id = caller_id
      and game_key = reward_event.game_key
      and bucket_date = (reward_event.created_at at time zone 'UTC')::date;

    claim_result := pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(
          claim_result,
          '{favor,delta}',
          pg_catalog.to_jsonb(base_favor + favor_bonus),
          true
        ),
        '{favor,balance}',
        favor_result -> 'favor' -> 'balance',
        true
      ),
      '{favor,cap_remaining}',
      pg_catalog.to_jsonb(cap_remaining - favor_bonus),
      true
    );
  end if;

  for material_entry in
    select material.value
    from pg_catalog.jsonb_array_elements(coalesce(claim_result -> 'materials', '[]'::jsonb))
      as material(value)
  loop
    material_bonus := 0;
    if material_multiplier_bps > 0 and (material_entry ->> 'delta')::integer > 0 then
      material_bonus := greatest(
        1,
        pg_catalog.ceil((material_entry ->> 'delta')::numeric * material_multiplier_bps / 10000)::integer
      );
      material_result := private.post_material_entry(
        caller_id,
        material_entry ->> 'key',
        material_bonus,
        'game_reward_bonus',
        reward_event.id,
        private.game_reward_scoped_uuid(
          claim_idempotency_key,
          'passive:material:' || (material_entry ->> 'key')
        ),
        pg_catalog.jsonb_build_object(
          'game_key', reward_event.game_key,
          'session_id', reward_event.session_id,
          'effect_key', 'game_material_multiplier_bps',
          'effect_value', material_multiplier_bps
        )
      );
      material_entry := pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(
          material_entry,
          '{delta}',
          pg_catalog.to_jsonb((material_entry ->> 'delta')::integer + material_bonus),
          true
        ),
        '{balance}',
        material_result -> 'material' -> 'balance',
        true
      );
    end if;
    enriched_materials := enriched_materials || pg_catalog.jsonb_build_array(material_entry);
  end loop;
  claim_result := pg_catalog.jsonb_set(claim_result, '{materials}', enriched_materials, true);

  update public.game_reward_events
  set favor_awarded = favor_awarded + favor_bonus,
      result_snapshot = claim_result
  where id = reward_event.id
    and user_id = caller_id;

  return claim_result;
end;
$$;

revoke all on function public.claim_game_reward(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.claim_game_reward(uuid, uuid, jsonb)
to authenticated;

commit;
