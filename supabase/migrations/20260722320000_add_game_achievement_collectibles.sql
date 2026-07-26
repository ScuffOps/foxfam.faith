-- Shared achievement collectible fulfillment for every staged game.

begin;

do $$
begin
  if pg_catalog.to_regclass('public.achievement_catalog') is null
    or pg_catalog.to_regclass('public.user_achievements') is null
    or pg_catalog.to_regclass('public.user_relic_charms') is null
    or pg_catalog.to_regclass('public.user_trophies') is null then
    raise exception using errcode = '55000', message = 'Achievement progression tables must exist first';
  end if;
end
$$;

update public.achievement_catalog as achievement
set reward = rewards.reward
from (values
  ('first-merge', '{"kind":"charm","charm_key":"refinement-seal","label":"Refinement Seal","description":"A tidy seal earned from the first successful Reliquary refinement.","rarity":"uncommon","slot":"sigil","effects":{"profile_particle":"refinement-spark"},"trophy_key":"first-refinement"}'::jsonb),
  ('quiet-chain', '{"trophy_key":"quiet-chain"}'::jsonb),
  ('sigil-shaper', '{"kind":"charm","charm_key":"shapers-knot","label":"Shaper''s Knot","description":"A precise knot awarded to keepers who refine a tier-four sigil.","rarity":"epic","slot":"chain","effects":{"profile_particle":"shaper-sigil"},"trophy_key":"sigil-shaper"}'::jsonb),
  ('boba-cafe-first-service', '{"kind":"charm","charm_key":"first-service-ribbon","label":"First Service Ribbon","description":"A café ribbon folded after a warm first shift.","rarity":"uncommon","slot":"ribbon","effects":{"profile_particle":"tea-steam"},"trophy_key":"first-service"}'::jsonb),
  ('boba-cafe-perfect-pour', '{"trophy_key":"perfect-pour"}'::jsonb),
  ('boba-cafe-rush-hour-combo', '{"trophy_key":"rush-hour-ribbon"}'::jsonb),
  ('boba-cafe-spotless-shift', '{"kind":"charm","charm_key":"spotless-tea-bell","label":"Spotless Tea Bell","description":"A bright café bell that remembers a flawless shift.","rarity":"epic","slot":"bell","effects":{"profile_particle":"boba-bubbles"},"trophy_key":"spotless-shift"}'::jsonb),
  ('find-vezmir-found', '{"kind":"charm","charm_key":"vezmir-trail-pin","label":"Vezmir Trail Pin","description":"A tiny trail marker carried by those who found Vezmir.","rarity":"uncommon","slot":"pin","effects":{"profile_particle":"paw-trail"},"trophy_key":"vezmir-found"}'::jsonb),
  ('find-vezmir-quiet-detective', '{"trophy_key":"quiet-detective"}'::jsonb),
  ('find-vezmir-lantern-eyed', '{"kind":"charm","charm_key":"lantern-eyed-lens","label":"Lantern-Eyed Lens","description":"A watchful lens earned by finding every hidden clue.","rarity":"epic","slot":"core","effects":{"profile_frame":"lantern-eyed"},"trophy_key":"lantern-eyed"}'::jsonb),
  ('clocktower-clear', '{"kind":"charm","charm_key":"clockface-shard","label":"Clockface Shard","description":"A recovered fragment that still remembers the right hour.","rarity":"uncommon","slot":"chain","effects":{"profile_particle":"clock-sparks"},"trophy_key":"clocktower-clear"}'::jsonb),
  ('shard-sprinter', '{"trophy_key":"shard-sprinter"}'::jsonb),
  ('unfractured-loop', '{"kind":"charm","charm_key":"unfractured-loop","label":"Unfractured Loop","description":"A perfect ring awarded for crossing the clocktower untouched.","rarity":"epic","slot":"halo","effects":{"profile_frame":"unfractured-loop"},"trophy_key":"unfractured-loop"}'::jsonb),
  ('word-garden-first-sprout', '{"kind":"charm","charm_key":"blooming-ink-sprout","label":"Blooming Ink Sprout","description":"A first word preserved as a small living sprout.","rarity":"uncommon","slot":"root","effects":{"profile_particle":"ink-petals"},"trophy_key":"first-sprout"}'::jsonb),
  ('word-garden-full-bloom', '{"kind":"charm","charm_key":"full-bloom-quill","label":"Full Bloom Quill","description":"A flowering quill earned by completing the entire word bloom.","rarity":"epic","slot":"profile-frame","effects":{"profile_frame":"full-bloom"},"trophy_key":"full-bloom"}'::jsonb)
) as rewards(achievement_key, reward)
where achievement.achievement_key = rewards.achievement_key;

