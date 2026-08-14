-- Keep privacy-safe public cosmetics aligned with the owner's equipped-charm priority.
-- Depends on: 20260722330000_add_public_game_progression_projection.sql
-- Depends on: 20260813130000_add_relic_forge_achievements.sql

begin;

create or replace function public.load_public_game_progression(
  profile_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  discovered_count integer := 0;
  catalog_count integer := 0;
  completion_percent integer := 0;
  total_catches bigint := 0;
  equipped_charms jsonb := '[]'::jsonb;
  trophies jsonb := '[]'::jsonb;
  profile_frame text;
  profile_particle text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if profile_user_id is null then
    raise exception using errcode = '22023', message = 'Profile user id is required';
  end if;

  select pg_catalog.count(*)::integer
  into catalog_count
  from public.game_fish_catalog as fish
  where fish.active;

  select
    pg_catalog.count(*)::integer,
    coalesce(pg_catalog.sum(fishpedia.caught_count), 0)::bigint
  into discovered_count, total_catches
  from public.user_fishpedia as fishpedia
  join public.game_fish_catalog as fish
    on fish.fish_key = fishpedia.fish_key
    and fish.active
  where fishpedia.user_id = profile_user_id;

  completion_percent := case
    when catalog_count = 0 then 0
    else least(
      100,
      pg_catalog.round(discovered_count::numeric * 100 / catalog_count)::integer
    )
  end;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', charm.id,
      'charm_key', left(charm.data ->> 'charm_key', 80),
      'label', left(coalesce(charm.data ->> 'label', charm.data ->> 'name', charm.data ->> 'charm_key'), 80),
      'rarity', case
        when charm.data ->> 'rarity' in ('common', 'uncommon', 'rare', 'epic', 'mythic')
          then charm.data ->> 'rarity'
        else 'common'
      end,
      'slot', left(charm.data ->> 'slot', 80),
      'star', case
        when charm.data ->> 'star' ~ '^[0-3]$' then (charm.data ->> 'star')::integer
        else 0
      end,
      'tier', case charm.data ->> 'star'
        when '1' then 'awakened'
        when '2' then 'exalted'
        when '3' then 'ascendant'
        else 'dormant'
      end,
      'source', pg_catalog.jsonb_build_object(
        'type', case
          when charm.data #>> '{source,type}' = 'achievement' then 'achievement'
          when charm.data ->> 'source' = 'relic_roll' then 'relic_roll'
          else 'legacy'
        end,
        'key', case
          when charm.data #>> '{source,type}' = 'achievement'
            and charm.data #>> '{source,key}' ~ '^[a-z0-9-]{1,80}$'
            then charm.data #>> '{source,key}'
          else null
        end
      )
    )
    order by charm.created_at, charm.id
  ), '[]'::jsonb)
  into equipped_charms
  from public.user_relic_charms as charm
  where charm.user_id = profile_user_id
    and charm.data ->> 'equipped' = 'true'
    and charm.data ->> 'charm_key' ~ '^[a-z0-9-]{1,80}$'
    and charm.data ->> 'slot' ~ '^[a-z0-9-]{1,80}$';

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'trophy_key', trophy.trophy_key,
      'title', left(coalesce(achievement.title, trophy.data ->> 'label', trophy.trophy_key), 80),
      'source_achievement_key', trophy.source_achievement_key,
      'acquired_at', trophy.acquired_at
    )
    order by trophy.acquired_at desc, trophy.trophy_key
  ), '[]'::jsonb)
  into trophies
  from public.user_trophies as trophy
  left join public.achievement_catalog as achievement
    on achievement.achievement_key = trophy.source_achievement_key
  where trophy.user_id = profile_user_id
    and trophy.trophy_key ~ '^[a-z0-9-]{1,80}$';

  select candidate.profile_frame
  into profile_frame
  from (
    select achievement.reward #>> '{effects,profile_frame}' as profile_frame
    from public.user_relic_charms as charm
    join public.user_achievements as unlocked
      on unlocked.user_id = charm.user_id
      and unlocked.achievement_key = charm.data #>> '{source,key}'
    join public.achievement_catalog as achievement
      on achievement.achievement_key = unlocked.achievement_key
      and achievement.active
    where charm.user_id = profile_user_id
      and charm.data ->> 'equipped' = 'true'
      and charm.data #>> '{source,type}' = 'achievement'
      and charm.data ->> 'charm_key' = achievement.reward ->> 'charm_key'
      and achievement.reward #>> '{effects,profile_frame}' ~ '^[a-z0-9-]{1,80}$'
    order by
      case charm.data ->> 'rarity'
        when 'mythic' then 5
        when 'epic' then 4
        when 'rare' then 3
        when 'uncommon' then 2
        when 'common' then 1
        else 0
      end desc,
      case
        when charm.data ->> 'star' ~ '^[0-3]$' then (charm.data ->> 'star')::integer
        else 0
      end desc,
      charm.data ->> 'charm_key' asc,
      charm.id asc
    limit 1
  ) as candidate;

  select candidate.profile_particle
  into profile_particle
  from (
    select achievement.reward #>> '{effects,profile_particle}' as profile_particle
    from public.user_relic_charms as charm
    join public.user_achievements as unlocked
      on unlocked.user_id = charm.user_id
      and unlocked.achievement_key = charm.data #>> '{source,key}'
    join public.achievement_catalog as achievement
      on achievement.achievement_key = unlocked.achievement_key
      and achievement.active
    where charm.user_id = profile_user_id
      and charm.data ->> 'equipped' = 'true'
      and charm.data #>> '{source,type}' = 'achievement'
      and charm.data ->> 'charm_key' = achievement.reward ->> 'charm_key'
      and achievement.reward #>> '{effects,profile_particle}' ~ '^[a-z0-9-]{1,80}$'
    order by
      case charm.data ->> 'rarity'
        when 'mythic' then 5
        when 'epic' then 4
        when 'rare' then 3
        when 'uncommon' then 2
        when 'common' then 1
        else 0
      end desc,
      case
        when charm.data ->> 'star' ~ '^[0-3]$' then (charm.data ->> 'star')::integer
        else 0
      end desc,
      charm.data ->> 'charm_key' asc,
      charm.id asc
    limit 1
  ) as candidate;

  return pg_catalog.jsonb_build_object(
    'profile_user_id', profile_user_id,
    'fishpedia', pg_catalog.jsonb_build_object(
      'discovered_count', discovered_count,
      'catalog_count', catalog_count,
      'completion_percent', completion_percent,
      'total_catches', total_catches
    ),
    'equipped_charms', equipped_charms,
    'trophies', trophies,
    'cosmetics', pg_catalog.jsonb_build_object(
      'profile_frame', profile_frame,
      'profile_particle', profile_particle
    )
  );
end;
$$;

revoke all on function public.load_public_game_progression(uuid) from public, anon, authenticated;
grant execute on function public.load_public_game_progression(uuid) to authenticated;

commit;
