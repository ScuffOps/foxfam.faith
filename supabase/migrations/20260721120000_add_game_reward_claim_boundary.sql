begin;

do $$
begin
  if pg_catalog.to_regclass('public.currency_accounts') is null
    or pg_catalog.to_regclass('public.currency_ledger') is null
    or pg_catalog.to_regclass('public.user_material_balances') is null
    or pg_catalog.to_regclass('public.material_ledger') is null
    or pg_catalog.to_regprocedure('private.ensure_favor_account(uuid)') is null
    or pg_catalog.to_regprocedure('private.post_favor_entry(uuid,bigint,text,uuid,uuid,jsonb)') is null then
    raise exception using
      errcode = '55000',
      message = 'Game rewards require the staged Phase 2 progression migration';
  end if;
end;
$$;

create table public.game_reward_games (
  game_key text primary key check (game_key ~ '^[a-z0-9-]+$'),
  rules_version integer not null check (rules_version > 0),
  enabled boolean not null default false,
  session_ttl_seconds integer not null check (session_ttl_seconds between 60 and 3600),
  daily_favor_cap integer not null check (daily_favor_cap between 0 and 10000),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp()
);

insert into public.game_reward_games (
  game_key,
  rules_version,
  enabled,
  session_ttl_seconds,
  daily_favor_cap
)
values ('word-garden', 1, false, 1800, 80);

create table public.daily_word_puzzles (
  puzzle_date date not null,
  game_key text not null references public.game_reward_games(game_key),
  puzzle_key text not null check (puzzle_key ~ '^[a-z0-9-]+$'),
  title text not null check (pg_catalog.length(title) between 1 and 80),
  letters text not null check (letters ~ '^[A-Z]{7}$'),
  center_letter text not null check (center_letter ~ '^[A-Z]$'),
  accepted_words text[] not null check (pg_catalog.cardinality(accepted_words) between 1 and 500),
  full_bloom_words text[] not null default '{}'::text[],
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (puzzle_date, game_key),
  unique (puzzle_date, puzzle_key),
  check (pg_catalog.strpos(letters, center_letter) > 0),
  check (full_bloom_words <@ accepted_words)
);

create table public.game_reward_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null references public.game_reward_games(game_key),
  rules_version integer not null check (rules_version > 0),
  seed uuid not null default gen_random_uuid(),
  puzzle_date date not null,
  canonical_context jsonb not null default '{}'::jsonb check (pg_catalog.jsonb_typeof(canonical_context) = 'object'),
  started_at timestamptz not null default pg_catalog.clock_timestamp(),
  expires_at timestamptz not null,
  claimed_event_id uuid,
  unique (id, user_id),
  foreign key (puzzle_date, game_key) references public.daily_word_puzzles(puzzle_date, game_key),
  check (expires_at > started_at)
);

create table public.game_reward_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.game_reward_sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null references public.game_reward_games(game_key),
  rules_version integer not null check (rules_version > 0),
  idempotency_key uuid not null,
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{32}$'),
  score integer not null check (score >= 0),
  favor_awarded integer not null check (favor_awarded >= 0),
  result_snapshot jsonb not null check (pg_catalog.jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (user_id, idempotency_key)
);

alter table public.game_reward_sessions
  add constraint game_reward_sessions_claimed_event_fk
  foreign key (claimed_event_id) references public.game_reward_events(id) on delete restrict;

create table public.game_reward_cap_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null references public.game_reward_games(game_key),
  bucket_date date not null,
  favor_earned integer not null default 0 check (favor_earned >= 0),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (user_id, game_key, bucket_date)
);

create index game_reward_sessions_owner_started_idx
on public.game_reward_sessions (user_id, started_at desc);

create index game_reward_events_owner_created_idx
on public.game_reward_events (user_id, created_at desc);

alter table public.user_achievements
  add column source_reward_event_id uuid;

