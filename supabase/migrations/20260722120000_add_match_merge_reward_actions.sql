begin;

alter table public.game_reward_sessions
  alter column puzzle_date drop not null;

alter table public.game_reward_games
  add column daily_claim_cap integer not null default 1
  check (daily_claim_cap between 1 and 20);

alter table public.game_reward_cap_buckets
  add column reward_claims integer not null default 0
  check (reward_claims >= 0);

alter table public.game_reward_sessions
  add constraint game_reward_sessions_identity_unique
  unique (id, user_id, game_key);

create table public.game_reward_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_reward_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null references public.game_reward_games(game_key),
  action_index integer not null check (action_index > 0),
  idempotency_key uuid not null,
  action jsonb not null check (pg_catalog.jsonb_typeof(action) = 'object'),
  result_snapshot jsonb not null check (pg_catalog.jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (session_id, action_index),
  unique (user_id, idempotency_key)
);

alter table public.game_reward_actions
  add constraint game_reward_actions_session_identity_fk
  foreign key (session_id, user_id, game_key)
  references public.game_reward_sessions (id, user_id, game_key)
  on delete cascade;

create index game_reward_actions_owner_created_idx
on public.game_reward_actions (user_id, created_at desc);

alter table public.game_reward_actions enable row level security;
alter table public.game_reward_actions force row level security;

revoke all on table public.game_reward_actions from public, anon, authenticated;
revoke insert, update, delete on table public.game_reward_actions from anon, authenticated;
grant select on table public.game_reward_actions to authenticated;

create policy game_reward_actions_owner_read
on public.game_reward_actions
for select to authenticated
using ((select auth.uid()) = user_id);

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap,
  daily_claim_cap
)
values ('match-merge', 1, false, 1800, 90, 3)
on conflict (game_key) do update
set rules_version = excluded.rules_version,
    session_ttl_seconds = excluded.session_ttl_seconds,
    daily_favor_cap = excluded.daily_favor_cap,
    daily_claim_cap = excluded.daily_claim_cap,
    enabled = false,
    updated_at = pg_catalog.clock_timestamp();

update public.game_reward_games
set daily_claim_cap = 1
where game_key = 'word-garden';

