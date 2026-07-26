\set ON_ERROR_STOP on

begin;

do $$
declare
  sentinel private.game_rewards_disposable_smoke_sentinel%rowtype;
begin
  select target.*
  into sentinel
  from private.game_rewards_disposable_smoke_sentinel as target
  where target.singleton
    and target.disposable
    and target.project_ref <> 'wdypokgdqgvqpyabvshq'
    and target.expires_at > pg_catalog.clock_timestamp()
  for update;

  if sentinel.project_ref is null then
    raise exception using errcode = '55000', message = 'Disposable game reward sentinel missing or expired';
  end if;
end;
$$;

update public.game_reward_games
set enabled = (game_key in ('word-garden', 'match-merge', 'boba-cafe', 'puzzle-cat', 'time-runner')),
    updated_at = pg_catalog.clock_timestamp();

revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.start_game_reward_session(text) to authenticated;
grant execute on function public.progress_game_reward_session(uuid, uuid, jsonb) to authenticated;
grant execute on function public.claim_game_reward(uuid, uuid, jsonb) to authenticated;

commit;