alter table public.user_achievements
  add constraint user_achievements_source_reward_event_id_fk
  foreign key (source_reward_event_id)
  references public.game_reward_events(id)
  on delete set null
  deferrable initially deferred;

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
    'word-garden-first-sprout',
    'First Sprout',
    'Complete a server-validated Word Garden.',
    '{"game_key":"word-garden","minimum_words":1}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'word-garden-full-bloom',
    'Full Bloom',
    'Find a seven-letter Full Bloom in Word Garden.',
    '{"game_key":"word-garden","minimum_full_blooms":1}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (achievement_key) do update
set title = excluded.title,
    description = excluded.description,
    condition = excluded.condition,
    reward = excluded.reward,
    active = excluded.active;

alter table public.game_reward_games enable row level security;
alter table public.game_reward_games force row level security;
alter table public.daily_word_puzzles enable row level security;
alter table public.daily_word_puzzles force row level security;
alter table public.game_reward_sessions enable row level security;
alter table public.game_reward_sessions force row level security;
alter table public.game_reward_events enable row level security;
alter table public.game_reward_events force row level security;
alter table public.game_reward_cap_buckets enable row level security;
alter table public.game_reward_cap_buckets force row level security;

revoke all on table public.game_reward_games from public, anon, authenticated;
revoke all on table public.daily_word_puzzles from public, anon, authenticated;
revoke all on table public.game_reward_sessions from public, anon, authenticated;
revoke all on table public.game_reward_events from public, anon, authenticated;
revoke all on table public.game_reward_cap_buckets from public, anon, authenticated;

revoke insert, update, delete on table public.game_reward_sessions from anon, authenticated;
revoke insert, update, delete on table public.game_reward_events from anon, authenticated;
revoke insert, update, delete on table public.game_reward_cap_buckets from anon, authenticated;
revoke insert, update, delete on table public.daily_word_puzzles from anon, authenticated;

grant select on table public.game_reward_sessions to authenticated;
grant select on table public.game_reward_events to authenticated;
grant select on table public.game_reward_cap_buckets to authenticated;

create policy game_reward_sessions_owner_read
on public.game_reward_sessions
for select to authenticated
using ((select auth.uid()) = user_id);

create policy game_reward_events_owner_read
on public.game_reward_events
for select to authenticated
using ((select auth.uid()) = user_id);

create policy game_reward_cap_buckets_owner_read
on public.game_reward_cap_buckets
for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.game_reward_scoped_uuid(
  parent_key uuid,
  scope_key text
)
returns uuid
language sql
immutable
strict
set search_path = ''
as $$
  select (
    pg_catalog.substr(hash_value, 1, 8)
    || '-' || pg_catalog.substr(hash_value, 9, 4)
    || '-' || pg_catalog.substr(hash_value, 13, 4)
    || '-' || pg_catalog.substr(hash_value, 17, 4)
    || '-' || pg_catalog.substr(hash_value, 21, 12)
  )::uuid
  from (
    select pg_catalog.md5(parent_key::text || ':' || scope_key) as hash_value
  ) as scoped_hash;
$$;

