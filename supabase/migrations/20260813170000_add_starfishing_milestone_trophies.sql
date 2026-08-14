-- Complete the Starfishing milestone trophy set advertised by the game hub.

begin;

do $$
begin
  if pg_catalog.to_regclass('public.achievement_catalog') is null
    or pg_catalog.to_regclass('public.user_achievements') is null
    or pg_catalog.to_regclass('public.user_trophies') is null then
    raise exception using errcode = '55000', message = 'Starfishing achievement tables must exist first';
  end if;
end
$$;

update public.achievement_catalog as achievement
set reward = achievement.reward || pg_catalog.jsonb_build_object('trophy_key', trophy.trophy_key)
from (values
  ('first-light', 'first-light'),
  ('pocket-constellation', 'pocket-constellation')
) as trophy(achievement_key, trophy_key)
where achievement.achievement_key = trophy.achievement_key;

insert into public.user_trophies (
  user_id,
  trophy_key,
  source_achievement_key,
  data,
  acquired_at
)
select
  unlocked.user_id,
  achievement.reward ->> 'trophy_key',
  achievement.achievement_key,
  pg_catalog.jsonb_build_object(
    'title', achievement.title,
    'label', achievement.title,
    'source', pg_catalog.jsonb_build_object(
      'type', 'achievement',
      'key', achievement.achievement_key
    )
  ),
  unlocked.unlocked_at
from public.user_achievements as unlocked
join public.achievement_catalog as achievement
  on achievement.achievement_key = unlocked.achievement_key
where achievement.achievement_key in ('first-light', 'pocket-constellation')
  and nullif(achievement.reward ->> 'trophy_key', '') is not null
on conflict (user_id, trophy_key) do nothing;

commit;
