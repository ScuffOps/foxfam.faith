-- Server-authoritative Relic Forge achievements from durable completed receipts.

begin;

do $$
begin
  if pg_catalog.to_regclass('private.relic_charm_progression_receipts') is null
    or pg_catalog.to_regclass('public.achievement_catalog') is null
    or pg_catalog.to_regclass('public.user_achievements') is null then
    raise exception using
      errcode = '55000',
      message = 'Relic Forge progression and achievement tables must exist first';
  end if;
end
$$;

insert into public.achievement_catalog (
  achievement_key,
  title,
  description,
  condition,
  reward
)
values
  (
    'quarters-first-temper',
    'First Temper',
    'Complete your first charm upgrade at the Priory Relic Forge.',
    '{"type":"forge_completed_operation","game_key":"relic-forge","operation":"upgrade","count":1}'::jsonb,
    '{"kind":"charm","charm_key":"hearthforged-seal","label":"Hearthforged Seal","description":"The first mark struck cleanly at the Priory Relic Forge.","rarity":"uncommon","slot":"sigil","effects":{"profile_particle":"forge-sparks","game_material_multiplier_bps":1000},"trophy_key":"first-temper"}'::jsonb
  ),
  (
    'quarters-first-transmutation',
    'Kindly Transmuted',
    'Convert your first duplicate charm into Favor and Forge materials.',
    '{"type":"forge_completed_operation","game_key":"relic-forge","operation":"convert","count":1}'::jsonb,
    '{"trophy_key":"kindly-transmuted"}'::jsonb
  ),
  (
    'quarters-ascendant-charm',
    'Ascendant Hand',
    'Raise a charm to three stars at the Priory Relic Forge.',
    '{"type":"forge_charm_star","game_key":"relic-forge","star":3}'::jsonb,
    '{"kind":"charm","charm_key":"ascendant-anvil","label":"Ascendant Anvil","description":"A masterwork emblem earned by raising a charm to its Ascendant tier.","rarity":"mythic","slot":"profile-frame","effects":{"profile_frame":"ascendant-forge","game_favor_multiplier_bps":1000},"trophy_key":"ascendant-hand"}'::jsonb
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = true;

create or replace function private.unlock_relic_forge_receipt_achievements(
  target_user_id uuid,
  target_operation text,
  target_result_snapshot jsonb,
  target_completed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null
    or target_operation not in ('upgrade', 'convert')
    or pg_catalog.jsonb_typeof(target_result_snapshot) <> 'object' then
    return;
  end if;

  insert into public.user_achievements (user_id, achievement_key, unlocked_at)
  select
    target_user_id,
    achievement.achievement_key,
    coalesce(target_completed_at, pg_catalog.clock_timestamp())
  from public.achievement_catalog as achievement
  where achievement.active
    and achievement.achievement_key = case target_operation
      when 'upgrade' then 'quarters-first-temper'
      when 'convert' then 'quarters-first-transmutation'
    end
  on conflict (user_id, achievement_key) do nothing;

  if target_operation = 'upgrade'
    and target_result_snapshot #>> '{charm,star}' = '3' then
    insert into public.user_achievements (user_id, achievement_key, unlocked_at)
    select
      target_user_id,
      achievement.achievement_key,
      coalesce(target_completed_at, pg_catalog.clock_timestamp())
    from public.achievement_catalog as achievement
    where achievement.active
      and achievement.achievement_key = 'quarters-ascendant-charm'
    on conflict (user_id, achievement_key) do nothing;
  end if;
end;
$$;

create or replace function private.unlock_relic_forge_receipt_achievements_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.unlock_relic_forge_receipt_achievements(
    new.user_id,
    new.operation,
    new.result_snapshot,
    new.completed_at
  );
  return new;
end;
$$;

drop trigger if exists relic_forge_receipt_unlock_achievements
on private.relic_charm_progression_receipts;
create trigger relic_forge_receipt_unlock_achievements
after update of status, result_snapshot
on private.relic_charm_progression_receipts
for each row
when (new.status = 'completed' and old.status is distinct from new.status)
execute function private.unlock_relic_forge_receipt_achievements_trigger();

do $$
declare
  receipt private.relic_charm_progression_receipts%rowtype;
begin
  for receipt in
    select completed.*
    from private.relic_charm_progression_receipts as completed
    where completed.status = 'completed'
      and completed.result_snapshot is not null
    order by completed.completed_at, completed.id
  loop
    perform private.unlock_relic_forge_receipt_achievements(
      receipt.user_id,
      receipt.operation,
      receipt.result_snapshot,
      receipt.completed_at
    );
  end loop;
end
$$;

revoke all on function private.unlock_relic_forge_receipt_achievements(uuid, text, jsonb, timestamptz)
from public, anon, authenticated;
revoke all on function private.unlock_relic_forge_receipt_achievements_trigger()
from public, anon, authenticated;

commit;