create or replace function private.post_game_reward_material(
  entry_user_id uuid,
  entry_material_key text,
  entry_amount bigint,
  entry_source_id uuid,
  entry_idempotency_key uuid,
  entry_metadata jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  current_balance bigint;
  next_balance bigint;
  existing_source_id uuid;
  entry_created_at timestamptz := pg_catalog.clock_timestamp();
begin
  if entry_user_id is null
    or entry_material_key !~ '^[a-z0-9-]+$'
    or entry_amount is null
    or entry_amount <= 0
    or entry_source_id is null
    or entry_idempotency_key is null
    or entry_metadata is null
    or pg_catalog.jsonb_typeof(entry_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'Invalid material ledger entry';
  end if;

  insert into public.user_material_balances (user_id, material_key, balance, updated_at)
  values (entry_user_id, entry_material_key, 0, entry_created_at)
  on conflict (user_id, material_key) do nothing;

  select balance.balance
  into current_balance
  from public.user_material_balances as balance
  where balance.user_id = entry_user_id
    and balance.material_key = entry_material_key
  for update;

  select ledger.source_id
  into existing_source_id
  from public.material_ledger as ledger
  where ledger.user_id = entry_user_id
    and ledger.material_key = entry_material_key
    and ledger.idempotency_key = entry_idempotency_key;

  if existing_source_id is not null then
    if existing_source_id <> entry_source_id then
      raise exception using errcode = '23505', message = 'Material idempotency key is already used by another source';
    end if;
    return pg_catalog.jsonb_build_object(
      'key', entry_material_key,
      'delta', 0,
      'balance', current_balance,
      'replayed', true
    );
  end if;

  if current_balance::numeric + entry_amount::numeric > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Material balance exceeds JavaScript safe integer range';
  end if;
  next_balance := current_balance + entry_amount;

  update public.user_material_balances
  set balance = next_balance,
      updated_at = entry_created_at
  where user_id = entry_user_id
    and material_key = entry_material_key;

  insert into public.material_ledger (
    user_id,
    material_key,
    amount,
    balance_after,
    source_type,
    source_id,
    idempotency_key,
    metadata,
    created_at
  )
  values (
    entry_user_id,
    entry_material_key,
    entry_amount,
    next_balance,
    'game_reward',
    entry_source_id,
    entry_idempotency_key,
    entry_metadata,
    entry_created_at
  );

  return pg_catalog.jsonb_build_object(
    'key', entry_material_key,
    'delta', entry_amount,
    'balance', next_balance,
    'replayed', false
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
  puzzle public.daily_word_puzzles%rowtype;
  session_row public.game_reward_sessions%rowtype;
  session_started_at timestamptz := pg_catalog.clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if requested_game_key is null or requested_game_key !~ '^[a-z0-9-]+$' then
    raise exception using errcode = '22023', message = 'Invalid game key';
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
    pg_catalog.jsonb_build_object('puzzle_key', puzzle.puzzle_key),
    session_started_at,
    session_started_at + pg_catalog.make_interval(secs => game_config.session_ttl_seconds)
  )
  returning * into session_row;

  return pg_catalog.jsonb_build_object(
    'session_id', session_row.id,
    'game_key', session_row.game_key,
    'rules_version', session_row.rules_version,
    'seed', session_row.seed,
    'puzzle', pg_catalog.jsonb_build_object(
      'date', puzzle.puzzle_date,
      'key', puzzle.puzzle_key,
      'title', puzzle.title,
      'letters', puzzle.letters,
      'center', puzzle.center_letter
    ),
    'started_at', session_row.started_at,
    'expires_at', session_row.expires_at
  );
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
  claim_session public.game_reward_sessions%rowtype;
  game_config public.game_reward_games%rowtype;
  puzzle public.daily_word_puzzles%rowtype;
  claim_created_at timestamptz := pg_catalog.clock_timestamp();
  reward_event_id uuid := gen_random_uuid();
  evidence_word_count integer;
  distinct_word_count integer;
  evidence_key_count integer;
  submitted_word text;
  score_total integer := 0;
  full_bloom_count integer := 0;
  requested_favor integer;
  favor_awarded integer;
  favor_balance bigint;
  favor_cap integer;
  cap_earned integer;
  cap_remaining integer;
  favor_result jsonb;
  material_quantity integer;
  material_result jsonb;
  achievement_results jsonb := '[]'::jsonb;
  claim_result_snapshot jsonb;
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

  select event.*
  into existing_event
  from public.game_reward_events as event
  where event.user_id = caller_id
    and event.idempotency_key = claim_idempotency_key;

  if existing_event.id is not null then
    if existing_event.session_id <> claim_session_id then
      raise exception using errcode = '23505', message = 'Reward idempotency key belongs to another session';
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
  if claim_session.game_key <> 'word-garden' then
    raise exception using errcode = '55000', message = 'No reward validator is enabled for this game';
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

  select pg_catalog.count(*)::integer
  into evidence_key_count
  from pg_catalog.jsonb_object_keys(claim_evidence);

  if evidence_key_count <> 1
    or not claim_evidence ? 'found_words'
    or pg_catalog.jsonb_typeof(claim_evidence -> 'found_words') <> 'array' then
    raise exception using errcode = '22023', message = 'Word Garden evidence accepts found_words only';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(claim_evidence -> 'found_words') as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'string'
  ) then
    raise exception using errcode = '22023', message = 'Submitted words must be strings';
  end if;

  select pg_catalog.count(*)::integer,
         pg_catalog.count(distinct word.value)::integer
  into evidence_word_count, distinct_word_count
  from pg_catalog.jsonb_array_elements_text(claim_evidence -> 'found_words') as word(value);

  if evidence_word_count < 1 or evidence_word_count > 100 or distinct_word_count <> evidence_word_count then
    raise exception using errcode = '22023', message = 'Submitted words must be unique and contain between 1 and 100 entries';
  end if;

  for submitted_word in
    select word.value
    from pg_catalog.jsonb_array_elements_text(claim_evidence -> 'found_words') as word(value)
  loop
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

    score_total := score_total + pg_catalog.length(submitted_word);
    if submitted_word = any(puzzle.full_bloom_words) then
      score_total := score_total + 7;
      full_bloom_count := full_bloom_count + 1;
    end if;
  end loop;

  requested_favor := pg_catalog.greatest(3, score_total / 4);
  favor_cap := game_config.daily_favor_cap;

  insert into public.game_reward_cap_buckets (user_id, game_key, bucket_date, favor_earned, updated_at)
  values (caller_id, claim_session.game_key, claim_session.puzzle_date, 0, claim_created_at)
  on conflict (user_id, game_key, bucket_date) do nothing;

  select bucket.favor_earned
  into cap_earned
  from public.game_reward_cap_buckets as bucket
  where bucket.user_id = caller_id
    and bucket.game_key = claim_session.game_key
    and bucket.bucket_date = claim_session.puzzle_date
  for update;

  favor_awarded := pg_catalog.least(requested_favor, pg_catalog.greatest(0, favor_cap - cap_earned));
  cap_remaining := pg_catalog.greatest(0, favor_cap - cap_earned - favor_awarded);

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
      and bucket_date = claim_session.puzzle_date;
  else
    favor_balance := private.ensure_favor_account(caller_id);
  end if;

  material_quantity := pg_catalog.least(5, evidence_word_count + full_bloom_count);
  material_result := private.post_game_reward_material(
    caller_id,
    'blooming-ink',
    material_quantity,
    reward_event_id,
    private.game_reward_scoped_uuid(claim_idempotency_key, 'material:blooming-ink'),
    pg_catalog.jsonb_build_object(
      'game_key', claim_session.game_key,
      'session_id', claim_session.id,
      'rules_version', claim_session.rules_version
    )
  );

  with inserted_achievements as (
    insert into public.user_achievements (
      user_id,
      achievement_key,
      source_reward_event_id,
      unlocked_at
    )
    select
      caller_id,
      achievement.achievement_key,
      reward_event_id,
      claim_created_at
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
    'score', score_total,
    'favor', pg_catalog.jsonb_build_object(
      'delta', favor_awarded,
      'balance', favor_balance,
      'cap_remaining', cap_remaining
    ),
    'materials', pg_catalog.jsonb_build_array(
      material_result - 'replayed'
    ),
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

revoke all on function private.game_reward_scoped_uuid(uuid, text) from public, anon, authenticated;
revoke all on function private.post_game_reward_material(uuid, text, bigint, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.start_game_reward_session(text) from public, anon, authenticated;
revoke all on function public.claim_game_reward(uuid, uuid, jsonb) from public, anon, authenticated;

commit;