insert into public.achievement_catalog (
  achievement_key,
  title,
  description,
  condition,
  reward,
  active
)
values
  (
    'first-merge',
    'First Refinement',
    'Complete a server-validated Reliquary Bench merge.',
    '{"game_key":"match-merge","minimum_merges":1}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'quiet-chain',
    'Quiet Chain',
    'Complete four server-timed merges within the chain window.',
    '{"game_key":"match-merge","minimum_chain":4}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'sigil-shaper',
    'Sigil Shaper',
    'Refine an offering to tier four at the Reliquary Bench.',
    '{"game_key":"match-merge","minimum_tier":4}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = excluded.active;

do $$
begin
  if pg_catalog.to_regprocedure('private.start_word_garden_reward_session_internal(text)') is null then
    alter function public.start_game_reward_session(text)
      rename to start_word_garden_reward_session_internal;
    alter function public.start_word_garden_reward_session_internal(text)
      set schema private;
  end if;

  if pg_catalog.to_regprocedure('private.claim_word_garden_reward_internal(uuid,uuid,jsonb)') is null then
    alter function public.claim_game_reward(uuid, uuid, jsonb)
      rename to claim_word_garden_reward_internal;
    alter function public.claim_word_garden_reward_internal(uuid, uuid, jsonb)
      set schema private;
  end if;
end;
$$;

revoke all on function private.start_word_garden_reward_session_internal(text) from public, anon, authenticated;
revoke all on function private.claim_word_garden_reward_internal(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function private.match_merge_initial_state()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'grid', '[1,1,1,1,2,2,1,2,0,0,0,0,0,0,0,0]'::jsonb,
    'score', 0,
    'moves', 0,
    'highest_tier', 2,
    'merge_streak', 0,
    'best_chain', 0,
    'last_merge_at', null,
    'action_index', 0
  );
$$;

create or replace function private.match_merge_is_neighbor(
  first_index integer,
  second_index integer
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select first_index between 0 and 15
    and second_index between 0 and 15
    and (
      (first_index / 4 = second_index / 4 and pg_catalog.abs(first_index - second_index) = 1)
      or pg_catalog.abs(first_index - second_index) = 4
    );
$$;

create or replace function private.game_reward_stable_roll(
  seed_value uuid,
  scope_value text,
  modulus_value integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.mod(
    (('x' || pg_catalog.substr(pg_catalog.md5(seed_value::text || ':' || scope_value), 1, 15))::bit(60)::bigint),
    modulus_value::bigint
  )::integer;
$$;

create or replace function private.reserve_game_reward_claim(
  caller_id uuid,
  game_config public.game_reward_games,
  claim_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims_used integer;
  claim_bucket_date date := (claim_created_at at time zone 'UTC')::date;
begin
  insert into public.game_reward_cap_buckets (
    user_id,
    game_key,
    bucket_date,
    favor_earned,
    reward_claims,
    updated_at
  )
  values (caller_id, game_config.game_key, claim_bucket_date, 0, 0, claim_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select bucket.reward_claims
  into claims_used
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = game_config.game_key
    and bucket.bucket_date = claim_bucket_date
  for update;

  if claims_used >= game_config.daily_claim_cap then
    raise exception using errcode = '55000', message = 'Daily rewarded run limit reached';
  end if;

  update public.game_reward_cap_buckets
  set reward_claims = reward_claims + 1,
      updated_at = claim_created_at
  where user_id = caller_id
    and game_key = game_config.game_key
    and game_reward_cap_buckets.bucket_date = claim_bucket_date;
end;
$$;

create or replace function private.start_match_merge_reward_session(
  caller_id uuid,
  game_config public.game_reward_games,
  session_started_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_reward_sessions%rowtype;
  initial_state jsonb := private.match_merge_initial_state();
begin
  select session.*
  into session_row
  from public.game_reward_sessions as session
  where session.user_id = caller_id
    and session.game_key = game_config.game_key
    and session.rules_version = game_config.rules_version
    and session.claimed_event_id is null
    and session.expires_at > session_started_at
  order by session.started_at desc
  limit 1
  for update;

  if session_row.id is not null then
    return pg_catalog.jsonb_build_object(
      'session_id', session_row.id,
      'game_key', session_row.game_key,
      'rules_version', session_row.rules_version,
      'seed', session_row.seed,
      'context', session_row.canonical_context,
      'started_at', session_row.started_at,
      'expires_at', session_row.expires_at
    );
  end if;

  insert into public.game_reward_sessions (
    user_id,
    game_key,
    rules_version,
    puzzle_date,
    canonical_context,
    started_at,
    expires_at
  )
  values (
    caller_id,
    game_config.game_key,
    game_config.rules_version,
    null,
    initial_state,
    session_started_at,
    session_started_at + pg_catalog.make_interval(secs => game_config.session_ttl_seconds)
  )
  returning * into session_row;

  return pg_catalog.jsonb_build_object(
    'session_id', session_row.id,
    'game_key', session_row.game_key,
    'rules_version', session_row.rules_version,
    'seed', session_row.seed,
    'context', initial_state,
    'started_at', session_row.started_at,
    'expires_at', session_row.expires_at
  );
end;
$$;

create or replace function public.start_game_reward_session(
  requested_game_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  game_config public.game_reward_games%rowtype;
  session_started_at timestamptz := pg_catalog.clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if requested_game_key is null or requested_game_key !~ '^[a-z0-9-]+$' then
    raise exception using errcode = '22023', message = 'Invalid game key';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':game-start:' || requested_game_key, 0)
  );

  if requested_game_key = 'word-garden' then
    return private.start_word_garden_reward_session_internal(requested_game_key);
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = requested_game_key;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are not enabled for this game';
  end if;

  if requested_game_key = 'match-merge' then
    return private.start_match_merge_reward_session(caller_id, game_config, session_started_at);
  end if;

  raise exception using errcode = '55000', message = 'No reward session is enabled for this game';
end;
$$;

create or replace function public.progress_game_reward_session(
  progress_session_id uuid,
  progress_idempotency_key uuid,
  progress_action jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_action public.game_reward_actions%rowtype;
  reward_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  action_created_at timestamptz;
  action_key_count integer;
  from_index integer;
  to_index integer;
  action_index integer;
  grid integer[];
  empty_indexes integer[];
  first_tier integer;
  second_tier integer;
  next_tier integer;
  spawn_index integer;
  spawn_tier integer;
  score_delta integer;
  score_total integer;
  moves_total integer;
  highest_tier integer;
  merge_streak integer;
  best_chain integer;
  last_merge_at timestamptz;
  next_context jsonb;
  result_snapshot jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if progress_session_id is null
    or progress_idempotency_key is null
    or progress_action is null
    or pg_catalog.jsonb_typeof(progress_action) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid game reward action';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':game-action:' || progress_idempotency_key::text, 0)
  );

  select action.*
  into existing_action
  from public.game_reward_actions as action
  where action.user_id = caller_id
    and action.idempotency_key = progress_idempotency_key;

  if existing_action.id is not null then
    if existing_action.session_id <> progress_session_id
      or existing_action.action <> progress_action then
      raise exception using errcode = '23505', message = 'Action idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_action.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select session.*
  into reward_session
  from public.game_reward_sessions as session
  where session.id = progress_session_id
    and session.user_id = caller_id
  for update;

  if reward_session.id is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  action_created_at := pg_catalog.clock_timestamp();
  if reward_session.claimed_event_id is not null then
    raise exception using errcode = '55000', message = 'Reward session has already been claimed';
  end if;
  if reward_session.expires_at <= action_created_at then
    raise exception using errcode = '55000', message = 'Reward session has expired';
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = reward_session.game_key
    and game.rules_version = reward_session.rules_version;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;
  if reward_session.game_key <> 'match-merge' then
    raise exception using errcode = '55000', message = 'No action validator is enabled for this game';
  end if;

  select pg_catalog.count(*)::integer
  into action_key_count
  from pg_catalog.jsonb_object_keys(progress_action);

  if action_key_count <> 3
    or progress_action ->> 'op' <> 'merge'
    or not progress_action ? 'from'
    or not progress_action ? 'to'
    or pg_catalog.jsonb_typeof(progress_action -> 'from') <> 'number'
    or pg_catalog.jsonb_typeof(progress_action -> 'to') <> 'number'
    or pg_catalog.trunc((progress_action ->> 'from')::numeric) <> (progress_action ->> 'from')::numeric
    or pg_catalog.trunc((progress_action ->> 'to')::numeric) <> (progress_action ->> 'to')::numeric
    or (progress_action ->> 'from')::numeric not between 0 and 15
    or (progress_action ->> 'to')::numeric not between 0 and 15 then
    raise exception using errcode = '22023', message = 'Match and Merge accepts merge, from, and to only';
  end if;

  from_index := (progress_action ->> 'from')::integer;
  to_index := (progress_action ->> 'to')::integer;
  if not private.match_merge_is_neighbor(from_index, to_index) then
    raise exception using errcode = '22023', message = 'Merge cells must be neighboring board cells';
  end if;

  if pg_catalog.jsonb_typeof(reward_session.canonical_context -> 'grid') <> 'array'
    or pg_catalog.jsonb_array_length(reward_session.canonical_context -> 'grid') <> 16 then
    raise exception using errcode = '55000', message = 'Canonical Match and Merge grid is invalid';
  end if;

  select pg_catalog.array_agg(value::integer order by ordinal)
  into grid
  from pg_catalog.jsonb_array_elements_text(reward_session.canonical_context -> 'grid')
    with ordinality as cell(value, ordinal);

  if grid is null
    or pg_catalog.cardinality(grid) <> 16
    or not (grid <@ array[0, 1, 2, 3, 4, 5]) then
    raise exception using errcode = '55000', message = 'Canonical Match and Merge grid is invalid';
  end if;

  first_tier := grid[from_index + 1];
  second_tier := grid[to_index + 1];
  if first_tier <= 0 or first_tier <> second_tier or first_tier >= 5 then
    raise exception using errcode = '22023', message = 'Canonical cells cannot be merged';
  end if;

  next_tier := first_tier + 1;
  grid[from_index + 1] := 0;
  grid[to_index + 1] := next_tier;
  action_index := (reward_session.canonical_context ->> 'action_index')::integer + 1;

  select pg_catalog.array_agg(index_value order by index_value)
  into empty_indexes
  from pg_catalog.generate_series(0, 15) as index_value
  where grid[index_value + 1] = 0;

  if pg_catalog.cardinality(empty_indexes) > 0 then
    spawn_index := empty_indexes[
      1 + private.game_reward_stable_roll(
        reward_session.seed,
        'slot:' || action_index::text,
        pg_catalog.cardinality(empty_indexes)
      )
    ];
    spawn_tier := case
      when private.game_reward_stable_roll(reward_session.seed, 'tier:' || action_index::text, 100) >= 82 then 2
      else 1
    end;
    grid[spawn_index + 1] := spawn_tier;
  end if;

  score_delta := case next_tier
    when 2 then 55
    when 3 then 130
    when 4 then 280
    when 5 then 640
    else 0
  end;
  score_total := (reward_session.canonical_context ->> 'score')::integer + score_delta;
  moves_total := (reward_session.canonical_context ->> 'moves')::integer + 1;
  highest_tier := greatest(
    (reward_session.canonical_context ->> 'highest_tier')::integer,
    next_tier
  );
  last_merge_at := nullif(reward_session.canonical_context ->> 'last_merge_at', '')::timestamptz;
  merge_streak := case
    when last_merge_at is not null and action_created_at - last_merge_at <= interval '6 seconds'
      then (reward_session.canonical_context ->> 'merge_streak')::integer + 1
    else 1
  end;
  best_chain := greatest(
    (reward_session.canonical_context ->> 'best_chain')::integer,
    merge_streak
  );

  next_context := pg_catalog.jsonb_build_object(
    'grid', pg_catalog.to_jsonb(grid),
    'score', score_total,
    'moves', moves_total,
    'highest_tier', highest_tier,
    'merge_streak', merge_streak,
    'best_chain', best_chain,
    'last_merge_at', action_created_at,
    'action_index', action_index
  );

  update public.game_reward_sessions
  set canonical_context = next_context
  where id = reward_session.id;

  result_snapshot := pg_catalog.jsonb_build_object(
    'session_id', reward_session.id,
    'game_key', reward_session.game_key,
    'action_index', action_index,
    'state', next_context,
    'replayed', false
  );

  insert into public.game_reward_actions (
    session_id,
    user_id,
    game_key,
    action_index,
    idempotency_key,
    action,
    result_snapshot,
    created_at
  )
  values (
    reward_session.id,
    caller_id,
    reward_session.game_key,
    action_index,
    progress_idempotency_key,
    progress_action,
    result_snapshot,
    action_created_at
  );

  return result_snapshot;
end;
$$;

create or replace function private.claim_match_merge_reward(
  caller_id uuid,
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
  existing_event public.game_reward_events%rowtype;
  claim_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  claim_created_at timestamptz := pg_catalog.clock_timestamp();
  reward_event_id uuid := gen_random_uuid();
  score_total integer;
  moves_total integer;
  highest_tier integer;
  best_chain integer;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  cap_earned integer;
  cap_remaining integer;
  favor_result jsonb;
  material_results jsonb := '[]'::jsonb;
  material_result jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
begin
  if claim_evidence <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Match and Merge claims accept no client-authored result fields';
  end if;

  select event.*
  into existing_event
  from public.game_reward_events as event
  where event.user_id = caller_id
    and event.idempotency_key = claim_idempotency_key;

  if existing_event.id is not null then
    if existing_event.session_id <> claim_session_id
      or existing_event.evidence_hash <> pg_catalog.md5(claim_evidence::text) then
      raise exception using errcode = '23505', message = 'Reward idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_event.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select session.*
  into claim_session
  from public.game_reward_sessions as session
  where session.id = claim_session_id
    and session.user_id = caller_id
  for update;

  if claim_session.id is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  if claim_session.claimed_event_id is not null then
    raise exception using errcode = '55000', message = 'Reward session has already been claimed';
  end if;
  if claim_session.expires_at <= claim_created_at then
    raise exception using errcode = '55000', message = 'Reward session has expired';
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = claim_session.game_key
    and game.rules_version = claim_session.rules_version;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;

  score_total := (claim_session.canonical_context ->> 'score')::integer;
  moves_total := (claim_session.canonical_context ->> 'moves')::integer;
  highest_tier := (claim_session.canonical_context ->> 'highest_tier')::integer;
  best_chain := (claim_session.canonical_context ->> 'best_chain')::integer;
  if moves_total < 1 or score_total < 1 then
    raise exception using errcode = '55000', message = 'Complete at least one merge before claiming';
  end if;

  requested_favor := greatest(1, score_total / 120);

  insert into public.game_reward_cap_buckets (user_id, game_key, bucket_date, favor_earned, updated_at)
  values (caller_id, claim_session.game_key, (claim_created_at at time zone 'UTC')::date, 0, claim_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select bucket.favor_earned
  into cap_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = claim_session.game_key
    and bucket.bucket_date = (claim_created_at at time zone 'UTC')::date
  for update;

  favor_awarded := least(
    requested_favor,
    greatest(0, game_config.daily_favor_cap - cap_earned)
  );
  cap_remaining := greatest(0, game_config.daily_favor_cap - cap_earned - favor_awarded);

  if favor_awarded > 0 then
    favor_result := private.post_favor_entry(
      caller_id,
      favor_awarded,
      'game_reward',
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'favor'),
      pg_catalog.jsonb_build_object(
        'game_key', claim_session.game_key,
        'session_id', claim_session.id,
        'rules_version', claim_session.rules_version
      )
    );
    favor_balance := (favor_result -> 'favor' ->> 'balance')::bigint;

    update public.game_reward_cap_buckets
    set favor_earned = favor_earned + favor_awarded,
        updated_at = claim_created_at
    where user_id = caller_id
      and game_key = claim_session.game_key
      and bucket_date = (claim_created_at at time zone 'UTC')::date;
  else
    favor_balance := private.ensure_favor_account(caller_id);
  end if;

  material_result := private.post_game_reward_material(
    caller_id,
    'moonwax',
    least(40, greatest(1, score_total / 60)),
    reward_event_id,
    private.game_reward_scoped_uuid(claim_idempotency_key, 'material:moonwax'),
    pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
  );
  material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');

  if highest_tier >= 3 then
    material_result := private.post_game_reward_material(
      caller_id,
      'charm-cord',
      least(20, greatest(1, score_total / 180)),
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:charm-cord'),
      pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');
  end if;

  if highest_tier >= 4 then
    material_result := private.post_game_reward_material(
      caller_id,
      'sigil-shards',
      least(10, greatest(1, score_total / 320)),
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:sigil-shards'),
      pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');
  end if;

  with inserted_achievements as (
    insert into public.user_achievements (
      user_id,
      achievement_key,
      source_reward_event_id,
      unlocked_at
    )
    select caller_id, achievement.achievement_key, reward_event_id, claim_created_at
    from public.achievement_catalog as achievement
    where achievement.active
      and (
        achievement.achievement_key = 'first-merge'
        or (achievement.achievement_key = 'quiet-chain' and best_chain >= 4)
        or (achievement.achievement_key = 'sigil-shaper' and highest_tier >= 4)
      )
    on conflict (user_id, achievement_key) do nothing
    returning achievement_key
  )
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('key', catalog.achievement_key, 'title', catalog.title)
      order by catalog.achievement_key
    ),
    '[]'::jsonb
  )
  into achievement_results
  from inserted_achievements as inserted
  join public.achievement_catalog as catalog
    on catalog.achievement_key = inserted.achievement_key;

  claim_result_snapshot := pg_catalog.jsonb_build_object(
    'reward_event_id', reward_event_id,
    'session_id', claim_session.id,
    'game_key', claim_session.game_key,
    'score', score_total,
    'favor', pg_catalog.jsonb_build_object(
      'delta', favor_awarded,
      'balance', favor_balance,
      'cap_remaining', cap_remaining
    ),
    'materials', material_results,
    'achievements', achievement_results,
    'replayed', false
  );

  insert into public.game_reward_events (
    id,
    session_id,
    user_id,
    game_key,
    rules_version,
    idempotency_key,
    evidence_hash,
    score,
    favor_awarded,
    result_snapshot,
    created_at
  )
  values (
    reward_event_id,
    claim_session.id,
    caller_id,
    claim_session.game_key,
    claim_session.rules_version,
    claim_idempotency_key,
    pg_catalog.md5(claim_evidence::text),
    score_total,
    favor_awarded,
    claim_result_snapshot,
    claim_created_at
  );

  update public.game_reward_sessions
  set claimed_event_id = reward_event_id
  where id = claim_session.id;

  return claim_result_snapshot;
end;
$$;

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
  existing_event public.game_reward_events%rowtype;
  game_config public.game_reward_games%rowtype;
  session_game_key text;
  claim_created_at timestamptz;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if claim_session_id is null
    or claim_idempotency_key is null
    or claim_evidence is null
    or pg_catalog.jsonb_typeof(claim_evidence) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid game reward claim';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text || ':game-claim:' || claim_idempotency_key::text, 0)
  );

  select event.*
  into existing_event
  from public.game_reward_events as event
  where event.user_id = caller_id
    and event.idempotency_key = claim_idempotency_key;

  if existing_event.id is not null then
    if existing_event.session_id <> claim_session_id
      or existing_event.evidence_hash <> pg_catalog.md5(claim_evidence::text) then
      raise exception using errcode = '23505', message = 'Reward idempotency key is already used';
    end if;
    return pg_catalog.jsonb_set(existing_event.result_snapshot, '{replayed}', 'true'::jsonb, true);
  end if;

  select game.*
  into game_config
  from public.game_reward_sessions as session
  join public.game_reward_games as game
    on game.game_key = session.game_key
   and game.rules_version = session.rules_version
  where session.id = claim_session_id
    and session.user_id = caller_id;

  session_game_key := game_config.game_key;

  if session_game_key is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;

  if not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are disabled';
  end if;

  claim_created_at := pg_catalog.clock_timestamp();
  perform private.reserve_game_reward_claim(caller_id, game_config, claim_created_at);

  if session_game_key = 'word-garden' then
    return private.claim_word_garden_reward_internal(
      claim_session_id,
      claim_idempotency_key,
      claim_evidence
    );
  end if;

  if session_game_key = 'match-merge' then
    return private.claim_match_merge_reward(
      caller_id,
      claim_session_id,
      claim_idempotency_key,
      claim_evidence
    );
  end if;

  raise exception using errcode = '55000', message = 'No reward validator is enabled for this game';
end;
$$;

revoke all on function private.match_merge_initial_state() from public, anon, authenticated;
revoke all on function private.match_merge_is_neighbor(integer, integer) from public, anon, authenticated;
revoke all on function private.game_reward_stable_roll(uuid, text, integer) from public, anon, authenticated;
revoke all on function private.reserve_game_reward_claim(uuid, public.game_reward_games, timestamptz) from public, anon, authenticated;
revoke all on function private.start_match_merge_reward_session(uuid, public.game_reward_games, timestamptz) from public, anon, authenticated;
revoke all on function private.claim_match_merge_reward(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