create or replace function private.fulfill_achievement_collectibles_for(
  target_user_id uuid,
  target_achievement_key text,
  target_acquired_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  achievement public.achievement_catalog%rowtype;
begin
  select catalog.*
  into achievement
  from public.achievement_catalog as catalog
  where catalog.achievement_key = target_achievement_key
    and catalog.active;

  if achievement.achievement_key is null then
    return;
  end if;

  -- Starfishing already returns newly minted collectibles in its catch receipt.
  -- This shared path owns achievements from the other staged game gateways.
  if nullif(achievement.condition ->> 'game_key', '') is null then
    return;
  end if;

  if achievement.reward ->> 'kind' = 'charm'
    and nullif(achievement.reward ->> 'charm_key', '') is not null then
    insert into public.user_relic_charms (
      id, user_id, created_by, data, created_at, updated_at
    ) values (
      pg_catalog.gen_random_uuid(),
      target_user_id,
      'achievement',
      pg_catalog.jsonb_build_object(
        'charm_key', achievement.reward ->> 'charm_key',
        'name', achievement.reward ->> 'label',
        'label', achievement.reward ->> 'label',
        'description', coalesce(achievement.reward ->> 'description', achievement.description),
        'rarity', achievement.reward ->> 'rarity',
        'slot', achievement.reward ->> 'slot',
        'kind', 'achievement',
        'effects', coalesce(achievement.reward -> 'effects', '{}'::jsonb),
        'equipped', false,
        'acquired_at', target_acquired_at,
        'source', pg_catalog.jsonb_build_object('type', 'achievement', 'key', target_achievement_key)
      ),
      target_acquired_at,
      target_acquired_at
    )
    on conflict do nothing;
  end if;

  if nullif(achievement.reward ->> 'trophy_key', '') is not null then
    insert into public.user_trophies (
      user_id, trophy_key, source_achievement_key, data, acquired_at
    ) values (
      target_user_id,
      achievement.reward ->> 'trophy_key',
      target_achievement_key,
      pg_catalog.jsonb_build_object(
        'title', achievement.title,
        'label', achievement.title,
        'source', pg_catalog.jsonb_build_object('type', 'achievement', 'key', target_achievement_key)
      ),
      target_acquired_at
    )
    on conflict (user_id, trophy_key) do nothing;
  end if;
end;
$$;

create or replace function private.fulfill_achievement_collectibles_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.fulfill_achievement_collectibles_for(
    new.user_id,
    new.achievement_key,
    new.unlocked_at
  );
  return new;
end;
$$;

drop trigger if exists user_achievements_fulfill_collectibles on public.user_achievements;
create trigger user_achievements_fulfill_collectibles
after insert on public.user_achievements
for each row execute function private.fulfill_achievement_collectibles_trigger();

do $$
declare
  unlocked public.user_achievements%rowtype;
begin
  for unlocked in
    select achievement.*
    from public.user_achievements as achievement
    order by achievement.unlocked_at, achievement.id
  loop
    perform private.fulfill_achievement_collectibles_for(
      unlocked.user_id,
      unlocked.achievement_key,
      unlocked.unlocked_at
    );
  end loop;
end
$$;

revoke all on function private.fulfill_achievement_collectibles_for(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function private.fulfill_achievement_collectibles_trigger() from public, anon, authenticated;

commit;
