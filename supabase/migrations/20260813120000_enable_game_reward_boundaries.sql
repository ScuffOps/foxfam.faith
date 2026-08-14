-- Open the reviewed game reward boundaries to authenticated portal users.

begin;

do $$
declare
  enabled_game_count integer;
begin
  update public.game_reward_games
  set enabled = true,
      updated_at = pg_catalog.clock_timestamp()
  where game_key in (
    'match-merge',
    'boba-cafe',
    'puzzle-cat',
    'time-runner',
    'word-garden'
  );

  get diagnostics enabled_game_count = row_count;
  if enabled_game_count <> 5 then
    raise exception using
      errcode = '55000',
      message = 'Expected all five shared game reward configurations before enabling RPC access';
  end if;
end
$$;

revoke all on function public.start_starfishing_cast()
from public, anon, authenticated;
revoke all on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text)
from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.start_starfishing_cast()
to authenticated;
grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
to authenticated;
grant execute on function public.start_game_reward_session(text)
to authenticated;
grant execute on function public.progress_game_reward_session(uuid, uuid, jsonb)
to authenticated;
grant execute on function public.claim_game_reward(uuid, uuid, jsonb)
to authenticated;

commit;
