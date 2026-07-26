begin;

alter table public.game_reward_cap_buckets
  add column material_earned jsonb not null default '{}'::jsonb
  check (pg_catalog.jsonb_typeof(material_earned) = 'object');

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap,
  daily_claim_cap
)
values ('puzzle-cat', 1, false, 900, 60, 2)
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
    'find-vezmir-found',
    'Vezmir Found',
    'Complete a server-validated Lantern Cloister case.',
    '{"game_key":"puzzle-cat","complete":true}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'find-vezmir-quiet-detective',
    'Quiet Detective',
    'Find Vezmir without a missed search.',
    '{"game_key":"puzzle-cat","maximum_misses":0}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'find-vezmir-lantern-eyed',
    'Lantern-Eyed',
    'Find Vezmir without requesting a hint.',
    '{"game_key":"puzzle-cat","maximum_hints":0}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = excluded.active;

create or replace function private.find_vezmir_targets(session_seed uuid)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  with target(key, role, layer, base_x, base_y) as (
    values
      ('moon-mug', 'clue', 'foreground', 180, 750),
      ('ribbon-bell', 'clue', 'room', 380, 390),
      ('fox-pin', 'clue', 'foreground', 610, 760),
      ('star-note', 'clue', 'background', 800, 340),
      ('seed-pouch', 'clue', 'room', 850, 710),
      ('vezmir', 'final', 'background', 520, 520)
  )
  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'key', target.key,
      'role', target.role,
      'layer', target.layer,
      'x', target.base_x,
      'y', target.base_y,
      'radius', case when target.role = 'final' then 78 else 58 end
    )
    order by
      case when target.role = 'final' then 1 else 0 end,
      private.game_reward_stable_roll(session_seed, 'vezmir:order:' || target.key, 1000000),
      target.key
  )
  from target;
$$;

create or replace function private.find_vezmir_score(
  found_count integer,
  found_vezmir boolean,
  focus_count integer,
  miss_count integer,
  hint_count integer,
  elapsed_ms integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select greatest(
    0,
    found_count * 140
      + case when found_vezmir then 420 + 240 else 0 end
      + focus_count * 45
      + case when found_vezmir and miss_count = 0 then 160 else 0 end
      + case when found_vezmir and hint_count = 0 then 120 else 0 end
      + case when found_vezmir then greatest(0, 180 - elapsed_ms / 1000) else 0 end
      - miss_count * 28
      - hint_count * 42
  );
$$;

create or replace function private.find_vezmir_initial_state(
  session_seed uuid,
  session_started_at timestamptz
)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'phase', 'seeking',
    'targets', private.find_vezmir_targets(session_seed),
    'found_keys', '[]'::jsonb,
    'active_hint_key', null,
    'focus', 5,
    'misses', 0,
    'hints_used', 0,
    'score', 0,
    'elapsed_ms', 0,
    'started_at', session_started_at,
    'completed_at', null,
    'action_index', 0
  );
$$;

