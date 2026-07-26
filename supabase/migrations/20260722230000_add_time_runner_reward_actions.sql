begin;

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap,
  daily_claim_cap
)
values ('time-runner', 1, false, 600, 60, 2)
on conflict (game_key) do update
set rules_version = excluded.rules_version,
    session_ttl_seconds = excluded.session_ttl_seconds,
    daily_favor_cap = excluded.daily_favor_cap,
    daily_claim_cap = excluded.daily_claim_cap,
    enabled = false,
    updated_at = pg_catalog.clock_timestamp();

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
    'clocktower-clear',
    'Clocktower Clear',
    'Complete a server-validated Clocktower Traverse.',
    '{"game_key":"time-runner","complete":true}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'shard-sprinter',
    'Shard Sprinter',
    'Gather at least six Clock Brass shards in one completed traverse.',
    '{"game_key":"time-runner","minimum_clock_shards":6}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'unfractured-loop',
    'Unfractured Loop',
    'Complete a traverse without a fall.',
    '{"game_key":"time-runner","complete":true,"maximum_falls":0}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = excluded.active;

create or replace function private.time_runner_layout(run_seed uuid)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', 'time-' || hazard_index::text,
      'at_ms', 1200 + hazard_index * 1700,
      'kind', case
        when hazard_roll < 34 then 'hand-sweep'
        when hazard_roll < 68 then 'roman-gate'
        else 'clock-shard'
      end,
      'required_op', case
        when hazard_roll < 34 then 'jump'
        when hazard_roll < 68 then 'duck'
        else null
      end,
      'resolved', false,
      'outcome', null
    )
    order by hazard_index
  )
  from (
    select
      hazard_index,
      private.game_reward_stable_roll(run_seed, 'time-runner:hazard:' || hazard_index::text, 100) as hazard_roll
    from pg_catalog.generate_series(0, 23) as hazard_index
  ) as generated;
$$;

create or replace function private.time_runner_landings(
  run_seed uuid,
  requested_route_step integer
)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  with landing_kind(kind_index, kind, label) as (
    values
      (0, 'minute-hand', 'Minute hand'),
      (1, 'roman-dial', 'Roman dial'),
      (2, 'pendulum-step', 'Pendulum step'),
      (3, 'hour-hand', 'Hour hand')
  ), base as (
    select private.game_reward_stable_roll(
      run_seed,
      'time-runner:landing:' || requested_route_step::text,
      4
    ) as kind_offset
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'id', 'landing-' || requested_route_step::text || '-' || branch.branch::text,
      'kind', landing_kind.kind,
      'label', landing_kind.label,
      'branch', branch.branch
    )
    order by branch.branch
  )
  from base
  cross join pg_catalog.generate_series(0, 1) as branch(branch)
  join landing_kind
    on landing_kind.kind_index = (requested_route_step + branch.branch + base.kind_offset) % 4;
$$;

create or replace function private.time_runner_score(
  cleared_hazards integer,
  clock_shards integer,
  route_step integer,
  best_combo integer,
  falls integer,
  completed boolean
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select greatest(
    0,
    cleared_hazards * 90
      + clock_shards * 60
      + least(route_step, 24) * 35
      + least(best_combo, 24) * 10
      + case when completed then 500 else 0 end
      - falls * 120
  );
$$;

create or replace function private.time_runner_initial_state(
  run_seed uuid,
  run_started_at timestamptz
)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'phase', 'running',
    'layout', private.time_runner_layout(run_seed),
    'elapsed_ms', 0,
    'falls', 0,
    'clock_shards', 0,
    'cleared_hazards', 0,
    'focus', 0,
    'focus_started_ms', 0,
    'focus_until_ms', 0,
    'combo', 0,
    'best_combo', 0,
    'route_step', 0,
    'available_landings', private.time_runner_landings(run_seed, 0),
    'score', 0,
    'started_at', run_started_at,
    'completed_at', null,
    'action_index', 0
  );
$$;

