begin;

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap,
  daily_claim_cap
)
values ('word-garden', 2, false, 1800, 80, 1)
on conflict (game_key) do update
set rules_version = excluded.rules_version,
    session_ttl_seconds = excluded.session_ttl_seconds,
    daily_favor_cap = excluded.daily_favor_cap,
    daily_claim_cap = excluded.daily_claim_cap,
    enabled = false,
    updated_at = pg_catalog.clock_timestamp();

create or replace function private.word_garden_initial_context(puzzle_key text)
returns jsonb
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'display_name', 'Blooming Ink',
    'puzzle_key', puzzle_key,
    'phase', 'playing',
    'found_words', '[]'::jsonb,
    'score', 0,
    'full_bloom_count', 0,
    'action_index', 0,
    'completed_at', null
  );
$$;

create or replace function private.start_word_garden_reward_session_internal(requested_game_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  game_config public.game_reward_games%rowtype;
  puzzle public.daily_word_puzzles%rowtype;
  session_row public.game_reward_sessions%rowtype;
  session_started_at timestamptz := pg_catalog.clock_timestamp();
  initial_context jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if requested_game_key <> 'word-garden' then
    raise exception using errcode = '22023', message = 'Invalid Blooming Ink game key';
  end if;

  select game.*
  into game_config
  from public.game_reward_games as game
  where game.game_key = requested_game_key;

  if game_config.game_key is null or not game_config.enabled then
    raise exception using errcode = '55000', message = 'Game rewards are not enabled for this game';
  end if;

  select daily.*
  into puzzle
  from public.daily_word_puzzles as daily
  where daily.game_key = requested_game_key
    and daily.puzzle_date = (session_started_at at time zone 'UTC')::date;

  if puzzle.puzzle_key is null then
    raise exception using errcode = '55000', message = 'No canonical daily puzzle is available';
  end if;

  select session.*
  into session_row
  from public.game_reward_sessions as session
  where session.user_id = caller_id
    and session.game_key = game_config.game_key
    and session.rules_version = game_config.rules_version
    and session.puzzle_date = puzzle.puzzle_date
    and session.claimed_event_id is null
    and session.expires_at > session_started_at
  order by session.started_at desc
  limit 1
  for update;

  if session_row.id is null then
    initial_context := private.word_garden_initial_context(puzzle.puzzle_key);

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
      puzzle.puzzle_date,
      initial_context,
      session_started_at,
      session_started_at + pg_catalog.make_interval(secs => game_config.session_ttl_seconds)
    )
    returning * into session_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'session_id', session_row.id,
    'game_key', session_row.game_key,
    'display_name', 'Blooming Ink',
    'rules_version', session_row.rules_version,
    'seed', session_row.seed,
    'puzzle', pg_catalog.jsonb_build_object(
      'date', puzzle.puzzle_date,
      'key', puzzle.puzzle_key,
      'title', puzzle.title,
      'letters', puzzle.letters,
      'center', puzzle.center_letter
    ),
    'context', session_row.canonical_context,
    'started_at', session_row.started_at,
    'expires_at', session_row.expires_at
  );
end;
$$;

