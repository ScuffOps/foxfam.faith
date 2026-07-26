\set ON_ERROR_STOP on

begin;

create table if not exists private.game_rewards_disposable_smoke_sentinel (
  singleton boolean primary key default true check (singleton),
  project_ref text not null,
  marker text not null,
  disposable boolean not null,
  expires_at timestamptz not null,
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  provisioned_at timestamptz not null default pg_catalog.clock_timestamp()
);

revoke all on table private.game_rewards_disposable_smoke_sentinel from public, anon, authenticated;

select (
  :'game_rewards_project_ref' ~ '^[a-z0-9]{20}$'
  and :'game_rewards_project_ref' <> 'wdypokgdqgvqpyabvshq'
) as valid_project_ref \gset
\if :valid_project_ref
\else
  \echo 'Invalid disposable project ref'
  \quit 3
\endif

select (
  :'game_rewards_marker' ~ '^[a-z0-9][a-z0-9-]{7,63}$'
  and :'game_rewards_expires_at'::timestamptz > pg_catalog.clock_timestamp()
  and :'game_rewards_expires_at'::timestamptz <= pg_catalog.clock_timestamp() + interval '7 days'
  and :'game_rewards_user_a_id'::uuid <> :'game_rewards_user_b_id'::uuid
) as valid_fixture \gset
\if :valid_fixture
\else
  \echo 'Invalid disposable fixture values'
  \quit 3
\endif

insert into private.game_rewards_disposable_smoke_sentinel (
  singleton,
  project_ref,
  marker,
  disposable,
  expires_at,
  user_a_id,
  user_b_id,
  provisioned_at
)
values (
  true,
  :'game_rewards_project_ref',
  :'game_rewards_marker',
  true,
  :'game_rewards_expires_at'::timestamptz,
  :'game_rewards_user_a_id'::uuid,
  :'game_rewards_user_b_id'::uuid,
  pg_catalog.clock_timestamp()
)
on conflict (singleton) do update
set project_ref = excluded.project_ref,
    marker = excluded.marker,
    disposable = excluded.disposable,
    expires_at = excluded.expires_at,
    user_a_id = excluded.user_a_id,
    user_b_id = excluded.user_b_id,
    provisioned_at = excluded.provisioned_at;

insert into public.daily_word_puzzles (
  puzzle_date,
  game_key,
  puzzle_key,
  title,
  letters,
  center_letter,
  accepted_words,
  full_bloom_words
)
values (
  (pg_catalog.clock_timestamp() at time zone 'UTC')::date,
  'word-garden',
  'petal-rite',
  'Petal Rite',
  'PETALSR',
  'A',
  array['PALE','PALETTE','PAPER','PAPERS','PARLERS','PAST','PEAR','PEARS','PETAL','PETALS','PLATE','PLATES','PLEAT','RATE','RATES','REAL','REAP','SALE','SALT','SEAL','SLATE','SPARE','SPEAR','STALE','STAPLE','STAR','START','TAPE','TAPER','TAPERS','TEAR','TEARS','PETALERS'],
  array['PETALERS']
)
on conflict (puzzle_date, game_key) do update
set puzzle_key = excluded.puzzle_key,
    title = excluded.title,
    letters = excluded.letters,
    center_letter = excluded.center_letter,
    accepted_words = excluded.accepted_words,
    full_bloom_words = excluded.full_bloom_words;

commit;
