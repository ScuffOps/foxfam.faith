-- Enrich shared game claims with the catalog-backed collectibles fulfilled by each achievement.

begin;

do $$
begin
  if pg_catalog.to_regprocedure('private.claim_game_reward_collectible_receipt_internal(uuid,uuid,jsonb)') is null then
    alter function public.claim_game_reward(uuid, uuid, jsonb)
      rename to claim_game_reward_collectible_receipt_internal;
    alter function public.claim_game_reward_collectible_receipt_internal(uuid, uuid, jsonb)
      set schema private;
  end if;
end
$$;

revoke all on function private.claim_game_reward_collectible_receipt_internal(uuid, uuid, jsonb)
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
  claim_result jsonb;
  enriched_achievements jsonb;
begin
  claim_result := private.claim_game_reward_collectible_receipt_internal(
    claim_session_id,
    claim_idempotency_key,
    claim_evidence
  );

  select coalesce(
    pg_catalog.jsonb_agg(
      achievement.value || case
        when catalog.reward is not null and catalog.reward <> '{}'::jsonb
          then pg_catalog.jsonb_build_object('collectible', catalog.reward)
        else '{}'::jsonb
      end
      order by achievement.ordinal
    ),
    '[]'::jsonb
  )
  into enriched_achievements
  from pg_catalog.jsonb_array_elements(coalesce(claim_result -> 'achievements', '[]'::jsonb))
    with ordinality as achievement(value, ordinal)
  left join public.achievement_catalog as catalog
    on catalog.achievement_key = achievement.value ->> 'key'
    and catalog.active;

  return pg_catalog.jsonb_set(claim_result, '{achievements}', enriched_achievements, true);
end;
$$;

revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