create or replace function private.start_find_vezmir_reward_session(
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

  initial_state := private.find_vezmir_initial_state(session_seed, session_started_at);

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

create or replace function private.progress_find_vezmir_reward_session(
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
  search_x integer;
  search_y integer;
  search_layer text;
  elapsed_ms integer;
  focus_count integer;
  miss_count integer;
  hint_count integer;
  found_count integer;
  found_vezmir boolean;
  target jsonb;
  matched_target jsonb;
  hinted_target jsonb;
  found_keys jsonb;
  next_phase text;
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
  if reward_session.game_key <> 'puzzle-cat' then
    raise exception using errcode = '55000', message = 'Find Vezmir action used with another game';
  end if;
  if reward_session.canonical_context ->> 'phase' = 'complete' then
    raise exception using errcode = '55000', message = 'Find Vezmir is already complete';
  end if;

  action_index := coalesce((reward_session.canonical_context ->> 'action_index')::integer, 0) + 1;
  if action_index > 48 then
    raise exception using errcode = '54000', message = 'Find Vezmir action limit reached';
  end if;

  select pg_catalog.count(*)::integer
  into action_key_count
  from pg_catalog.jsonb_object_keys(progress_action);

  action_op := progress_action ->> 'op';
  found_keys := reward_session.canonical_context -> 'found_keys';
  focus_count := (reward_session.canonical_context ->> 'focus')::integer;
  miss_count := (reward_session.canonical_context ->> 'misses')::integer;
  hint_count := (reward_session.canonical_context ->> 'hints_used')::integer;
  next_context := reward_session.canonical_context;

  if action_op = 'search' then
    if action_key_count <> 4
      or not progress_action ? 'op'
      or not progress_action ? 'x'
      or not progress_action ? 'y'
      or not progress_action ? 'layer'
      or pg_catalog.jsonb_typeof(progress_action -> 'x') <> 'number'
      or pg_catalog.jsonb_typeof(progress_action -> 'y') <> 'number'
      or pg_catalog.jsonb_typeof(progress_action -> 'layer') <> 'string'
      or pg_catalog.trunc((progress_action ->> 'x')::numeric) <> (progress_action ->> 'x')::numeric
      or pg_catalog.trunc((progress_action ->> 'y')::numeric) <> (progress_action ->> 'y')::numeric
      or (progress_action ->> 'x')::numeric not between 0 and 1000
      or (progress_action ->> 'y')::numeric not between 0 and 1000 then
      raise exception using errcode = '22023', message = 'Find Vezmir search accepts op, integer x, integer y, and layer only';
    end if;

    search_x := (progress_action ->> 'x')::integer;
    search_y := (progress_action ->> 'y')::integer;
    search_layer := progress_action ->> 'layer';
    if search_layer not in ('foreground', 'room', 'background') then
      raise exception using errcode = '22023', message = 'Find Vezmir layer is not allowed';
    end if;

    for target in
      select value
      from pg_catalog.jsonb_array_elements(reward_session.canonical_context -> 'targets')
    loop
      if target ->> 'layer' = search_layer
        and not (found_keys ? (target ->> 'key'))
        and (search_x - (target ->> 'x')::integer) * (search_x - (target ->> 'x')::integer)
          + (search_y - (target ->> 'y')::integer) * (search_y - (target ->> 'y')::integer)
          <= (target ->> 'radius')::integer * (target ->> 'radius')::integer then
        matched_target := target;
        exit;
      end if;
    end loop;

    if matched_target is null
      or (matched_target ->> 'role' = 'final' and pg_catalog.jsonb_array_length(found_keys) < 5) then
      focus_count := greatest(0, focus_count - 1);
      miss_count := miss_count + 1;
    else
      found_keys := found_keys || pg_catalog.jsonb_build_array(matched_target ->> 'key');
      next_context := pg_catalog.jsonb_set(next_context, '{found_keys}', found_keys, true);
      if next_context ->> 'active_hint_key' = matched_target ->> 'key' then
        next_context := pg_catalog.jsonb_set(next_context, '{active_hint_key}', 'null'::jsonb, true);
      end if;
    end if;

  elsif action_op = 'hint' then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Find Vezmir hint accepts op only';
    end if;
    if hint_count >= 6 then
      raise exception using errcode = '55000', message = 'Find Vezmir hint limit reached';
    end if;

    select candidate.value
    into hinted_target
    from pg_catalog.jsonb_array_elements(reward_session.canonical_context -> 'targets')
      with ordinality as candidate(value, ordinal)
    where not (found_keys ? (candidate.value ->> 'key'))
      and (
        candidate.value ->> 'role' = 'clue'
        or pg_catalog.jsonb_array_length(found_keys) = 5
      )
    order by candidate.ordinal
    limit 1;

    if hinted_target is null then
      raise exception using errcode = '55000', message = 'No Find Vezmir hint is available';
    end if;
    hint_count := hint_count + 1;
    next_context := pg_catalog.jsonb_set(
      next_context,
      '{active_hint_key}',
      pg_catalog.to_jsonb(hinted_target ->> 'key'),
      true
    );

  else
    raise exception using errcode = '22023', message = 'Unsupported Find Vezmir action';
  end if;

  found_count := pg_catalog.jsonb_array_length(found_keys);
  found_vezmir := found_keys ? 'vezmir';
  elapsed_ms := least(
    game_config.session_ttl_seconds * 1000,
    greatest(0, pg_catalog.round(extract(epoch from (action_created_at - reward_session.started_at)) * 1000)::integer)
  );
  next_phase := case
    when found_vezmir then 'complete'
    when found_count = 5 then 'vezmir-ready'
    else 'seeking'
  end;
  score_total := private.find_vezmir_score(
    least(found_count, 5),
    found_vezmir,
    focus_count,
    miss_count,
    hint_count,
    elapsed_ms
  );

  next_context := pg_catalog.jsonb_set(next_context, '{phase}', pg_catalog.to_jsonb(next_phase), true);
  next_context := pg_catalog.jsonb_set(next_context, '{focus}', pg_catalog.to_jsonb(focus_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{misses}', pg_catalog.to_jsonb(miss_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{hints_used}', pg_catalog.to_jsonb(hint_count), true);
  next_context := pg_catalog.jsonb_set(next_context, '{score}', pg_catalog.to_jsonb(score_total), true);
  next_context := pg_catalog.jsonb_set(next_context, '{elapsed_ms}', pg_catalog.to_jsonb(elapsed_ms), true);
  next_context := pg_catalog.jsonb_set(next_context, '{action_index}', pg_catalog.to_jsonb(action_index), true);
  if found_vezmir then
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

create or replace function private.reserve_find_vezmir_material(
  caller_id uuid,
  reward_game_key text,
  reward_created_at timestamptz,
  reward_material_key text,
  requested_quantity integer,
  daily_material_cap integer
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
begin
  if reward_material_key not in ('catnip-silver', 'voidthread')
    or requested_quantity < 0
    or daily_material_cap < 1 then
    raise exception using errcode = '22023', message = 'Invalid Find Vezmir material reservation';
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

  select coalesce((bucket.material_earned ->> reward_material_key)::integer, 0)
  into quantity_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = reward_game_key
    and bucket.bucket_date = material_bucket_date
  for update;

  quantity_awarded := least(requested_quantity, greatest(0, daily_material_cap - quantity_earned));

  update public.game_reward_cap_buckets as bucket
  set material_earned = pg_catalog.jsonb_set(
        material_earned,
        array[reward_material_key],
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

create or replace function private.claim_find_vezmir_reward(
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
  focus_count integer;
  miss_count integer;
  hint_count integer;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  cap_earned integer;
  cap_remaining integer;
  catnip_silver_awarded integer;
  voidthread_awarded integer;
  favor_result jsonb;
  material_results jsonb := '[]'::jsonb;
  material_result jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
begin
  if claim_evidence <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Find Vezmir claims accept no client-authored result fields';
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
  if claim_session.game_key <> 'puzzle-cat'
    or claim_session.canonical_context ->> 'phase' <> 'complete'
    or not (claim_session.canonical_context -> 'found_keys' ? 'vezmir')
    or pg_catalog.jsonb_array_length(claim_session.canonical_context -> 'found_keys') <> 6
    or claim_session.canonical_context ->> 'completed_at' is null then
    raise exception using errcode = '55000', message = 'Find Vezmir must be complete before claiming';
  end if;

  score_total := (claim_session.canonical_context ->> 'score')::integer;
  focus_count := (claim_session.canonical_context ->> 'focus')::integer;
  miss_count := (claim_session.canonical_context ->> 'misses')::integer;
  hint_count := (claim_session.canonical_context ->> 'hints_used')::integer;
  requested_favor := least(24, greatest(4, score_total / 90));

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

  catnip_silver_awarded := private.reserve_find_vezmir_material(
    caller_id,
    claim_session.game_key,
    claim_created_at,
    'catnip-silver',
    least(6, greatest(1, 1 + focus_count + case when miss_count = 0 then 1 else 0 end)),
    10
  );
  if catnip_silver_awarded > 0 then
    material_result := private.post_game_reward_material(
      caller_id,
      'catnip-silver',
      catnip_silver_awarded,
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:catnip-silver'),
      pg_catalog.jsonb_build_object('game_key', claim_session.game_key, 'session_id', claim_session.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result - 'replayed');
  end if;

  voidthread_awarded := private.reserve_find_vezmir_material(
    caller_id,
    claim_session.game_key,
    claim_created_at,
    'voidthread',
    least(5, greatest(1, 2 + focus_count / 2 + case when hint_count = 0 then 1 else 0 end)),
    8
  );
  if voidthread_awarded > 0 then
    material_result := private.post_game_reward_material(
      caller_id,
      'voidthread',
      voidthread_awarded,
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:voidthread'),
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
        achievement.achievement_key = 'find-vezmir-found'
        or (achievement.achievement_key = 'find-vezmir-quiet-detective' and miss_count = 0)
        or (achievement.achievement_key = 'find-vezmir-lantern-eyed' and hint_count = 0)
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

  if session_game_key = 'puzzle-cat' then
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

  raise exception using errcode = '55000', message = 'No reward validator is enabled for this game';
end;
$$;

revoke all on function private.find_vezmir_targets(uuid) from public, anon, authenticated;
revoke all on function private.find_vezmir_score(integer, boolean, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function private.find_vezmir_initial_state(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.start_find_vezmir_reward_session(uuid, public.game_reward_games, timestamptz) from public, anon, authenticated;
revoke all on function private.progress_find_vezmir_reward_session(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.reserve_find_vezmir_material(uuid, text, timestamptz, text, integer, integer) from public, anon, authenticated;
revoke all on function private.claim_find_vezmir_reward(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