create or replace function private.start_time_runner_reward_session(
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
  session_seed uuid := gen_random_uuid();
  initial_state jsonb;
begin
  select session.*
  into session_row
  from public.game_reward_sessions as session
  where session.user_id = caller_id
    and session.game_key = game_config.game_key
    and session.rules_version = game_config.rules_version
    and session.claimed_event_id is null
    and coalesce(session.canonical_context ->> 'phase', 'running') <> 'failed'
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

  initial_state := private.time_runner_initial_state(session_seed, session_started_at);

  insert into public.game_reward_sessions (
    user_id,
    game_key,
    rules_version,
    seed,
    puzzle_date,
    canonical_context,
    started_at,
    expires_at
  )
  values (
    caller_id,
    game_config.game_key,
    game_config.rules_version,
    session_seed,
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

create or replace function private.progress_time_runner_reward_session(
  caller_id uuid,
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
  existing_action public.game_reward_actions%rowtype;
  reward_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  action_created_at timestamptz := pg_catalog.clock_timestamp();
  action_key_count integer;
  action_index integer;
  action_op text;
  action_hazard_id text;
  action_landing_id text;
  elapsed_ms integer;
  falls_count integer;
  clock_shard_count integer;
  cleared_count integer;
  focus_count integer;
  focus_started_ms integer;
  focus_until_ms integer;
  combo_count integer;
  best_combo_count integer;
  route_step_count integer;
  hazard jsonb;
  next_hazard jsonb;
  matched_hazard jsonb;
  next_layout jsonb := '[]'::jsonb;
  settled_layout jsonb := '[]'::jsonb;
  current_landings jsonb;
  next_phase text;
  completed boolean := false;
  score_total integer;
  next_context jsonb;
  result_snapshot jsonb;
begin
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
  if reward_session.game_key <> 'time-runner' then
    raise exception using errcode = '55000', message = 'Time Runner action used with another game';
  end if;
  if reward_session.canonical_context ->> 'phase' in ('complete', 'failed') then
    raise exception using errcode = '55000', message = 'Time Runner is already finished';
  end if;

  action_index := coalesce((reward_session.canonical_context ->> 'action_index')::integer, 0) + 1;
  if action_index > 128 then
    raise exception using errcode = '54000', message = 'Time Runner action limit reached';
  end if;

  select pg_catalog.count(*)::integer
  into action_key_count
  from pg_catalog.jsonb_object_keys(progress_action);

  action_op := progress_action ->> 'op';
  if action_op in ('jump', 'duck') then
    if action_key_count <> 2
      or not progress_action ? 'hazard_id'
      or pg_catalog.jsonb_typeof(progress_action -> 'hazard_id') <> 'string'
      or (progress_action ->> 'hazard_id') !~ '^time-[0-9]{1,2}$' then
      raise exception using errcode = '22023', message = 'Time Runner jump and duck accept op and hazard_id only';
    end if;
    action_hazard_id := progress_action ->> 'hazard_id';
  elsif action_op = 'land' then
    if action_key_count <> 2
      or not progress_action ? 'landing_id'
      or pg_catalog.jsonb_typeof(progress_action -> 'landing_id') <> 'string'
      or (progress_action ->> 'landing_id') !~ '^landing-[0-9]{1,3}-[01]$' then
      raise exception using errcode = '22023', message = 'Time Runner land accepts op and landing_id only';
    end if;
    action_landing_id := progress_action ->> 'landing_id';
  elsif action_op in ('focus', 'sync') then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Time Runner focus and sync accept op only';
    end if;
  else
    raise exception using errcode = '22023', message = 'Unsupported Time Runner action';
  end if;

  elapsed_ms := least(
    45000,
    greatest(0, pg_catalog.round(extract(epoch from (action_created_at - reward_session.started_at)) * 1000)::integer)
  );
  falls_count := (reward_session.canonical_context ->> 'falls')::integer;
  clock_shard_count := (reward_session.canonical_context ->> 'clock_shards')::integer;
  cleared_count := (reward_session.canonical_context ->> 'cleared_hazards')::integer;
  focus_count := (reward_session.canonical_context ->> 'focus')::integer;
  focus_started_ms := (reward_session.canonical_context ->> 'focus_started_ms')::integer;
  focus_until_ms := (reward_session.canonical_context ->> 'focus_until_ms')::integer;
  combo_count := (reward_session.canonical_context ->> 'combo')::integer;
  best_combo_count := (reward_session.canonical_context ->> 'best_combo')::integer;
  route_step_count := (reward_session.canonical_context ->> 'route_step')::integer;
  current_landings := reward_session.canonical_context -> 'available_landings';

  -- Resolve everything whose response window closed before this intent arrived.
  for hazard in
    select value
    from pg_catalog.jsonb_array_elements(reward_session.canonical_context -> 'layout')
    order by (value ->> 'at_ms')::integer
  loop
    next_hazard := hazard;
    if not (hazard ->> 'resolved')::boolean
      and (hazard ->> 'at_ms')::integer < elapsed_ms - 800 then
      if hazard ->> 'kind' = 'clock-shard' then
        clock_shard_count := clock_shard_count + 1;
        combo_count := combo_count + 1;
        best_combo_count := greatest(best_combo_count, combo_count);
        focus_count := least(100, focus_count + 5);
        next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"collected"'::jsonb, true);
      elsif (hazard ->> 'at_ms')::integer between focus_started_ms and focus_until_ms then
        cleared_count := cleared_count + 1;
        combo_count := combo_count + 1;
        best_combo_count := greatest(best_combo_count, combo_count);
        focus_count := least(100, focus_count + 7);
        next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"focused"'::jsonb, true);
      else
        falls_count := falls_count + 1;
        combo_count := 0;
        next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"fall"'::jsonb, true);
      end if;
      next_hazard := pg_catalog.jsonb_set(next_hazard, '{resolved}', 'true'::jsonb, true);
    end if;
    next_layout := next_layout || pg_catalog.jsonb_build_array(next_hazard);
  end loop;

  if falls_count < 3 and action_op in ('jump', 'duck') then
    select value
    into matched_hazard
    from pg_catalog.jsonb_array_elements(next_layout)
    where value ->> 'id' = action_hazard_id
      and not (value ->> 'resolved')::boolean
    limit 1;

    if matched_hazard is null
      or matched_hazard ->> 'required_op' <> action_op
      or elapsed_ms not between (matched_hazard ->> 'at_ms')::integer - 800
                            and (matched_hazard ->> 'at_ms')::integer + 800 then
      raise exception using errcode = '22023', message = 'Time Runner hazard intent does not match the canonical layout or timing window';
    end if;

    cleared_count := cleared_count + 1;
    combo_count := combo_count + 1;
    best_combo_count := greatest(best_combo_count, combo_count);
    focus_count := least(100, focus_count + case when action_op = 'jump' then 8 else 7 end);
    next_layout := (
      select pg_catalog.jsonb_agg(
        case when value ->> 'id' = action_hazard_id then
          pg_catalog.jsonb_set(
            pg_catalog.jsonb_set(value, '{resolved}', 'true'::jsonb, true),
            '{outcome}',
            pg_catalog.to_jsonb(action_op),
            true
          )
        else value end
        order by ordinal
      )
      from pg_catalog.jsonb_array_elements(next_layout) with ordinality as item(value, ordinal)
    );
  elsif falls_count < 3 and action_op = 'focus' then
    if focus_count < 30 then
      raise exception using errcode = '55000', message = 'Time Runner focus requires 30 focus';
    end if;
    focus_count := focus_count - 30;
    focus_started_ms := elapsed_ms;
    focus_until_ms := elapsed_ms + 420;
    combo_count := combo_count + 1;
    best_combo_count := greatest(best_combo_count, combo_count);
  elsif falls_count < 3 and action_op = 'land' then
    if not exists (
      select 1
      from pg_catalog.jsonb_array_elements(current_landings) as landing(value)
      where landing.value ->> 'id' = action_landing_id
    ) then
      raise exception using errcode = '22023', message = 'Time Runner landing is not available in the canonical route';
    end if;
    route_step_count := route_step_count + 1;
    current_landings := private.time_runner_landings(reward_session.seed, route_step_count);
  end if;

  -- The final action closes every remaining event; no client completion flag is accepted.
  if elapsed_ms = 45000 then
    for hazard in
      select value
      from pg_catalog.jsonb_array_elements(next_layout)
      order by (value ->> 'at_ms')::integer
    loop
      next_hazard := hazard;
      if not (hazard ->> 'resolved')::boolean then
        if hazard ->> 'kind' = 'clock-shard' then
          clock_shard_count := clock_shard_count + 1;
          combo_count := combo_count + 1;
          best_combo_count := greatest(best_combo_count, combo_count);
          focus_count := least(100, focus_count + 5);
          next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"collected"'::jsonb, true);
        elsif (hazard ->> 'at_ms')::integer between focus_started_ms and focus_until_ms then
          cleared_count := cleared_count + 1;
          combo_count := combo_count + 1;
          best_combo_count := greatest(best_combo_count, combo_count);
          next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"focused"'::jsonb, true);
        else
          falls_count := falls_count + 1;
          combo_count := 0;
          next_hazard := pg_catalog.jsonb_set(next_hazard, '{outcome}', '"fall"'::jsonb, true);
        end if;
        next_hazard := pg_catalog.jsonb_set(next_hazard, '{resolved}', 'true'::jsonb, true);
      end if;
      settled_layout := settled_layout || pg_catalog.jsonb_build_array(next_hazard);
    end loop;
    next_layout := settled_layout;
  end if;

  completed := elapsed_ms = 45000 and falls_count < 3;
  next_phase := case
    when falls_count >= 3 then 'failed'
    when completed then 'complete'
    else 'running'
  end;
  score_total := private.time_runner_score(
    cleared_count,
    clock_shard_count,
    route_step_count,
    best_combo_count,
    falls_count,
    completed
  );

  next_context := reward_session.canonical_context;
  next_context := pg_catalog.jsonb_set(next_context, '{phase}', pg_catalog.to_jsonb(next_phase), true);
  next_context := pg_catalog.jsonb_set(next_context, '{layout}', next_layout, true);
  next_context := pg_catalog.jsonb_set(next_context, '{elapsed_ms}', pg_catalog.to_jsonb(elapsed_ms), true);
  next_context := pg_catalog.jsonb_set(next_context, '{falls}', pg_catalog.to_jsonb(falls_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{clock_shards}', pg_catalog.to_jsonb(clock_shard_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{cleared_hazards}', pg_catalog.to_jsonb(cleared_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{focus}', pg_catalog.to_jsonb(focus_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{focus_started_ms}', pg_catalog.to_jsonb(focus_started_ms), true);
  next_context := pg_catalog.jsonb_set(next_context, '{focus_until_ms}', pg_catalog.to_jsonb(focus_until_ms), true);
  next_context := pg_catalog.jsonb_set(next_context, '{combo}', pg_catalog.to_jsonb(combo_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{best_combo}', pg_catalog.to_jsonb(best_combo_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{route_step}', pg_catalog.to_jsonb(route_step_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{available_landings}', current_landings, true);
  next_context := pg_catalog.jsonb_set(next_context, '{score}', pg_catalog.to_jsonb(score_total), true);
  next_context := pg_catalog.jsonb_set(next_context, '{action_index}', pg_catalog.to_jsonb(action_index), true);
  if next_phase in ('complete', 'failed') then
    next_context := pg_catalog.jsonb_set(
      next_context,
      '{completed_at}',
      pg_catalog.to_jsonb(action_created_at),
      true
    );
  end if;

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

create or replace function private.reserve_time_runner_clock_brass(
  caller_id uuid,
  reward_game_key text,
  reward_created_at timestamptz,
  requested_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  material_bucket_date date := (reward_created_at at time zone 'UTC')::date;
  quantity_earned integer;
  quantity_awarded integer;
  daily_clock_brass_cap constant integer := 10;
begin
  if requested_quantity < 0 or requested_quantity > 6 then
    raise exception using errcode = '22023', message = 'Invalid Time Runner Clock Brass reservation';
  end if;

  insert into public.game_reward_cap_buckets (
    user_id,
    game_key,
    bucket_date,
    favor_earned,
    reward_claims,
    material_earned,
    updated_at
  )
  values (caller_id, reward_game_key, material_bucket_date, 0, 0, '{}'::jsonb, reward_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select coalesce((bucket.material_earned ->> 'clock-brass')::integer, 0)
  into quantity_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = reward_game_key
    and bucket.bucket_date = material_bucket_date
  for update;

  quantity_awarded := least(
    requested_quantity,
    greatest(0, daily_clock_brass_cap - quantity_earned)
  );

  update public.game_reward_cap_buckets as bucket
  set material_earned = pg_catalog.jsonb_set(
        material_earned,
        '{clock-brass}',
        pg_catalog.to_jsonb(quantity_earned + quantity_awarded),
        true
      ),
      updated_at = reward_created_at
  where bucket.user_id = caller_id
    and bucket.game_key = reward_game_key
    and bucket.bucket_date = material_bucket_date;

  return quantity_awarded;
end;
$$;

create or replace function private.claim_time_runner_reward(
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
  clock_shard_count integer;
  falls_count integer;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  cap_earned integer;
  cap_remaining integer;
  clock_brass_awarded integer;
  favor_result jsonb;
  material_results jsonb := '[]'::jsonb;
  material_result jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
begin
  if claim_evidence <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Time Runner claims accept no client-authored result fields';
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
  if claim_session.game_key <> 'time-runner'
    or claim_session.canonical_context ->> 'phase' <> 'complete'
    or (claim_session.canonical_context ->> 'elapsed_ms')::integer <> 45000
    or (claim_session.canonical_context ->> 'falls')::integer >= 3
    or claim_session.canonical_context ->> 'completed_at' is null then
    raise exception using errcode = '55000', message = 'Time Runner must be canonically complete before claiming';
  end if;

  score_total := (claim_session.canonical_context ->> 'score')::integer;
  clock_shard_count := (claim_session.canonical_context ->> 'clock_shards')::integer;
  falls_count := (claim_session.canonical_context ->> 'falls')::integer;
  requested_favor := least(24, greatest(4, score_total / 150));

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

  favor_awarded := least(requested_favor, greatest(0, game_config.daily_favor_cap - cap_earned));
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

  clock_brass_awarded := private.reserve_time_runner_clock_brass(
    caller_id,
    claim_session.game_key,
    claim_created_at,
    least(6, greatest(1, clock_shard_count))
  );
  if clock_brass_awarded > 0 then
    material_result := private.post_game_reward_material(
      caller_id,
      'clock-brass',
      clock_brass_awarded,
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:clock-brass'),
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
        achievement.achievement_key = 'clocktower-clear'
        or (achievement.achievement_key = 'shard-sprinter' and clock_shard_count >= 6)
        or (achievement.achievement_key = 'unfractured-loop' and falls_count = 0)
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

create or replace function public.start_game_reward_session(requested_game_key text)
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

  select game.* into game_config
  from public.game_reward_games as game
  where game.game_key = requested_game_key;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are not enabled for this game';
  end if;
  if requested_game_key = 'match-merge' then
    return private.start_match_merge_reward_session(caller_id, game_config, session_started_at);
  end if;
  if requested_game_key = 'boba-cafe' then
    return private.start_boba_cafe_reward_session(caller_id, game_config, session_started_at);
  end if;
  if requested_game_key = 'puzzle-cat' then
    return private.start_find_vezmir_reward_session(caller_id, game_config, session_started_at);
  end if;
  if requested_game_key = 'time-runner' then
    return private.start_time_runner_reward_session(caller_id, game_config, session_started_at);
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
  session_game_key text;
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

  select session.game_key into session_game_key
  from public.game_reward_sessions as session
  where session.id = progress_session_id
    and session.user_id = caller_id;

  if session_game_key is null then
    raise exception using errcode = '42501', message = 'Reward session not found for this user';
  end if;
  if session_game_key = 'match-merge' then
    return private.progress_match_merge_reward_session_internal(
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;
  if session_game_key = 'boba-cafe' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-action:' || progress_idempotency_key::text, 0)
    );
    return private.progress_boba_cafe_reward_session(
      caller_id,
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;
  if session_game_key = 'puzzle-cat' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-session:' || progress_session_id::text, 0)
    );
    return private.progress_find_vezmir_reward_session(
      caller_id,
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;
  if session_game_key = 'time-runner' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-action:' || progress_idempotency_key::text, 0)
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-session:' || progress_session_id::text, 0)
    );
    return private.progress_time_runner_reward_session(
      caller_id,
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
  end if;

  raise exception using errcode = '55000', message = 'No action validator is enabled for this game';
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

  select event.* into existing_event
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

  select game.* into game_config
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

  if session_game_key in ('puzzle-cat', 'time-runner') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-session:' || claim_session_id::text, 0)
    );
  end if;

  claim_created_at := pg_catalog.clock_timestamp();
  perform private.reserve_game_reward_claim(caller_id, game_config, claim_created_at);

  if session_game_key = 'word-garden' then
    return private.claim_word_garden_reward_internal(claim_session_id, claim_idempotency_key, claim_evidence);
  end if;
  if session_game_key = 'match-merge' then
    return private.claim_match_merge_reward(caller_id, claim_session_id, claim_idempotency_key, claim_evidence);
  end if;
  if session_game_key = 'boba-cafe' then
    return private.claim_boba_cafe_reward(caller_id, claim_session_id, claim_idempotency_key, claim_evidence);
  end if;
  if session_game_key = 'puzzle-cat' then
    return private.claim_find_vezmir_reward(caller_id, claim_session_id, claim_idempotency_key, claim_evidence);
  end if;
  if session_game_key = 'time-runner' then
    return private.claim_time_runner_reward(caller_id, claim_session_id, claim_idempotency_key, claim_evidence);
  end if;

  raise exception using errcode = '55000', message = 'No reward validator is enabled for this game';
end;
$$;

revoke all on function private.time_runner_layout(uuid) from public, anon, authenticated;
revoke all on function private.time_runner_landings(uuid, integer) from public, anon, authenticated;
revoke all on function private.time_runner_score(integer, integer, integer, integer, integer, boolean) from public, anon, authenticated;
revoke all on function private.time_runner_initial_state(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.start_time_runner_reward_session(uuid, public.game_reward_games, timestamptz) from public, anon, authenticated;
revoke all on function private.progress_time_runner_reward_session(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.reserve_time_runner_clock_brass(uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function private.claim_time_runner_reward(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