create or replace function private.progress_word_garden_reward_session(
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
  puzzle public.daily_word_puzzles%rowtype;
  action_created_at timestamptz := pg_catalog.clock_timestamp();
  action_key_count integer;
  action_op text;
  submitted_word text;
  action_index integer;
  found_words jsonb;
  found_word_count integer;
  score_total integer;
  full_bloom_count integer;
  word_score integer;
  is_full_bloom boolean;
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
      raise exception using errcode = '23505', message = 'Reward action idempotency key is already used';
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
  if reward_session.game_key <> 'word-garden' then
    raise exception using errcode = '22023', message = 'Reward session is not Blooming Ink';
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

  select daily.*
  into puzzle
  from public.daily_word_puzzles as daily
  where daily.puzzle_date = reward_session.puzzle_date
    and daily.game_key = reward_session.game_key
    and daily.puzzle_key = reward_session.canonical_context ->> 'puzzle_key';

  if puzzle.puzzle_key is null then
    raise exception using errcode = '55000', message = 'Canonical puzzle is unavailable';
  end if;

  if pg_catalog.jsonb_typeof(reward_session.canonical_context -> 'found_words') <> 'array'
    or reward_session.canonical_context ->> 'phase' not in ('playing', 'complete') then
    raise exception using errcode = '55000', message = 'Blooming Ink canonical state is invalid';
  end if;

  action_op := progress_action ->> 'op';
  select pg_catalog.count(*)::integer
  into action_key_count
  from pg_catalog.jsonb_object_keys(progress_action);

  if action_op = 'submit' then
    if action_key_count <> 2
      or not progress_action ? 'word'
      or pg_catalog.jsonb_typeof(progress_action -> 'word') <> 'string' then
      raise exception using errcode = '22023', message = 'Blooming Ink submit accepts op and word only';
    end if;
  elsif action_op = 'rest' then
    if action_key_count <> 1 then
      raise exception using errcode = '22023', message = 'Blooming Ink rest accepts op only';
    end if;
  else
    raise exception using errcode = '22023', message = 'Unknown Blooming Ink action';
  end if;

  if reward_session.canonical_context ->> 'phase' <> 'playing' then
    raise exception using errcode = '55000', message = 'Blooming Ink garden is already resting';
  end if;

  action_index := coalesce((reward_session.canonical_context ->> 'action_index')::integer, 0) + 1;
  if action_index > 101 then
    raise exception using errcode = '54000', message = 'Blooming Ink action limit reached';
  end if;

  found_words := reward_session.canonical_context -> 'found_words';
  found_word_count := pg_catalog.jsonb_array_length(found_words);
  score_total := coalesce((reward_session.canonical_context ->> 'score')::integer, 0);
  full_bloom_count := coalesce((reward_session.canonical_context ->> 'full_bloom_count')::integer, 0);
  next_context := reward_session.canonical_context;

  if action_op = 'submit' then
    submitted_word := pg_catalog.upper(pg_catalog.btrim(progress_action ->> 'word'));

    if submitted_word !~ '^[A-Z]{4,32}$'
      or pg_catalog.strpos(submitted_word, puzzle.center_letter) = 0
      or exists (
        select 1
        from pg_catalog.regexp_split_to_table(submitted_word, '') as letter(value)
        where pg_catalog.strpos(puzzle.letters, letter.value) = 0
      )
      or not (submitted_word = any(puzzle.accepted_words)) then
      raise exception using errcode = '22023', message = 'Submitted word is not valid for the canonical puzzle';
    end if;

    if exists (
      select 1
      from pg_catalog.jsonb_array_elements_text(found_words) as found(value)
      where found.value = submitted_word
    ) then
      raise exception using errcode = '22023', message = 'Submitted word has already bloomed';
    end if;
    if found_word_count >= 100 then
      raise exception using errcode = '54000', message = 'Blooming Ink word limit reached';
    end if;

    is_full_bloom := submitted_word = any(puzzle.full_bloom_words);
    word_score := pg_catalog.length(submitted_word) + case when is_full_bloom then 7 else 0 end;
    found_words := found_words || pg_catalog.jsonb_build_array(submitted_word);
    score_total := score_total + word_score;
    full_bloom_count := full_bloom_count + case when is_full_bloom then 1 else 0 end;

    next_context := pg_catalog.jsonb_set(next_context, '{found_words}', found_words, true);
    next_context := pg_catalog.jsonb_set(next_context, '{score}', pg_catalog.to_jsonb(score_total), true);
    next_context := pg_catalog.jsonb_set(next_context, '{full_bloom_count}', pg_catalog.to_jsonb(full_bloom_count), true);
  else
    if found_word_count < 1 then
      raise exception using errcode = '55000', message = 'Bloom at least one canonical word before resting';
    end if;
    next_context := pg_catalog.jsonb_set(next_context, '{phase}', '"complete"'::jsonb, true);
    next_context := pg_catalog.jsonb_set(
      next_context,
      '{completed_at}',
      pg_catalog.to_jsonb(action_created_at),
      true
    );
  end if;

  next_context := pg_catalog.jsonb_set(next_context, '{action_index}', pg_catalog.to_jsonb(action_index), true);

  update public.game_reward_sessions
  set canonical_context = next_context
  where id = reward_session.id;

  result_snapshot := pg_catalog.jsonb_build_object(
    'session_id', reward_session.id,
    'game_key', reward_session.game_key,
    'display_name', 'Blooming Ink',
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

create or replace function private.reserve_word_garden_blooming_ink(
  caller_id uuid,
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
  daily_blooming_ink_cap constant integer := 12;
begin
  if requested_quantity < 0 or requested_quantity > 5 then
    raise exception using errcode = '22023', message = 'Invalid Blooming Ink material reservation';
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
  values (caller_id, 'word-garden', material_bucket_date, 0, 0, '{}'::jsonb, reward_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select coalesce((bucket.material_earned ->> 'blooming-ink')::integer, 0)
  into quantity_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = 'word-garden'
    and bucket.bucket_date = material_bucket_date
  for update;

  quantity_awarded := least(
    requested_quantity,
    greatest(0, daily_blooming_ink_cap - quantity_earned)
  );

  update public.game_reward_cap_buckets as bucket
  set material_earned = pg_catalog.jsonb_set(
        material_earned,
        '{blooming-ink}',
        pg_catalog.to_jsonb(quantity_earned + quantity_awarded),
        true
      ),
      updated_at = reward_created_at
  where bucket.user_id = caller_id
    and bucket.game_key = 'word-garden'
    and bucket.bucket_date = material_bucket_date;

  return quantity_awarded;
end;
$$;

create or replace function private.claim_word_garden_reward_internal(
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
  claim_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  puzzle public.daily_word_puzzles%rowtype;
  claim_created_at timestamptz := pg_catalog.clock_timestamp();
  reward_event_id uuid := gen_random_uuid();
  submitted_word text;
  found_word_count integer;
  distinct_word_count integer;
  score_total integer := 0;
  full_bloom_count integer := 0;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  cap_earned integer;
  cap_remaining integer;
  favor_result jsonb;
  material_quantity integer;
  material_awarded integer;
  material_result jsonb;
  material_results jsonb := '[]'::jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if claim_evidence <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Blooming Ink claims accept no client-authored result fields';
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
  if claim_session.game_key <> 'word-garden'
    or claim_session.canonical_context ->> 'phase' <> 'complete'
    or claim_session.canonical_context ->> 'completed_at' is null
    or pg_catalog.jsonb_typeof(claim_session.canonical_context -> 'found_words') <> 'array' then
    raise exception using errcode = '55000', message = 'Blooming Ink must be canonically complete before claiming';
  end if;

  select daily.*
  into puzzle
  from public.daily_word_puzzles as daily
  where daily.puzzle_date = claim_session.puzzle_date
    and daily.game_key = claim_session.game_key
    and daily.puzzle_key = claim_session.canonical_context ->> 'puzzle_key';

  if puzzle.puzzle_key is null then
    raise exception using errcode = '55000', message = 'Canonical puzzle is unavailable';
  end if;

  select pg_catalog.count(*)::integer,
         pg_catalog.count(distinct found.value)::integer
  into found_word_count, distinct_word_count
  from pg_catalog.jsonb_array_elements_text(claim_session.canonical_context -> 'found_words') as found(value);

  if found_word_count < 1 or found_word_count > 100 or distinct_word_count <> found_word_count then
    raise exception using errcode = '55000', message = 'Canonical Blooming Ink words are invalid';
  end if;

  for submitted_word in
    select found.value
    from pg_catalog.jsonb_array_elements_text(claim_session.canonical_context -> 'found_words') as found(value)
  loop
    if submitted_word !~ '^[A-Z]{4,32}$'
      or pg_catalog.strpos(submitted_word, puzzle.center_letter) = 0
      or exists (
        select 1
        from pg_catalog.regexp_split_to_table(submitted_word, '') as letter(value)
        where pg_catalog.strpos(puzzle.letters, letter.value) = 0
      )
      or not (submitted_word = any(puzzle.accepted_words)) then
      raise exception using errcode = '55000', message = 'Canonical Blooming Ink word is not in the daily puzzle';
    end if;

    score_total := score_total + pg_catalog.length(submitted_word);
    if submitted_word = any(puzzle.full_bloom_words) then
      score_total := score_total + 7;
      full_bloom_count := full_bloom_count + 1;
    end if;
  end loop;

  if score_total <> (claim_session.canonical_context ->> 'score')::integer
    or full_bloom_count <> (claim_session.canonical_context ->> 'full_bloom_count')::integer then
    raise exception using errcode = '55000', message = 'Canonical Blooming Ink totals are inconsistent';
  end if;

  requested_favor := least(32, greatest(3, score_total / 4));

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

  material_quantity := least(5, found_word_count + full_bloom_count);
  material_awarded := private.reserve_word_garden_blooming_ink(
    caller_id,
    claim_created_at,
    material_quantity
  );
  if material_awarded > 0 then
    material_result := private.post_game_reward_material(
      caller_id,
      'blooming-ink',
      material_awarded,
      reward_event_id,
      private.game_reward_scoped_uuid(claim_idempotency_key, 'material:blooming-ink'),
      pg_catalog.jsonb_build_object(
        'game_key', claim_session.game_key,
        'session_id', claim_session.id,
        'rules_version', claim_session.rules_version
      )
    );
    material_results := pg_catalog.jsonb_build_array(material_result - 'replayed');
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
        achievement.achievement_key = 'word-garden-first-sprout'
        or (achievement.achievement_key = 'word-garden-full-bloom' and full_bloom_count > 0)
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
    'display_name', 'Blooming Ink',
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
  if session_game_key = 'word-garden' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-action:' || progress_idempotency_key::text, 0)
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(caller_id::text || ':game-session:' || progress_session_id::text, 0)
    );
    return private.progress_word_garden_reward_session(
      caller_id,
      progress_session_id,
      progress_idempotency_key,
      progress_action
    );
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

revoke all on function private.word_garden_initial_context(text) from public, anon, authenticated;
revoke all on function private.start_word_garden_reward_session_internal(text) from public, anon, authenticated;
revoke all on function private.progress_word_garden_reward_session(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.reserve_word_garden_blooming_ink(uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function private.claim_word_garden_reward_internal(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.progress_game_reward_session(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
