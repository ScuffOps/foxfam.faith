-- Starfishing Phase 2 authoritative progression schema.

create table public.game_fish_catalog (
  fish_key text primary key,
  label text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  min_size numeric(8,2) not null check (min_size > 0),
  max_size numeric(8,2) not null check (max_size >= min_size),
  qte_length smallint not null check (qte_length between 1 and 16),
  base_favor integer not null check (base_favor >= 0),
  material_drops jsonb not null default '[]'::jsonb check (jsonb_typeof(material_drops) = 'array'),
  rarity_weight integer not null check (rarity_weight > 0),
  active boolean not null default true,
  catalog_version integer not null default 1 check (catalog_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_cast_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fish_key text not null references public.game_fish_catalog(fish_key),
  catalog_version integer not null,
  authoritative_size numeric(8,2) not null,
  applied_effects jsonb not null default '[]'::jsonb check (jsonb_typeof(applied_effects) = 'array'),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  claim_id uuid,
  created_at timestamptz not null default now(),
  check (expires_at > not_before),
  check (expires_at = created_at + interval '10 minutes')
);

create unique index game_cast_tickets_one_active_per_user
on public.game_cast_tickets (user_id)
where consumed_at is null;

create table public.game_catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null default 'starfishing' check (game_key = 'starfishing'),
  fish_key text not null references public.game_fish_catalog(fish_key),
  size numeric(8,2) not null check (size > 0),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  duplicate boolean not null,
  duplicate_policy text not null check (duplicate_policy in ('none', 'keep', 'release', 'convert')),
  play_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(play_evidence) = 'object'),
  idempotency_key uuid not null,
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.user_fishpedia (
  user_id uuid not null references auth.users(id) on delete cascade,
  fish_key text not null references public.game_fish_catalog(fish_key),
  caught_count integer not null default 0 check (caught_count >= 0),
  smallest_size numeric(8,2) not null check (smallest_size > 0),
  largest_size numeric(8,2) not null check (largest_size >= smallest_size),
  first_caught_at timestamptz not null,
  last_caught_at timestamptz not null,
  primary key (user_id, fish_key)
);

create table public.currency_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_key text not null check (currency_key ~ '^[a-z0-9-]+$'),
  balance bigint not null default 0 check (balance between 0 and 9007199254740991),
  updated_at timestamptz not null default now(),
  unique (user_id, currency_key)
);

create table public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_key text not null check (currency_key ~ '^[a-z0-9-]+$'),
  amount bigint not null,
  balance_after bigint not null check (balance_after between 0 and 9007199254740991),
  source_type text not null,
  source_id uuid not null,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, currency_key, idempotency_key),
  check (
    amount <> 0
    or source_type = 'legacy_opening_balance'
    or coalesce(metadata ->> 'legacy_source_marker', 'false') = 'true'
  )
);

create unique index currency_ledger_one_source_identity
on public.currency_ledger (user_id, currency_key, source_type, source_id);

create table public.user_material_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  balance bigint not null default 0 check (balance between 0 and 9007199254740991),
  updated_at timestamptz not null default now(),
  unique (user_id, material_key)
);

create table public.material_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after between 0 and 9007199254740991),
  source_type text not null,
  source_id uuid not null,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, material_key, idempotency_key)
);

create table public.achievement_catalog (
  achievement_key text primary key,
  title text not null,
  description text not null,
  condition jsonb not null check (jsonb_typeof(condition) = 'object'),
  reward jsonb not null default '{}'::jsonb check (jsonb_typeof(reward) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.achievement_catalog(achievement_key),
  source_catch_id uuid references public.game_catches(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create table public.user_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trophy_key text not null check (trophy_key ~ '^[a-z0-9-]+$'),
  source_achievement_key text references public.achievement_catalog(achievement_key),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  acquired_at timestamptz not null default now(),
  unique (user_id, trophy_key)
);

insert into public.game_fish_catalog (
  fish_key,
  label,
  rarity,
  min_size,
  max_size,
  qte_length,
  base_favor,
  material_drops,
  rarity_weight,
  catalog_version
)
values
  ('ember-mote', 'Ember Mote', 'common', 2.10, 6.40, 1, 3, '[{"key":"star-glass","label":"Star Glass","quantity":1,"type":"material"}]'::jsonb, 27, 1),
  ('lunar-guppy', 'Lunar Guppy', 'common', 3.00, 8.20, 1, 3, '[{"key":"star-glass","label":"Star Glass","quantity":1,"type":"material"}]'::jsonb, 27, 1),
  ('aurora-minnow', 'Aurora Minnow', 'uncommon', 5.50, 12.80, 2, 5, '[{"key":"star-glass","label":"Star Glass","quantity":2,"type":"material"}]'::jsonb, 25, 1),
  ('comet-koi', 'Comet Koi', 'rare', 11.00, 24.00, 3, 8, '[{"key":"star-glass","label":"Star Glass","quantity":3,"type":"material"}]'::jsonb, 14, 1),
  ('eclipse-ray', 'Eclipse Ray', 'epic', 22.00, 45.00, 4, 13, '[{"key":"star-glass","label":"Star Glass","quantity":5,"type":"material"}]'::jsonb, 6, 1),
  ('veri-starwhale', 'Veri Starwhale', 'mythic', 48.00, 99.00, 5, 25, '[{"key":"star-glass","label":"Star Glass","quantity":8,"type":"material"}]'::jsonb, 1, 1)
on conflict (fish_key) do update
set
  label = excluded.label,
  rarity = excluded.rarity,
  min_size = excluded.min_size,
  max_size = excluded.max_size,
  qte_length = excluded.qte_length,
  base_favor = excluded.base_favor,
  material_drops = excluded.material_drops,
  rarity_weight = excluded.rarity_weight,
  active = true,
  catalog_version = excluded.catalog_version,
  updated_at = now();

insert into public.achievement_catalog (
  achievement_key,
  title,
  description,
  condition,
  reward
)
values
  (
    'first-light',
    'First Light',
    'Make your first successful Starfishing catch.',
    '{"type":"successful_catch_count","count":1}'::jsonb,
    '{"kind":"charm","charm_key":"starlit-bobber","label":"Starlit Bobber","rarity":"uncommon","slot":"fishing","effects":{"favor_multiplier_bps":500}}'::jsonb
  ),
  (
    'gentle-return',
    'Gentle Return',
    'Release your first duplicate catch for Favor.',
    '{"type":"duplicate_release_count","count":1}'::jsonb,
    '{"kind":"charm","charm_key":"merciful-tide","label":"Merciful Tide","rarity":"rare","slot":"catch-fx","effects":{"catch_effect":"merciful-tide"}}'::jsonb
  ),
  (
    'pocket-constellation',
    'Pocket Constellation',
    'Catch a fish within the lowest 5% of its canonical size span.',
    '{"type":"size_percentile","direction":"lowest","percentile":5}'::jsonb,
    '{"kind":"charm","charm_key":"pocket-star","label":"Pocket Star","rarity":"epic","slot":"profile-particle","effects":{"profile_particle":"pocket-star"}}'::jsonb
  ),
  (
    'myth-in-moonwater',
    'Myth in Moonwater',
    'Make your first mythic catch.',
    '{"type":"rarity_catch_count","rarity":"mythic","count":1}'::jsonb,
    '{"kind":"charm","charm_key":"glassfin-comet","label":"Glassfin Comet","rarity":"mythic","slot":"fishing","effects":{"rare_bite_bonus_bps":300}}'::jsonb
  ),
  (
    'celestial-archivist',
    'Celestial Archivist',
    'Catch every active fish in the current catalog.',
    '{"type":"active_catalog_completion"}'::jsonb,
    '{"kind":"charm","charm_key":"fishpedia-frame","label":"Fishpedia Frame","rarity":"mythic","slot":"profile-frame","effects":{"profile_frame":"fishpedia-frame"},"trophy_key":"celestial-archivist"}'::jsonb
  ),
  (
    'hundred-lights',
    'Hundred Lights',
    'Record 100 successful catches.',
    '{"type":"successful_catch_count","count":100}'::jsonb,
    '{"kind":"charm","charm_key":"century-chain","label":"Century Chain","rarity":"epic","slot":"fishing","effects":{"material_multiplier_bps":750}}'::jsonb
  )
on conflict (achievement_key) do update
set
  title = excluded.title,
  description = excluded.description,
  condition = excluded.condition,
  reward = excluded.reward,
  active = true;

-- Achievement charms use data.source.type = 'achievement' and
-- data.source.key = achievement_catalog.achievement_key.
create unique index user_relic_charms_one_starfishing_achievement_per_user
on public.user_relic_charms (user_id, (data #>> '{source,key}'))
where data #>> '{source,type}' = 'achievement'
  and nullif(data #>> '{source,key}', '') is not null;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'game_catches',
    'user_fishpedia',
    'currency_accounts',
    'currency_ledger',
    'user_material_balances',
    'material_ledger',
    'user_achievements',
    'user_trophies'
  ]
  loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('alter table public.%I force row level security', relation_name);
    execute format('revoke all on table public.%I from anon, authenticated', relation_name);
    execute format('grant select on table public.%I to authenticated', relation_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      'Users read own ' || relation_name,
      relation_name
    );
  end loop;
end
$$;

alter table public.game_cast_tickets enable row level security;
alter table public.game_cast_tickets force row level security;
revoke all on table public.game_cast_tickets from anon, authenticated;

revoke all on table public.user_relic_charms from anon;
revoke insert, update, delete on table public.user_relic_charms from authenticated;
grant select on table public.user_relic_charms to authenticated;
drop policy if exists "Users create own relic charms" on public.user_relic_charms;
drop policy if exists "Users update own relic charms" on public.user_relic_charms;
drop policy if exists "Users delete own relic charms" on public.user_relic_charms;

alter table public.game_fish_catalog enable row level security;
alter table public.game_fish_catalog force row level security;
revoke all on table public.game_fish_catalog from anon, authenticated;
grant select on table public.game_fish_catalog to authenticated;
create policy "Authenticated read active fish catalog"
on public.game_fish_catalog for select
to authenticated
using (active);

alter table public.achievement_catalog enable row level security;
alter table public.achievement_catalog force row level security;
revoke all on table public.achievement_catalog from anon, authenticated;
grant select on table public.achievement_catalog to authenticated;
create policy "Authenticated read active achievement catalog"
on public.achievement_catalog for select
to authenticated
using (active);

create table if not exists private.favor_gateway_cutovers (
  cutover_key text primary key,
  cutover_at timestamptz not null,
  constraint favor_gateway_cutovers_singleton
    check (cutover_key = 'portal-actions-v1')
);

create table if not exists private.favor_gateway_historical_sources (
  action_key text not null,
  source_id uuid not null,
  snapshotted_at timestamptz not null,
  primary key (action_key, source_id),
  constraint favor_gateway_historical_action_key
    check (action_key in (
      'submit-post',
      'post-blessing',
      'blessing-comment',
      'reliquary-comment',
      'praise-blessing',
      'praise-idea',
      'vote-poll'
    ))
);

create table if not exists private.relic_forge_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  result_snapshot jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, request_id),
  constraint relic_forge_receipts_result_object
    check (result_snapshot is null or jsonb_typeof(result_snapshot) = 'object')
);

create table if not exists private.relic_forge_investments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  relic_id uuid not null unique references public.user_relics(id) on delete cascade,
  favor_invested bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint relic_forge_investments_safe_amount
    check (favor_invested between 0 and 9007199254740991)
);

create table if not exists private.favor_reconciliation_audit (
  id uuid primary key default gen_random_uuid(),
  cutover_key text not null,
  audit_kind text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id uuid,
  account_balance bigint,
  mirror_balance bigint,
  details jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  constraint favor_reconciliation_audit_kind
    check (audit_kind in ('mirror_mismatch', 'duplicate_level')),
  constraint favor_reconciliation_audit_details
    check (jsonb_typeof(details) = 'object')
);

create unique index if not exists favor_reconciliation_audit_identity
on private.favor_reconciliation_audit (
  cutover_key,
  audit_kind,
  user_id,
  coalesce(level_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists private.favor_reconciliation_cutovers (
  cutover_key text primary key,
  completed_at timestamptz not null,
  constraint favor_reconciliation_cutovers_singleton
    check (cutover_key = 'favor-ledger-v1')
);

revoke all on table private.favor_gateway_cutovers from public, anon, authenticated;
revoke all on table private.favor_gateway_historical_sources from public, anon, authenticated;
revoke all on table private.relic_forge_receipts from public, anon, authenticated;
revoke all on table private.relic_forge_investments from public, anon, authenticated;
revoke all on table private.favor_reconciliation_audit from public, anon, authenticated;
revoke all on table private.favor_reconciliation_cutovers from public, anon, authenticated;

do $$
declare
  cutover_created boolean := false;
  snapshot_cutover_at timestamptz := pg_catalog.clock_timestamp();
begin
  insert into private.favor_gateway_cutovers (cutover_key, cutover_at)
  values ('portal-actions-v1', snapshot_cutover_at)
  on conflict (cutover_key) do nothing
  returning true into cutover_created;

  if coalesce(cutover_created, false) then
    insert into private.favor_gateway_historical_sources (
      action_key,
      source_id,
      snapshotted_at
    )
    select historical.action_key, historical.source_id, snapshot_cutover_at
    from (
      select 'submit-post'::text as action_key, submitted_post.id as source_id
      from public.community_posts as submitted_post

      union all

      select 'post-blessing'::text as action_key, posted_blessing.id as source_id
      from public.blessings as posted_blessing

      union all

      select 'blessing-comment'::text as action_key, blessing_comment.id as source_id
      from public.blessing_comments as blessing_comment

      union all

      select 'reliquary-comment'::text as action_key, reliquary_comment.id as source_id
      from public.reliquary_comments as reliquary_comment

      union all

      select 'praise-blessing'::text as action_key, praised_blessing.id as source_id
      from public.blessings as praised_blessing

      union all

      select 'praise-idea'::text as action_key, praised_post.id as source_id
      from public.community_posts as praised_post

      union all

      select 'vote-poll'::text as action_key, poll_post.id as source_id
      from public.community_posts as poll_post
    ) as historical
    on conflict (action_key, source_id) do nothing;
  end if;
end
$$;

create or replace function private.reject_favor_gateway_cutover_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'Favor gateway cutover markers are immutable';
  return null;
end;
$$;

revoke all on function private.reject_favor_gateway_cutover_mutation()
from public, anon, authenticated;

drop trigger if exists favor_gateway_cutovers_are_immutable
on private.favor_gateway_cutovers;
create trigger favor_gateway_cutovers_are_immutable
before update or delete or truncate on private.favor_gateway_cutovers
for each statement
execute function private.reject_favor_gateway_cutover_mutation();

create or replace function private.reject_favor_gateway_historical_source_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'Favor gateway historical sources are immutable';
  return null;
end;
$$;

revoke all on function private.reject_favor_gateway_historical_source_mutation()
from public, anon, authenticated;

drop trigger if exists favor_gateway_historical_sources_are_immutable
on private.favor_gateway_historical_sources;
create trigger favor_gateway_historical_sources_are_immutable
before insert or update or delete or truncate
on private.favor_gateway_historical_sources
for each statement
execute function private.reject_favor_gateway_historical_source_mutation();

create or replace function private.favor_rank(rank_balance bigint)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when rank_balance >= 300 then
      pg_catalog.jsonb_build_object('name', 'Forblessed', 'min', 300)
    when rank_balance >= 150 then
      pg_catalog.jsonb_build_object('name', 'Timescorned', 'min', 150)
    when rank_balance >= 75 then
      pg_catalog.jsonb_build_object('name', 'Purified', 'min', 75)
    when rank_balance >= 30 then
      pg_catalog.jsonb_build_object('name', 'Faithful', 'min', 30)
    when rank_balance >= 10 then
      pg_catalog.jsonb_build_object('name', 'Seeker', 'min', 10)
    else
      pg_catalog.jsonb_build_object('name', 'Forsaken', 'min', 0)
  end
$$;

create or replace function private.sync_favor_mirror(
  mirror_user_id uuid,
  mirror_balance bigint
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  mirror_level_id uuid;
  mirror_level_data jsonb;
  mirror_updated_at timestamptz := pg_catalog.clock_timestamp();
begin
  if mirror_user_id is null then
    raise exception using errcode = '22023', message = 'Favor mirror user is required';
  end if;
  if mirror_balance is null or mirror_balance < 0 or mirror_balance > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Invalid Favor mirror balance';
  end if;

  select level_row.id, level_row.data
  into mirror_level_id, mirror_level_data
  from public.user_levels as level_row
  where level_row.user_id = mirror_user_id
  order by level_row.created_at, level_row.id
  limit 1
  for update;

  if mirror_level_id is null then
    select level_row.id, level_row.data
    into mirror_level_id, mirror_level_data
    from public.user_levels as level_row
    where level_row.data ->> 'user_key' = 'user:' || mirror_user_id::text
      and (level_row.user_id is null or level_row.user_id = mirror_user_id)
    order by level_row.created_at, level_row.id
    limit 1
    for update;
  end if;

  if mirror_level_data is not null
    and pg_catalog.jsonb_typeof(mirror_level_data) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Favor mirror data must be an object';
  end if;

  if mirror_level_id is null then
    insert into public.user_levels (
      user_id,
      created_by,
      data,
      created_at,
      updated_at
    )
    values (
      mirror_user_id,
      null,
      pg_catalog.jsonb_build_object(
        'user_key', 'user:' || mirror_user_id::text,
        'points', mirror_balance
      ),
      mirror_updated_at,
      mirror_updated_at
    )
    returning id into mirror_level_id;
  else
    update public.user_levels
    set user_id = coalesce(user_id, mirror_user_id),
        data = pg_catalog.jsonb_set(
          pg_catalog.jsonb_set(
            coalesce(data, '{}'::jsonb),
            '{user_key}',
            pg_catalog.to_jsonb('user:' || mirror_user_id::text),
            true
          ),
          '{points}',
          pg_catalog.to_jsonb(mirror_balance),
          true
        ),
        updated_at = mirror_updated_at
    where id = mirror_level_id;
  end if;

  return mirror_level_id;
end;
$$;

create or replace function private.ensure_favor_account(
  account_user_id uuid
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  locked_user_id uuid;
  account_balance bigint;
  account_created boolean := false;
  account_created_at timestamptz := pg_catalog.clock_timestamp();
  legacy_opening_balance bigint := 0;
  legacy_opening_hash text;
  legacy_opening_id uuid;
  legacy_user_level_id uuid;
  legacy_user_level_data jsonb;
begin
  if account_user_id is null then
    raise exception using errcode = '22023', message = 'Favor account user is required';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = account_user_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '22023', message = 'Favor account user not found';
  end if;

  select account.balance
  into account_balance
  from public.currency_accounts as account
  where account.user_id = account_user_id
    and account.currency_key = 'favor'
  for update;

  if found then
    perform private.sync_favor_mirror(account_user_id, account_balance);
    return account_balance;
  end if;

  select level_row.id, level_row.data
  into legacy_user_level_id, legacy_user_level_data
  from public.user_levels as level_row
  where level_row.user_id = account_user_id
  order by level_row.created_at, level_row.id
  limit 1
  for update;

  if legacy_user_level_id is null then
    select level_row.id, level_row.data
    into legacy_user_level_id, legacy_user_level_data
    from public.user_levels as level_row
    where level_row.data ->> 'user_key' = 'user:' || account_user_id::text
      and (level_row.user_id is null or level_row.user_id = account_user_id)
    order by level_row.created_at, level_row.id
    limit 1
    for update;
  end if;

  if legacy_user_level_data ->> 'points' ~ '^[0-9]+$' then
    if (legacy_user_level_data ->> 'points')::numeric > 9007199254740991 then
      raise exception using
        errcode = '22003',
        message = 'Legacy Favor opening balance exceeds JavaScript safe integer range';
    end if;
    legacy_opening_balance := (legacy_user_level_data ->> 'points')::bigint;
  end if;

  insert into public.currency_accounts (
    user_id,
    currency_key,
    balance,
    updated_at
  )
  values (
    account_user_id,
    'favor',
    legacy_opening_balance,
    account_created_at
  )
  on conflict (user_id, currency_key) do nothing
  returning true into account_created;

  if coalesce(account_created, false) then
    legacy_opening_hash := pg_catalog.md5(
      'starfishing:favor:legacy-opening:' || account_user_id::text
    );
    legacy_opening_id := (
      pg_catalog.substr(legacy_opening_hash, 1, 8)
      || '-' || pg_catalog.substr(legacy_opening_hash, 9, 4)
      || '-' || pg_catalog.substr(legacy_opening_hash, 13, 4)
      || '-' || pg_catalog.substr(legacy_opening_hash, 17, 4)
      || '-' || pg_catalog.substr(legacy_opening_hash, 21, 12)
    )::uuid;

    insert into public.currency_ledger (
      user_id,
      currency_key,
      amount,
      balance_after,
      source_type,
      source_id,
      idempotency_key,
      metadata,
      created_at
    )
    values (
      account_user_id,
      'favor',
      legacy_opening_balance,
      legacy_opening_balance,
      'legacy_opening_balance',
      legacy_opening_id,
      legacy_opening_id,
      pg_catalog.jsonb_build_object(
        'user_level_id', legacy_user_level_id,
        'imported_points', legacy_opening_balance
      ),
      account_created_at
    )
    on conflict (user_id, currency_key, idempotency_key) do nothing;
  end if;

  select account.balance
  into account_balance
  from public.currency_accounts as account
  where account.user_id = account_user_id
    and account.currency_key = 'favor'
  for update;

  if account_balance is null then
    raise exception using errcode = 'P0001', message = 'Favor account could not be created';
  end if;

  perform private.sync_favor_mirror(account_user_id, account_balance);
  return account_balance;
end;
$$;

create or replace function private.post_favor_entry(
  entry_user_id uuid,
  entry_amount bigint,
  entry_source_type text,
  entry_source_id uuid,
  entry_idempotency_key uuid,
  entry_metadata jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  account_balance bigint;
  next_balance bigint;
  next_balance_numeric numeric;
  entry_created_at timestamptz := pg_catalog.clock_timestamp();
  existing_source_id uuid;
  existing_idempotency_source_id uuid;
  existing_idempotency_source_type text;
begin
  if entry_user_id is null
    or entry_amount is null
    or entry_source_id is null
    or entry_idempotency_key is null
    or entry_source_type is null
    or entry_source_type !~ '^[a-z0-9_-]+$' then
    raise exception using errcode = '22023', message = 'Invalid Favor ledger entry';
  end if;
  if entry_metadata is null or pg_catalog.jsonb_typeof(entry_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'Favor metadata must be an object';
  end if;
  if entry_amount = 0
    and coalesce(entry_metadata ->> 'legacy_source_marker', 'false') <> 'true' then
    raise exception using errcode = '22023', message = 'Zero Favor entries require a source marker';
  end if;
  if entry_amount <> 0
    and coalesce(entry_metadata ->> 'legacy_source_marker', 'false') = 'true' then
    raise exception using errcode = '22023', message = 'Favor source markers must have zero amount';
  end if;

  account_balance := private.ensure_favor_account(entry_user_id);

  select ledger.source_id
  into existing_source_id
  from public.currency_ledger as ledger
  where ledger.user_id = entry_user_id
    and ledger.currency_key = 'favor'
    and ledger.source_type = entry_source_type
    and ledger.source_id = entry_source_id;

  if existing_source_id is not null then
    return pg_catalog.jsonb_build_object(
      'replayed', true,
      'favor', pg_catalog.jsonb_build_object(
        'delta', 0,
        'balance', account_balance
      )
    );
  end if;

  select ledger.source_id, ledger.source_type
  into existing_idempotency_source_id, existing_idempotency_source_type
  from public.currency_ledger as ledger
  where ledger.user_id = entry_user_id
    and ledger.currency_key = 'favor'
    and ledger.idempotency_key = entry_idempotency_key;

  if existing_idempotency_source_id is not null then
    raise exception using
      errcode = '23505',
      message = 'Favor idempotency key is already used by another source',
      detail = existing_idempotency_source_type || ':' || existing_idempotency_source_id::text;
  end if;

  next_balance_numeric := account_balance::numeric + entry_amount::numeric;
  if next_balance_numeric < 0 then
    raise exception using errcode = '22003', message = 'Insufficient Favor balance';
  end if;
  if next_balance_numeric > 9007199254740991 then
    raise exception using
      errcode = '22003',
      message = 'Favor balance exceeds JavaScript safe integer range';
  end if;
  next_balance := next_balance_numeric::bigint;

  insert into public.currency_ledger (
    user_id,
    currency_key,
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
    'favor',
    entry_amount,
    next_balance,
    entry_source_type,
    entry_source_id,
    entry_idempotency_key,
    entry_metadata,
    entry_created_at
  );

  update public.currency_accounts
  set balance = next_balance,
      updated_at = entry_created_at
  where user_id = entry_user_id
    and currency_key = 'favor';

  perform private.sync_favor_mirror(entry_user_id, next_balance);

  return pg_catalog.jsonb_build_object(
    'replayed', false,
    'favor', pg_catalog.jsonb_build_object(
      'delta', entry_amount,
      'balance', next_balance
    )
  );
end;
$$;

create or replace function public.perform_portal_favor_action(
  action_key text,
  source_id uuid,
  option_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  locked_user_id uuid;
  requested_action text := pg_catalog.lower(pg_catalog.btrim(action_key));
  requested_source_id uuid := source_id;
  cleaned_option_key text := nullif(pg_catalog.btrim(option_key), '');
  actor_key text;
  portal_reward integer;
  portal_row_id uuid;
  portal_row_user_id uuid;
  portal_row_data jsonb;
  parent_id_text text;
  next_actor_values jsonb;
  next_poll_options jsonb;
  next_portal_data jsonb;
  matching_option_count integer := 0;
  actor_already_voted boolean := false;
  source_is_historical boolean := false;
  should_award boolean := true;
  mark_source_without_award boolean := false;
  action_replayed boolean := false;
  portal_idempotency_hash text;
  portal_idempotency_key uuid;
  action_result jsonb;
  result_delta bigint;
  result_balance bigint;
  previous_balance bigint;
  previous_rank jsonb;
  current_rank jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if source_id is null then
    raise exception using errcode = '22023', message = 'Favor action source is required';
  end if;

  portal_reward := case requested_action
    when 'submit-post' then 5
    when 'post-blessing' then 8
    when 'blessing-comment' then 3
    when 'reliquary-comment' then 3
    when 'praise-blessing' then 1
    when 'praise-idea' then 1
    when 'vote-poll' then 2
    else null
  end;

  if portal_reward is null then
    raise exception using errcode = '22023', message = 'Unknown Favor action';
  end if;
  if requested_action = 'vote-poll' then
    if cleaned_option_key is null or pg_catalog.length(cleaned_option_key) > 128 then
      raise exception using errcode = '22023', message = 'Poll option is required';
    end if;
  elsif cleaned_option_key is not null then
    raise exception using errcode = '22023', message = 'Option is not valid for this Favor action';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = caller_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  actor_key := 'user:' || caller_id::text;

  if requested_action = 'submit-post' then
    select post_row.id, post_row.user_id, post_row.data
    into
      portal_row_id,
      portal_row_user_id,
      portal_row_data
    from public.community_posts as post_row
    where post_row.id = source_id
    for update;

    if portal_row_id is null
      or portal_row_user_id is distinct from caller_id then
      raise exception using errcode = '22023', message = 'Invalid submitted post source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid submitted post source';
    end if;
    if pg_catalog.length(pg_catalog.btrim(coalesce(portal_row_data ->> 'title', ''))) = 0
      or coalesce(portal_row_data ->> 'type', '')
        not in ('idea', 'poll', 'feedback', 'update') then
      raise exception using errcode = '22023', message = 'Invalid submitted post source';
    end if;
  elsif requested_action = 'post-blessing' then
    select blessing_row.id, blessing_row.user_id, blessing_row.data
    into
      portal_row_id,
      portal_row_user_id,
      portal_row_data
    from public.blessings as blessing_row
    where blessing_row.id = source_id
    for update;

    if portal_row_id is null
      or portal_row_user_id is distinct from caller_id then
      raise exception using errcode = '22023', message = 'Invalid blessing source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid blessing source';
    end if;
    if pg_catalog.length(pg_catalog.btrim(coalesce(portal_row_data ->> 'title', ''))) = 0 then
      raise exception using errcode = '22023', message = 'Invalid blessing source';
    end if;
  elsif requested_action = 'blessing-comment' then
    select comment_row.id, comment_row.user_id, comment_row.data
    into
      portal_row_id,
      portal_row_user_id,
      portal_row_data
    from public.blessing_comments as comment_row
    where comment_row.id = source_id
    for update;

    if portal_row_id is null
      or portal_row_user_id is distinct from caller_id then
      raise exception using errcode = '22023', message = 'Invalid blessing comment source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid blessing comment source';
    end if;
    if pg_catalog.length(
      pg_catalog.btrim(coalesce(portal_row_data ->> 'message', ''))
    ) = 0 then
      raise exception using errcode = '22023', message = 'Invalid blessing comment source';
    end if;

    parent_id_text := portal_row_data ->> 'blessing_id';
    if parent_id_text is null
      or parent_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'Invalid blessing comment source';
    end if;
    if not exists (
      select 1
      from public.blessings as parent_blessing
      where parent_blessing.id = parent_id_text::uuid
    ) then
      raise exception using errcode = '22023', message = 'Invalid blessing comment source';
    end if;
  elsif requested_action = 'reliquary-comment' then
    select comment_row.id, comment_row.user_id, comment_row.data
    into
      portal_row_id,
      portal_row_user_id,
      portal_row_data
    from public.reliquary_comments as comment_row
    where comment_row.id = source_id
    for update;

    if portal_row_id is null
      or portal_row_user_id is distinct from caller_id then
      raise exception using errcode = '22023', message = 'Invalid reliquary comment source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid reliquary comment source';
    end if;
    if pg_catalog.length(
      pg_catalog.btrim(coalesce(portal_row_data ->> 'message', ''))
    ) = 0 then
      raise exception using errcode = '22023', message = 'Invalid reliquary comment source';
    end if;

    parent_id_text := portal_row_data ->> 'entry_id';
    if parent_id_text is null
      or parent_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'Invalid reliquary comment source';
    end if;
    if not exists (
      select 1
      from public.reliquary_entries as parent_entry
      where parent_entry.id = parent_id_text::uuid
    ) then
      raise exception using errcode = '22023', message = 'Invalid reliquary comment source';
    end if;
  elsif requested_action in ('praise-blessing', 'praise-idea') then
    if requested_action = 'praise-blessing' then
      select blessing_row.id, blessing_row.user_id, blessing_row.data
      into
        portal_row_id,
        portal_row_user_id,
        portal_row_data
      from public.blessings as blessing_row
      where blessing_row.id = source_id
      for update;
    else
      select post_row.id, post_row.user_id, post_row.data
      into
        portal_row_id,
        portal_row_user_id,
        portal_row_data
      from public.community_posts as post_row
      where post_row.id = source_id
      for update;
    end if;

    if portal_row_id is null then
      raise exception using errcode = '22023', message = 'Invalid praise source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid praise source';
    end if;
    if requested_action = 'praise-idea'
      and coalesce(portal_row_data ->> 'type', '')
        not in ('idea', 'feedback', 'update') then
      raise exception using errcode = '22023', message = 'Invalid praise source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data -> 'upvoted_by'), 'null')
      <> 'array' then
      raise exception using errcode = '22023', message = 'Invalid praise source';
    end if;
    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        portal_row_data -> 'upvoted_by'
      ) as voter(value)
      where pg_catalog.jsonb_typeof(voter.value) <> 'string'
    ) then
      raise exception using errcode = '22023', message = 'Invalid praise source';
    end if;

    if portal_row_data -> 'upvoted_by' ? actor_key then
      select coalesce(
        pg_catalog.jsonb_agg(pg_catalog.to_jsonb(voter.value) order by voter.ordinality),
        '[]'::jsonb
      )
      into next_actor_values
      from pg_catalog.jsonb_array_elements_text(
        portal_row_data -> 'upvoted_by'
      ) with ordinality as voter(value, ordinality)
      where voter.value <> actor_key;
      should_award := false;
      mark_source_without_award := true;
    else
      next_actor_values := (
        portal_row_data -> 'upvoted_by'
      ) || pg_catalog.to_jsonb(actor_key);
    end if;

    next_portal_data := pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        portal_row_data,
        '{upvoted_by}',
        next_actor_values,
        true
      ),
      '{upvotes}',
      pg_catalog.to_jsonb(pg_catalog.jsonb_array_length(next_actor_values)),
      true
    );

    if requested_action = 'praise-blessing' then
      update public.blessings
      set data = next_portal_data
      where id = source_id;
    else
      update public.community_posts
      set data = next_portal_data
      where id = source_id;
    end if;
  elsif requested_action = 'vote-poll' then
    select post_row.id, post_row.user_id, post_row.data
    into
      portal_row_id,
      portal_row_user_id,
      portal_row_data
    from public.community_posts as post_row
    where post_row.id = source_id
    for update;

    if portal_row_id is null then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data), 'null') <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if coalesce(portal_row_data ->> 'type', '') <> 'poll' then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if coalesce(pg_catalog.jsonb_typeof(portal_row_data -> 'poll_options'), 'null')
      <> 'array' then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if pg_catalog.jsonb_array_length(portal_row_data -> 'poll_options') = 0 then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        portal_row_data -> 'poll_options'
      ) as option(value)
      where pg_catalog.jsonb_typeof(option.value) <> 'object'
    ) then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        portal_row_data -> 'poll_options'
      ) as option(value)
      where pg_catalog.length(
        pg_catalog.btrim(coalesce(option.value ->> 'id', ''))
      ) = 0
        or coalesce(option.value ->> 'votes', '') !~ '^[0-9]+$'
        or coalesce(
          pg_catalog.jsonb_typeof(option.value -> 'voted_by'),
          'null'
        ) <> 'array'
    ) then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;
    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        portal_row_data -> 'poll_options'
      ) as option(value)
      cross join lateral pg_catalog.jsonb_array_elements(
        option.value -> 'voted_by'
      ) as voter(value)
      where pg_catalog.jsonb_typeof(voter.value) <> 'string'
    ) then
      raise exception using errcode = '22023', message = 'Invalid poll source';
    end if;

    select pg_catalog.count(*)::integer
    into matching_option_count
    from pg_catalog.jsonb_array_elements(portal_row_data -> 'poll_options') as option(value)
    where option.value ->> 'id' = cleaned_option_key;

    if matching_option_count <> 1 then
      raise exception using errcode = '22023', message = 'Poll option not found';
    end if;

    select exists (
      select 1
      from pg_catalog.jsonb_array_elements(portal_row_data -> 'poll_options') as option(value)
      cross join lateral pg_catalog.jsonb_array_elements_text(
        option.value -> 'voted_by'
      ) as voter(value)
      where voter.value = actor_key
    )
    into actor_already_voted;

    if actor_already_voted then
      should_award := false;
      mark_source_without_award := true;
      action_replayed := true;
    else
      select pg_catalog.jsonb_agg(
        case
          when option.value ->> 'id' = cleaned_option_key then
            pg_catalog.jsonb_set(
              pg_catalog.jsonb_set(
                option.value,
                '{voted_by}',
                (option.value -> 'voted_by') || pg_catalog.to_jsonb(actor_key),
                true
              ),
              '{votes}',
              pg_catalog.to_jsonb(
                pg_catalog.jsonb_array_length(
                  (option.value -> 'voted_by') || pg_catalog.to_jsonb(actor_key)
                )
              ),
              true
            )
          else option.value
        end
        order by option.ordinality
      )
      into next_poll_options
      from pg_catalog.jsonb_array_elements(
        portal_row_data -> 'poll_options'
      ) with ordinality as option(value, ordinality);

      next_portal_data := pg_catalog.jsonb_set(
        portal_row_data,
        '{poll_options}',
        next_poll_options,
        true
      );

      update public.community_posts
      set data = next_portal_data
      where id = source_id;
    end if;
  end if;

  select exists (
    select 1
    from private.favor_gateway_historical_sources as historical
    where historical.action_key = requested_action
      and historical.source_id = requested_source_id
  )
  into source_is_historical;

  if source_is_historical then
    should_award := false;
    mark_source_without_award := true;
  end if;

  portal_idempotency_hash := pg_catalog.md5(
    'portal-favor:'
    || caller_id::text
    || ':' || requested_action
    || ':' || source_id::text
  );
  portal_idempotency_key := (
    pg_catalog.substr(portal_idempotency_hash, 1, 8)
    || '-' || pg_catalog.substr(portal_idempotency_hash, 9, 4)
    || '-' || pg_catalog.substr(portal_idempotency_hash, 13, 4)
    || '-' || pg_catalog.substr(portal_idempotency_hash, 17, 4)
    || '-' || pg_catalog.substr(portal_idempotency_hash, 21, 12)
  )::uuid;

  if should_award then
    action_result := private.post_favor_entry(
      caller_id,
      portal_reward,
      requested_action,
      source_id,
      portal_idempotency_key,
      pg_catalog.jsonb_build_object(
        'action_key', requested_action,
        'option_key', cleaned_option_key
      )
    );
  elsif mark_source_without_award then
    action_result := private.post_favor_entry(
      caller_id,
      0,
      requested_action,
      source_id,
      portal_idempotency_key,
      pg_catalog.jsonb_build_object(
        'legacy_source_marker', true,
        'historical_source_snapshot', source_is_historical,
        'action_key', requested_action,
        'option_key', cleaned_option_key
      )
    );
    if action_replayed then
      action_result := pg_catalog.jsonb_set(
        action_result,
        '{replayed}',
        'true'::jsonb,
        false
      );
    end if;
  else
    result_balance := private.ensure_favor_account(caller_id);
    action_result := pg_catalog.jsonb_build_object(
      'replayed', action_replayed,
      'favor', pg_catalog.jsonb_build_object(
        'delta', 0,
        'balance', result_balance
      )
    );
  end if;

  result_delta := (action_result #>> '{favor,delta}')::bigint;
  result_balance := (action_result #>> '{favor,balance}')::bigint;
  previous_balance := result_balance - result_delta;
  previous_rank := private.favor_rank(previous_balance);
  current_rank := private.favor_rank(result_balance);

  return action_result || pg_catalog.jsonb_build_object(
    'rank',
    pg_catalog.jsonb_build_object(
      'previous', previous_rank,
      'current', current_rank,
      'leveled_up',
      (current_rank ->> 'min')::integer > (previous_rank ->> 'min')::integer
    )
  );
end;
$$;

create or replace function public.start_starfishing_cast()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  locked_user_id uuid;
  cast_created_at timestamptz;
  cast_ticket_id uuid := pg_catalog.gen_random_uuid();
  cast_not_before timestamptz;
  cast_expires_at timestamptz;
  cast_size numeric(8,2);
  cast_size_floor numeric;
  cast_applied_effects jsonb := '[]'::jsonb;
  favor_multiplier_bps integer := 0;
  material_multiplier_bps integer := 0;
  rare_bite_bonus_bps integer := 0;
  size_floor_bps integer := 0;
  existing_ticket public.game_cast_tickets%rowtype;
  existing_qte_length smallint;
  selected_fish public.game_fish_catalog%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = caller_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  perform 1
  from public.game_cast_tickets as prior_ticket
  where prior_ticket.user_id = caller_id
    and prior_ticket.consumed_at is null
  for update;

  cast_created_at := pg_catalog.clock_timestamp();

  select ticket_row, fish_row.qte_length
  into existing_ticket, existing_qte_length
  from public.game_cast_tickets as ticket_row
  left join public.game_fish_catalog as fish_row
    on fish_row.fish_key = ticket_row.fish_key
    and fish_row.catalog_version = ticket_row.catalog_version
  where ticket_row.user_id = caller_id
    and ticket_row.consumed_at is null
    and ticket_row.expires_at > cast_created_at
  order by ticket_row.created_at
  limit 1
  for update of ticket_row;

  if existing_ticket.id is not null and existing_qte_length is null then
    raise exception using errcode = '22023', message = 'Existing cast ticket catalog version is unavailable';
  end if;

  if existing_ticket.id is not null then
    return pg_catalog.jsonb_build_object(
      'ticket_id', existing_ticket.id,
      'fish_key', existing_ticket.fish_key,
      'qte_length', existing_qte_length,
      'applied_effects', existing_ticket.applied_effects,
      'not_before', existing_ticket.not_before,
      'expires_at', existing_ticket.expires_at
    );
  end if;

  update public.game_cast_tickets
  set consumed_at = cast_created_at
  where user_id = caller_id
    and consumed_at is null
    and expires_at <= cast_created_at;

  select
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,favor_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,favor_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,material_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,material_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,rare_bite_bonus_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,rare_bite_bonus_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(1000, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,size_floor_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,size_floor_bps}')::numeric
        else 0
      end
    ), 0))::integer
  into
    favor_multiplier_bps,
    material_multiplier_bps,
    rare_bite_bonus_bps,
    size_floor_bps
  from public.user_relic_charms as charm
  join public.user_achievements as unlocked
    on unlocked.user_id = charm.user_id
    and unlocked.achievement_key = charm.data #>> '{source,key}'
  join public.achievement_catalog as achievement
    on achievement.achievement_key = unlocked.achievement_key
  where charm.user_id = caller_id
    and charm.data ->> 'equipped' = 'true'
    and charm.data #>> '{source,type}' = 'achievement'
    and charm.data ->> 'charm_key' = achievement.reward ->> 'charm_key'
    and achievement.active
    and achievement.reward ->> 'kind' = 'charm'
    and achievement.reward ->> 'slot' = 'fishing';

  if rare_bite_bonus_bps > 0 then
    cast_applied_effects := cast_applied_effects || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'rare_bite_bonus_bps',
        'value', rare_bite_bonus_bps,
        'label', pg_catalog.to_char(
          rare_bite_bonus_bps::numeric / 100,
          'FM999990.##'
        ) || '% non-mythic rarity weighting'
      )
    );
  end if;

  if size_floor_bps > 0 then
    cast_applied_effects := cast_applied_effects || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'size_floor_bps',
        'value', size_floor_bps,
        'label', '+' || (size_floor_bps::numeric / 100)::text || '% minimum fish size'
      )
    );
  end if;

  with weighted_fish as (
    select
      fish.*,
      fish.rarity_weight::numeric
        * (
          10000
          + case fish.rarity
            when 'common' then -rare_bite_bonus_bps
            when 'uncommon' then rare_bite_bonus_bps / 4
            when 'rare' then rare_bite_bonus_bps / 2
            when 'epic' then rare_bite_bonus_bps
            when 'mythic' then 0
          end
        )
        / 10000 as effective_weight
    from public.game_fish_catalog as fish
    where fish.active
  ),
  ranked_fish as (
    select
      weighted_fish.*,
      pg_catalog.sum(effective_weight) over (order by fish_key) as cumulative_weight,
      pg_catalog.sum(effective_weight) over () as total_weight
    from weighted_fish
  ),
  cast_roll as (
    select pg_catalog.random() * pg_catalog.max(total_weight) as target_weight
    from ranked_fish
  )
  select
    ranked_fish.fish_key,
    ranked_fish.label,
    ranked_fish.rarity,
    ranked_fish.min_size,
    ranked_fish.max_size,
    ranked_fish.qte_length,
    ranked_fish.base_favor,
    ranked_fish.material_drops,
    ranked_fish.rarity_weight,
    ranked_fish.active,
    ranked_fish.catalog_version,
    ranked_fish.created_at,
    ranked_fish.updated_at
  into selected_fish
  from ranked_fish
  cross join cast_roll
  where ranked_fish.cumulative_weight >= cast_roll.target_weight
  order by ranked_fish.cumulative_weight
  limit 1;

  if selected_fish.fish_key is null then
    raise exception using errcode = '55000', message = 'No active Starfishing fish are available';
  end if;

  cast_size_floor := selected_fish.min_size
    + ((selected_fish.max_size - selected_fish.min_size) * size_floor_bps / 10000);
  cast_size := pg_catalog.round(
    (
      cast_size_floor
      + pg_catalog.random() * (selected_fish.max_size - cast_size_floor)
    )::numeric,
    2
  );
  cast_not_before := cast_created_at
    + interval '1200 milliseconds'
    + (selected_fish.qte_length * interval '150 milliseconds');
  cast_expires_at := cast_created_at + interval '10 minutes';

  insert into public.game_cast_tickets (
    id,
    user_id,
    fish_key,
    catalog_version,
    authoritative_size,
    applied_effects,
    not_before,
    expires_at,
    created_at
  )
  values (
    cast_ticket_id,
    caller_id,
    selected_fish.fish_key,
    selected_fish.catalog_version,
    cast_size,
    cast_applied_effects,
    cast_not_before,
    cast_expires_at,
    cast_created_at
  );

  return pg_catalog.jsonb_build_object(
    'ticket_id', cast_ticket_id,
    'fish_key', selected_fish.fish_key,
    'qte_length', selected_fish.qte_length,
    'applied_effects', cast_applied_effects,
    'not_before', cast_not_before,
    'expires_at', cast_expires_at
  );
end;
$$;

create or replace function public.claim_starfishing_catch(
  claim_ticket_id uuid,
  claim_idempotency_key uuid,
  claim_duplicate_policy text,
  claim_qte_action_count integer,
  claim_miss_count integer,
  claim_duration_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  transport_safe_max constant bigint := 9007199254740991;
  caller_id uuid := (select auth.uid());
  requested_idempotency_key uuid := claim_idempotency_key;
  locked_user_id uuid;
  claim_created_at timestamptz;
  claim_catch_id uuid := pg_catalog.gen_random_uuid();
  existing_result_snapshot jsonb;
  claim_result_snapshot jsonb;
  claim_ticket public.game_cast_tickets%rowtype;
  claim_fish public.game_fish_catalog%rowtype;
  claim_min_duration_ms integer;
  claim_max_duration_ms integer;
  existing_fishpedia public.user_fishpedia%rowtype;
  claim_duplicate boolean;
  effective_duplicate_policy text;
  favor_multiplier_bps integer := 0;
  material_multiplier_bps integer := 0;
  rare_bite_bonus_bps integer := 0;
  size_floor_bps integer := 0;
  claim_applied_effects jsonb := '[]'::jsonb;
  base_favor_delta integer := 0;
  favor_delta bigint := 0;
  favor_balance bigint := 0;
  prior_favor_balance bigint := 0;
  favor_entry_result jsonb;
  base_material_drops jsonb := '[]'::jsonb;
  material_results jsonb := '[]'::jsonb;
  material_reward record;
  material_result jsonb;
  material_delta bigint;
  material_balance bigint;
  previous_material_balance bigint;
  next_caught_count integer;
  next_smallest_size numeric(8,2);
  next_largest_size numeric(8,2);
  next_first_caught_at timestamptz;
  discovered_count integer;
  catalog_count integer;
  completion_percent integer;
  total_catch_count bigint;
  has_duplicate_release boolean;
  has_lowest_five_percent boolean;
  has_mythic_catch boolean;
  achievement_results jsonb := '[]'::jsonb;
  pending_charm_rewards jsonb := '[]'::jsonb;
  charm_results jsonb := '[]'::jsonb;
  achievement_result jsonb;
  charm_reward jsonb;
  charm_insert_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if claim_ticket_id is null or claim_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Ticket and idempotency keys are required';
  end if;
  if claim_duplicate_policy is null
    or claim_duplicate_policy not in ('keep', 'release', 'convert') then
    raise exception using errcode = '22023', message = 'Invalid duplicate policy';
  end if;
  if claim_qte_action_count is null
    or claim_qte_action_count < 0
    or claim_qte_action_count > 16 then
    raise exception using errcode = '22023', message = 'Invalid QTE action count';
  end if;
  if claim_miss_count is null or claim_miss_count < 0 or claim_miss_count > 16 then
    raise exception using errcode = '22023', message = 'Invalid QTE miss count';
  end if;
  if claim_duration_ms is null or claim_duration_ms < 0 or claim_duration_ms > 600000 then
    raise exception using errcode = '22023', message = 'Invalid claim duration';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = caller_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select catch_row.result_snapshot
  into existing_result_snapshot
  from public.game_catches as catch_row
  where catch_row.user_id = caller_id
    and catch_row.idempotency_key = requested_idempotency_key;

  if existing_result_snapshot is not null then
    return pg_catalog.jsonb_set(
      existing_result_snapshot,
      '{replayed}',
      'true'::jsonb,
      false
    );
  end if;

  select ticket_row.*
  into claim_ticket
  from public.game_cast_tickets as ticket_row
  where ticket_row.id = claim_ticket_id
  for update;

  claim_created_at := pg_catalog.clock_timestamp();

  if claim_ticket.id is null then
    raise exception using errcode = '22023', message = 'Cast ticket not found';
  end if;
  if claim_ticket.user_id <> caller_id then
    raise exception using errcode = '42501', message = 'Cast ticket does not belong to caller';
  end if;
  if claim_ticket.consumed_at is not null then
    raise exception using errcode = '22023', message = 'Cast ticket already consumed';
  end if;
  if claim_created_at >= claim_ticket.expires_at then
    raise exception using errcode = '22023', message = 'Cast ticket expired';
  end if;
  if claim_created_at < claim_ticket.not_before then
    raise exception using errcode = '22023', message = 'Catch claim is too early';
  end if;

  select fish_row.*
  into claim_fish
  from public.game_fish_catalog as fish_row
  where fish_row.fish_key = claim_ticket.fish_key
    and fish_row.catalog_version = claim_ticket.catalog_version;

  if claim_fish.fish_key is null then
    raise exception using errcode = '22023', message = 'Cast ticket catalog version is unavailable';
  end if;

  claim_min_duration_ms := pg_catalog.ceil(
    pg_catalog.extract(epoch from (claim_ticket.not_before - claim_ticket.created_at)) * 1000
  )::integer;
  claim_max_duration_ms := least(
    600000,
    pg_catalog.floor(
      pg_catalog.extract(epoch from (claim_ticket.expires_at - claim_ticket.created_at)) * 1000
    )::integer
  );

  -- Browser telemetry is supporting evidence, not cryptographic anti-cheat.
  -- It must still describe a complete, zero-miss QTE coherent with this server ticket.
  if claim_qte_action_count <> claim_fish.qte_length then
    raise exception using errcode = '22023', message = 'QTE action count does not match cast ticket';
  end if;
  if claim_miss_count <> 0 then
    raise exception using errcode = '22023', message = 'QTE misses are not eligible for a catch';
  end if;
  if claim_duration_ms < claim_min_duration_ms
    or claim_duration_ms > claim_max_duration_ms then
    raise exception using errcode = '22023', message = 'Claim duration is not plausible for cast ticket';
  end if;

  select fishpedia_row.*
  into existing_fishpedia
  from public.user_fishpedia as fishpedia_row
  where fishpedia_row.user_id = caller_id
    and fishpedia_row.fish_key = claim_ticket.fish_key
  for update;

  claim_duplicate := existing_fishpedia.user_id is not null;
  effective_duplicate_policy := case
    when claim_duplicate then claim_duplicate_policy
    else 'none'
  end;

  select
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,favor_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,favor_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(2500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,material_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,material_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(500, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,rare_bite_bonus_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,rare_bite_bonus_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(1000, coalesce(pg_catalog.sum(
      case
        when achievement.reward #>> '{effects,size_floor_bps}' ~ '^[0-9]{1,9}$'
          then (achievement.reward #>> '{effects,size_floor_bps}')::numeric
        else 0
      end
    ), 0))::integer
  into
    favor_multiplier_bps,
    material_multiplier_bps,
    rare_bite_bonus_bps,
    size_floor_bps
  from public.user_relic_charms as charm
  join public.user_achievements as unlocked
    on unlocked.user_id = charm.user_id
    and unlocked.achievement_key = charm.data #>> '{source,key}'
  join public.achievement_catalog as achievement
    on achievement.achievement_key = unlocked.achievement_key
  where charm.user_id = caller_id
    and charm.data ->> 'equipped' = 'true'
    and charm.data #>> '{source,type}' = 'achievement'
    and charm.data ->> 'charm_key' = achievement.reward ->> 'charm_key'
    and achievement.active
    and achievement.reward ->> 'kind' = 'charm'
    and achievement.reward ->> 'slot' = 'fishing';

  claim_applied_effects := claim_ticket.applied_effects;
  if favor_multiplier_bps > 0 then
    claim_applied_effects := claim_applied_effects || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'favor_multiplier_bps',
        'value', favor_multiplier_bps,
        'label', '+' || (favor_multiplier_bps::numeric / 100)::text || '% catch Favor'
      )
    );
  end if;
  if material_multiplier_bps > 0 then
    claim_applied_effects := claim_applied_effects || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'material_multiplier_bps',
        'value', material_multiplier_bps,
        'label', '+' || (material_multiplier_bps::numeric / 100)::text || '% materials'
      )
    );
  end if;

  if not claim_duplicate then
    base_favor_delta := claim_fish.base_favor;
    base_material_drops := claim_fish.material_drops;
  elsif effective_duplicate_policy = 'release' then
    base_favor_delta := case claim_fish.rarity
      when 'common' then 2
      when 'uncommon' then 4
      when 'rare' then 7
      when 'epic' then 12
      when 'mythic' then 20
    end;
  elsif effective_duplicate_policy = 'convert' then
    base_material_drops := pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'star-dust',
        'label', 'Star Dust',
        'quantity', case claim_fish.rarity
          when 'common' then 1
          when 'uncommon' then 2
          when 'rare' then 4
          when 'epic' then 7
          when 'mythic' then 12
        end,
        'type', 'material'
      )
    );
  end if;

  favor_delta := pg_catalog.round(
    base_favor_delta::numeric * (10000 + favor_multiplier_bps) / 10000
  )::bigint;

  for material_reward in
    select
      material.value ->> 'key' as material_key,
      pg_catalog.max(material.value ->> 'label') as material_label,
      pg_catalog.sum((material.value ->> 'quantity')::integer) as base_quantity
    from pg_catalog.jsonb_array_elements(base_material_drops) as material(value)
    where material.value ->> 'key' ~ '^[a-z0-9-]+$'
      and material.value ->> 'quantity' ~ '^[1-9][0-9]{0,8}$'
    group by material.value ->> 'key'
    order by material.value ->> 'key'
  loop
    material_delta := pg_catalog.round(
      material_reward.base_quantity::numeric * (10000 + material_multiplier_bps) / 10000
    )::bigint;

    select balance_row.balance
    into previous_material_balance
    from public.user_material_balances as balance_row
    where balance_row.user_id = caller_id
      and balance_row.material_key = material_reward.material_key
    for update;

    if not found then
      previous_material_balance := 0;
    end if;
    if previous_material_balance > transport_safe_max - material_delta then
      raise exception using
        errcode = '22003',
        message = 'Material balance exceeds JavaScript safe integer range';
    end if;
    material_balance := previous_material_balance + material_delta;
    material_results := material_results || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', material_reward.material_key,
        'label', coalesce(material_reward.material_label, material_reward.material_key),
        'delta', material_delta,
        'balance', material_balance
      )
    );
  end loop;

  prior_favor_balance := private.ensure_favor_account(caller_id);
  favor_balance := prior_favor_balance;
  if favor_delta > 0 then
    favor_entry_result := private.post_favor_entry(
      caller_id,
      favor_delta,
      'starfishing_catch',
      claim_catch_id,
      requested_idempotency_key,
      pg_catalog.jsonb_build_object(
        'fish_key', claim_fish.fish_key,
        'duplicate_policy', effective_duplicate_policy
      )
    );
    favor_balance := (favor_entry_result #>> '{favor,balance}')::bigint;
  end if;

  if claim_duplicate then
    next_caught_count := existing_fishpedia.caught_count + 1;
    next_smallest_size := least(existing_fishpedia.smallest_size, claim_ticket.authoritative_size);
    next_largest_size := greatest(existing_fishpedia.largest_size, claim_ticket.authoritative_size);
    next_first_caught_at := existing_fishpedia.first_caught_at;
  else
    next_caught_count := 1;
    next_smallest_size := claim_ticket.authoritative_size;
    next_largest_size := claim_ticket.authoritative_size;
    next_first_caught_at := claim_created_at;
  end if;

  select pg_catalog.count(*)::integer
  into discovered_count
  from public.user_fishpedia as fishpedia_row
  join public.game_fish_catalog as active_fish
    on active_fish.fish_key = fishpedia_row.fish_key
    and active_fish.active
  where fishpedia_row.user_id = caller_id;
  if not claim_duplicate and claim_fish.active then
    discovered_count := discovered_count + 1;
  end if;

  select pg_catalog.count(*)::integer
  into catalog_count
  from public.game_fish_catalog as fish_row
  where fish_row.active;

  completion_percent := case
    when catalog_count = 0 then 0
    else least(
      100,
      greatest(
        0,
        pg_catalog.round(discovered_count::numeric * 100 / catalog_count)::integer
      )
    )
  end;

  select pg_catalog.count(*) + 1
  into total_catch_count
  from public.game_catches as catch_row
  where catch_row.user_id = caller_id;

  has_duplicate_release := (
    claim_duplicate and effective_duplicate_policy = 'release'
  ) or exists (
    select 1
    from public.game_catches as catch_row
    where catch_row.user_id = caller_id
      and catch_row.duplicate
      and catch_row.duplicate_policy = 'release'
  );
  has_lowest_five_percent := (
    claim_ticket.authoritative_size
      <= claim_fish.min_size + ((claim_fish.max_size - claim_fish.min_size) * 0.05)
  ) or exists (
    select 1
    from public.game_catches as catch_row
    join public.game_fish_catalog as fish_row
      on fish_row.fish_key = catch_row.fish_key
    where catch_row.user_id = caller_id
      and catch_row.size
        <= fish_row.min_size + ((fish_row.max_size - fish_row.min_size) * 0.05)
  );
  has_mythic_catch := claim_fish.rarity = 'mythic' or exists (
    select 1
    from public.game_catches as catch_row
    where catch_row.user_id = caller_id
      and catch_row.rarity = 'mythic'
  );

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'achievement_key', achievement.achievement_key,
        'title', achievement.title,
        'description', achievement.description
      )
      order by achievement.achievement_key
    ),
    '[]'::jsonb
  )
  into achievement_results
  from public.achievement_catalog as achievement
  where achievement.active
    and not exists (
      select 1
      from public.user_achievements as unlocked
      where unlocked.user_id = caller_id
        and unlocked.achievement_key = achievement.achievement_key
    )
    and case achievement.achievement_key
      when 'first-light' then total_catch_count >= 1
      when 'gentle-return' then has_duplicate_release
      when 'pocket-constellation' then has_lowest_five_percent
      when 'myth-in-moonwater' then has_mythic_catch
      when 'celestial-archivist' then discovered_count >= catalog_count and catalog_count > 0
      when 'hundred-lights' then total_catch_count >= 100
      else false
    end;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'achievement_key', achievement.achievement_key,
        'charm_key', achievement.reward ->> 'charm_key',
        'label', achievement.reward ->> 'label',
        'rarity', achievement.reward ->> 'rarity',
        'slot', achievement.reward ->> 'slot',
        'effects', coalesce(achievement.reward -> 'effects', '{}'::jsonb)
      )
      order by achievement.achievement_key
    ),
    '[]'::jsonb
  )
  into pending_charm_rewards
  from public.achievement_catalog as achievement
  where achievement.reward ->> 'kind' = 'charm'
    and (
      exists (
        select 1
        from public.user_achievements as unlocked
        where unlocked.user_id = caller_id
          and unlocked.achievement_key = achievement.achievement_key
      )
      or achievement.achievement_key in (
        select unlocked.value ->> 'achievement_key'
        from pg_catalog.jsonb_array_elements(achievement_results) as unlocked(value)
      )
    )
    and not exists (
      select 1
      from public.user_relic_charms as owned_charm
      where owned_charm.user_id = caller_id
        and owned_charm.data #>> '{source,type}' = 'achievement'
        and owned_charm.data #>> '{source,key}' = achievement.achievement_key
    );

  for charm_reward in
    select reward.value
    from pg_catalog.jsonb_array_elements(pending_charm_rewards) as reward(value)
  loop
    charm_insert_result := null;

    insert into public.user_relic_charms as inserted_charm (
      id,
      user_id,
      created_by,
      data,
      created_at,
      updated_at
    )
    values (
      pg_catalog.gen_random_uuid(),
      caller_id,
      'starfishing',
      pg_catalog.jsonb_build_object(
        'charm_key', charm_reward ->> 'charm_key',
        'name', charm_reward ->> 'label',
        'label', charm_reward ->> 'label',
        'rarity', charm_reward ->> 'rarity',
        'slot', charm_reward ->> 'slot',
        'effects', charm_reward -> 'effects',
        'equipped', false,
        'acquired_at', claim_created_at,
        'source', pg_catalog.jsonb_build_object(
          'type',
          'achievement',
          'key',
          charm_reward ->> 'achievement_key'
        )
      ),
      claim_created_at,
      claim_created_at
    )
    on conflict do nothing
    returning pg_catalog.jsonb_build_object(
      'id', inserted_charm.id,
      'charm_key', inserted_charm.data ->> 'charm_key',
      'label', inserted_charm.data ->> 'label',
      'rarity', inserted_charm.data ->> 'rarity',
      'slot', inserted_charm.data ->> 'slot',
      'effects', inserted_charm.data -> 'effects',
      'equipped', (inserted_charm.data ->> 'equipped')::boolean,
      'acquired_at', inserted_charm.created_at,
      'source', inserted_charm.data -> 'source'
    )
    into charm_insert_result;

    if charm_insert_result is null then
      select pg_catalog.jsonb_build_object(
        'id', owned_charm.id,
        'charm_key', owned_charm.data ->> 'charm_key',
        'label', owned_charm.data ->> 'label',
        'rarity', owned_charm.data ->> 'rarity',
        'slot', owned_charm.data ->> 'slot',
        'effects', owned_charm.data -> 'effects',
        'equipped', (owned_charm.data ->> 'equipped')::boolean,
        'acquired_at', owned_charm.created_at,
        'source', owned_charm.data -> 'source'
      )
      into charm_insert_result
      from public.user_relic_charms as owned_charm
      where owned_charm.user_id = caller_id
        and owned_charm.data #>> '{source,type}' = 'achievement'
        and owned_charm.data #>> '{source,key}' = charm_reward ->> 'achievement_key'
      order by owned_charm.created_at, owned_charm.id
      limit 1;
    end if;

    if charm_insert_result is not null then
      charm_results := charm_results || pg_catalog.jsonb_build_array(charm_insert_result);
    end if;
  end loop;

  claim_result_snapshot := pg_catalog.jsonb_build_object(
    'catch', pg_catalog.jsonb_build_object(
      'id', claim_catch_id,
      'fish_key', claim_fish.fish_key,
      'label', claim_fish.label,
      'rarity', claim_fish.rarity,
      'size', claim_ticket.authoritative_size,
      'duplicate', claim_duplicate,
      'duplicate_policy', effective_duplicate_policy,
      'caught_at', claim_created_at
    ),
    'fishpedia', pg_catalog.jsonb_build_object(
      'fish_key', claim_fish.fish_key,
      'caught_count', next_caught_count,
      'smallest_size', next_smallest_size,
      'largest_size', next_largest_size,
      'first_caught_at', next_first_caught_at,
      'last_caught_at', claim_created_at,
      'discovered_count', discovered_count,
      'catalog_count', catalog_count,
      'completion_percent', completion_percent
    ),
    'favor', pg_catalog.jsonb_build_object(
      'delta', favor_delta,
      'balance', favor_balance
    ),
    'materials', material_results,
    'achievements', achievement_results,
    'charms', charm_results,
    'applied_effects', claim_applied_effects,
    'replayed', false
  );

  insert into public.game_catches (
    id,
    user_id,
    fish_key,
    size,
    rarity,
    duplicate,
    duplicate_policy,
    play_evidence,
    idempotency_key,
    result_snapshot,
    created_at
  )
  values (
    claim_catch_id,
    caller_id,
    claim_fish.fish_key,
    claim_ticket.authoritative_size,
    claim_fish.rarity,
    claim_duplicate,
    effective_duplicate_policy,
    pg_catalog.jsonb_build_object(
      'qte_action_count', claim_qte_action_count,
      'miss_count', claim_miss_count,
      'duration_ms', claim_duration_ms
    ),
    requested_idempotency_key,
    claim_result_snapshot,
    claim_created_at
  );

  insert into public.user_fishpedia (
    user_id,
    fish_key,
    caught_count,
    smallest_size,
    largest_size,
    first_caught_at,
    last_caught_at
  )
  values (
    caller_id,
    claim_fish.fish_key,
    next_caught_count,
    next_smallest_size,
    next_largest_size,
    next_first_caught_at,
    claim_created_at
  )
  on conflict (user_id, fish_key) do update
  set
    caught_count = excluded.caught_count,
    smallest_size = excluded.smallest_size,
    largest_size = excluded.largest_size,
    first_caught_at = excluded.first_caught_at,
    last_caught_at = excluded.last_caught_at;

  for material_result in
    select material.value
    from pg_catalog.jsonb_array_elements(material_results) as material(value)
  loop
    insert into public.user_material_balances (
      user_id,
      material_key,
      balance,
      updated_at
    )
    values (
      caller_id,
      material_result ->> 'key',
      (material_result ->> 'balance')::bigint,
      claim_created_at
    )
    on conflict (user_id, material_key) do update
    set balance = excluded.balance,
        updated_at = excluded.updated_at;

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
      caller_id,
      material_result ->> 'key',
      (material_result ->> 'delta')::bigint,
      (material_result ->> 'balance')::bigint,
      'starfishing_catch',
      claim_catch_id,
      requested_idempotency_key,
      pg_catalog.jsonb_build_object(
        'fish_key', claim_fish.fish_key,
        'duplicate_policy', effective_duplicate_policy
      ),
      claim_created_at
    );
  end loop;

  for achievement_result in
    select achievement.value
    from pg_catalog.jsonb_array_elements(achievement_results) as achievement(value)
  loop
    insert into public.user_achievements (
      user_id,
      achievement_key,
      source_catch_id,
      unlocked_at
    )
    values (
      caller_id,
      achievement_result ->> 'achievement_key',
      claim_catch_id,
      claim_created_at
    )
    on conflict (user_id, achievement_key) do nothing;
  end loop;

  insert into public.user_trophies (
    user_id,
    trophy_key,
    source_achievement_key,
    data,
    acquired_at
  )
  select
    caller_id,
    achievement.reward ->> 'trophy_key',
    achievement.achievement_key,
    pg_catalog.jsonb_build_object(
      'label', achievement.title,
      'source', pg_catalog.jsonb_build_object(
        'type',
        'achievement',
        'key',
        achievement.achievement_key
      )
    ),
    claim_created_at
  from public.achievement_catalog as achievement
  where nullif(achievement.reward ->> 'trophy_key', '') is not null
    and (
      exists (
        select 1
        from public.user_achievements as unlocked
        where unlocked.user_id = caller_id
          and unlocked.achievement_key = achievement.achievement_key
      )
      or achievement.achievement_key in (
        select unlocked.value ->> 'achievement_key'
        from pg_catalog.jsonb_array_elements(achievement_results) as unlocked(value)
      )
    )
  on conflict (user_id, trophy_key) do nothing;

  update public.game_cast_tickets
  set consumed_at = claim_created_at,
      claim_id = claim_catch_id
  where id = claim_ticket.id;

  return claim_result_snapshot;
end;
$$;

create or replace function private.assert_relic_forge_open(
  caller_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  gate_enabled boolean := false;
begin
  select profile.role
  into caller_role
  from public.profiles as profile
  where profile.id = caller_id;

  select coalesce(gate.data ->> 'enabled', 'false') = 'true'
  into gate_enabled
  from public.sync_states as gate
  where coalesce(gate.data ->> 'key', gate.data ->> 'name', gate.data ->> 'type') = 'relic_roll_gate'
  order by gate.updated_at desc, gate.id desc
  limit 1
  for share;

  if not coalesce(gate_enabled, false)
    and caller_role not in ('admin', 'lead_mod') then
    raise exception using errcode = '42501', message = 'Relic Forge is closed';
  end if;

  return coalesce(caller_role, 'guest');
end;
$$;

create or replace function public.ensure_user_relic()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  relic_row public.user_relics%rowtype;
  authoritative_favor_spent bigint;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  insert into public.user_relics (
    user_id,
    created_by,
    data
  )
  values (
    caller_id,
    null,
    pg_catalog.jsonb_build_object(
      'name', 'Ashen Promise',
      'base_type', 'lantern',
      'theme', 'celestial',
      'lore', 'Forged from a careful vow that learned to glow before it learned where it was going.',
      'effects', pg_catalog.jsonb_build_array('blue-flame', 'star-orbit'),
      'equipped_charm_ids', '[]'::jsonb,
      'status', 'active',
      'favor_spent', 0
    )
  )
  on conflict (user_id) do nothing;

  select relic.*
  into relic_row
  from public.user_relics as relic
  where relic.user_id = caller_id
  for update;

  if relic_row.id is null then
    raise exception using errcode = 'P0001', message = 'Relic could not be created';
  end if;

  insert into private.relic_forge_investments (
    user_id,
    relic_id,
    favor_invested
  )
  values (
    caller_id,
    relic_row.id,
    0
  )
  on conflict (user_id) do update
  set relic_id = excluded.relic_id;

  select investment.favor_invested
  into authoritative_favor_spent
  from private.relic_forge_investments as investment
  where investment.user_id = caller_id;

  if relic_row.data -> 'favor_spent'
    is distinct from pg_catalog.to_jsonb(authoritative_favor_spent) then
    update public.user_relics
    set data = pg_catalog.jsonb_set(
          data,
          '{favor_spent}',
          pg_catalog.to_jsonb(authoritative_favor_spent),
          true
        ),
        updated_at = pg_catalog.clock_timestamp()
    where id = relic_row.id
    returning * into relic_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'id', relic_row.id,
    'user_id', relic_row.user_id,
    'created_at', relic_row.created_at,
    'updated_at', relic_row.updated_at
  ) || relic_row.data;
end;
$$;

create or replace function public.save_user_relic_with_favor(
  relic_payload jsonb,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  allowed_keys text[] := array['name', 'base_type', 'theme', 'lore', 'effects'];
  payload_key text;
  payload_hash text;
  receipt_inserted uuid;
  existing_payload_hash text;
  existing_result jsonb;
  relic_row public.user_relics%rowtype;
  relic_name text;
  relic_base text;
  relic_theme text;
  relic_lore text;
  relic_effects jsonb;
  effect_key text;
  effect_count integer;
  canonical_cost bigint := 0;
  prior_favor_spent bigint := 0;
  favor_due bigint;
  favor_balance bigint;
  favor_result jsonb;
  next_relic_data jsonb;
  forge_result_snapshot jsonb;
  saved_at timestamptz := pg_catalog.clock_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if request_id is null then
    raise exception using errcode = '22023', message = 'Relic request id is required';
  end if;
  if relic_payload is null or pg_catalog.jsonb_typeof(relic_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Relic payload must be an object';
  end if;

  for payload_key in select pg_catalog.jsonb_object_keys(relic_payload)
  loop
    if not (payload_key = any(allowed_keys)) then
      raise exception using errcode = '22023', message = 'Relic payload contains an unknown field';
    end if;
  end loop;
  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(relic_payload)) <> 5 then
    raise exception using errcode = '22023', message = 'Relic payload must include every editable field';
  end if;

  if pg_catalog.jsonb_typeof(relic_payload -> 'name') <> 'string'
    or pg_catalog.jsonb_typeof(relic_payload -> 'base_type') <> 'string'
    or pg_catalog.jsonb_typeof(relic_payload -> 'theme') <> 'string'
    or pg_catalog.jsonb_typeof(relic_payload -> 'lore') <> 'string'
    or pg_catalog.jsonb_typeof(relic_payload -> 'effects') <> 'array' then
    raise exception using errcode = '22023', message = 'Relic payload has invalid field types';
  end if;

  relic_name := pg_catalog.btrim(relic_payload ->> 'name');
  relic_base := relic_payload ->> 'base_type';
  relic_theme := relic_payload ->> 'theme';
  relic_lore := pg_catalog.btrim(relic_payload ->> 'lore');
  relic_effects := relic_payload -> 'effects';

  if pg_catalog.char_length(relic_name) not between 4 and 80 then
    raise exception using errcode = '22023', message = 'Relic name must be between 4 and 80 characters';
  end if;
  if relic_base not in ('lantern', 'tome', 'mask', 'crystal', 'instrument') then
    raise exception using errcode = '22023', message = 'Unknown relic base';
  end if;
  if relic_theme not in ('celestial', 'corrupted', 'floral', 'gothic', 'permafrost') then
    raise exception using errcode = '22023', message = 'Unknown relic theme';
  end if;
  if pg_catalog.char_length(relic_lore) not between 18 and 1000 then
    raise exception using errcode = '22023', message = 'Relic lore must be between 18 and 1000 characters';
  end if;

  effect_count := pg_catalog.jsonb_array_length(relic_effects);
  if effect_count not between 1 and 6 then
    raise exception using errcode = '22023', message = 'Relic must have between 1 and 6 effects';
  end if;
  if (
    select pg_catalog.count(distinct effect.value)
    from pg_catalog.jsonb_array_elements_text(relic_effects) as effect(value)
  ) <> effect_count then
    raise exception using errcode = '22023', message = 'Relic effects must be unique';
  end if;

  canonical_cost := case relic_base
    when 'lantern' then 45
    when 'tome' then 35
    when 'mask' then 55
    when 'crystal' then 40
    when 'instrument' then 50
  end;

  for effect_key in select effect.value from pg_catalog.jsonb_array_elements_text(relic_effects) as effect(value)
  loop
    canonical_cost := canonical_cost + case effect_key
      when 'blue-flame' then 12
      when 'star-orbit' then 18
      when 'petal-drift' then 10
      when 'sigil-glow' then 16
      when 'snow-dots' then 8
      when 'lore-script' then 14
      else null
    end;
    if canonical_cost is null then
      raise exception using errcode = '22023', message = 'Unknown relic effect';
    end if;
  end loop;

  payload_hash := pg_catalog.md5(relic_payload::text);

  insert into private.relic_forge_receipts (
    user_id,
    request_id,
    payload_hash
  )
  values (
    caller_id,
    request_id,
    payload_hash
  )
  on conflict (user_id, request_id) do nothing
  returning request_id into receipt_inserted;

  if receipt_inserted is null then
    select receipt.payload_hash, receipt.result_snapshot
    into existing_payload_hash, existing_result
    from private.relic_forge_receipts as receipt
    where receipt.user_id = caller_id
      and receipt.request_id = save_user_relic_with_favor.request_id
    for update;

    if existing_payload_hash is distinct from payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Relic request id was reused with a different payload';
    end if;
    if existing_result is null then
      raise exception using errcode = '40001', message = 'Relic request is still being processed';
    end if;
    return pg_catalog.jsonb_set(existing_result, '{replayed}', 'true'::jsonb, true);
  end if;

  perform private.assert_relic_forge_open(caller_id);
  perform public.ensure_user_relic();

  select relic.*
  into relic_row
  from public.user_relics as relic
  where relic.user_id = caller_id
  for update;

  select investment.favor_invested
  into prior_favor_spent
  from private.relic_forge_investments as investment
  where investment.user_id = caller_id
    and investment.relic_id = relic_row.id
  for update;

  if prior_favor_spent is null then
    raise exception using errcode = 'P0001', message = 'Relic investment state is unavailable';
  end if;

  favor_due := pg_catalog.greatest(0, canonical_cost - prior_favor_spent);
  if favor_due > 0 then
    favor_result := private.post_favor_entry(
      caller_id,
      -favor_due,
      'relic_forge_save',
      request_id,
      request_id,
      pg_catalog.jsonb_build_object(
        'canonical_cost', canonical_cost,
        'prior_favor_spent', prior_favor_spent
      )
    );
    favor_balance := (favor_result #>> '{favor,balance}')::bigint;
  else
    favor_balance := private.ensure_favor_account(caller_id);
  end if;

  next_relic_data := relic_row.data || pg_catalog.jsonb_build_object(
    'name', relic_name,
    'base_type', relic_base,
    'theme', relic_theme,
    'lore', relic_lore,
    'effects', relic_effects,
    'favor_spent', pg_catalog.greatest(prior_favor_spent, canonical_cost),
    'status', coalesce(relic_row.data ->> 'status', 'active'),
    'equipped_charm_ids', coalesce(relic_row.data -> 'equipped_charm_ids', '[]'::jsonb)
  );

  update public.user_relics
  set data = next_relic_data,
      updated_at = saved_at
  where id = relic_row.id;

  update private.relic_forge_investments
  set favor_invested = pg_catalog.greatest(prior_favor_spent, canonical_cost),
      updated_at = saved_at
  where user_id = caller_id
    and relic_id = relic_row.id;

  forge_result_snapshot := pg_catalog.jsonb_build_object(
    'replayed', false,
    'relic', pg_catalog.jsonb_build_object(
      'id', relic_row.id,
      'user_id', caller_id,
      'updated_at', saved_at
    ) || next_relic_data,
    'favor', pg_catalog.jsonb_build_object(
      'delta', -favor_due,
      'balance', favor_balance
    )
  );

  update private.relic_forge_receipts
  set result_snapshot = forge_result_snapshot,
      completed_at = saved_at
  where user_id = caller_id
    and request_id = save_user_relic_with_favor.request_id;

  return forge_result_snapshot;
end;
$$;

create or replace function public.roll_user_relic_charm(
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  relic_id uuid;
  existing_charm public.user_relic_charms%rowtype;
  selected_rarity text;
  selected_key text;
  selected_name text;
  selected_slot text;
  selected_kind text;
  selected_description text;
  created_charm public.user_relic_charms%rowtype;
  rarity_roll numeric;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if request_id is null then
    raise exception using errcode = '22023', message = 'Charm roll request id is required';
  end if;

  perform public.ensure_user_relic();

  select relic.id
  into relic_id
  from public.user_relics as relic
  where relic.user_id = caller_id
  for update;

  select charm.*
  into existing_charm
  from public.user_relic_charms as charm
  where charm.user_id = caller_id
    and charm.data ->> 'instance_id' = request_id::text
  limit 1;

  if existing_charm.id is not null then
    return pg_catalog.jsonb_build_object(
      'id', existing_charm.id,
      'user_id', existing_charm.user_id,
      'created_at', existing_charm.created_at,
      'updated_at', existing_charm.updated_at
    ) || existing_charm.data;
  end if;

  perform private.assert_relic_forge_open(caller_id);

  rarity_roll := pg_catalog.random() * 100;
  selected_rarity := case
    when rarity_roll < 55 then 'common'
    when rarity_roll < 80 then 'uncommon'
    when rarity_roll < 94 then 'rare'
    when rarity_roll < 99 then 'epic'
    else 'mythic'
  end;

  select catalog.charm_key, catalog.name, catalog.slot, catalog.kind, catalog.description
  into selected_key, selected_name, selected_slot, selected_kind, selected_description
  from (
    values
      ('ash-thread', 'Ash Thread', 'common', 'ribbon', 'wrap', 'A smoke-dark cord for binding small vows to the relic.'),
      ('candle-wax-seal', 'Candle Wax Seal', 'common', 'sigil', 'seal', 'A soft seal pressed with a quiet mark.'),
      ('iron-ring', 'Iron Ring', 'common', 'chain', 'ring', 'Plain iron, warm from being carried.'),
      ('smoke-ribbon', 'Smoke Ribbon', 'common', 'ribbon', 'trail', 'A trailing ribbon that refuses to stay fully solid.'),
      ('moonlit-chain', 'Moonlit Chain', 'uncommon', 'chain', 'chain', 'Small links holding a cold lunar sheen.'),
      ('verdant-knot', 'Verdant Knot', 'uncommon', 'root', 'knot', 'A living knot that tightens near honest promises.'),
      ('static-sigil', 'Static Sigil', 'uncommon', 'sigil', 'sigil', 'A charged glyph that crackles when the relic wakes.'),
      ('blue-ember', 'Blue Ember', 'uncommon', 'flame', 'ember', 'A small blue ember that burns without eating air.'),
      ('star-shard', 'Star Shard', 'rare', 'halo', 'shard', 'A shard that catches light before it arrives.'),
      ('hollow-bell', 'Hollow Bell', 'rare', 'bell', 'bell', 'A silent bell that rings only in memory.'),
      ('mirror-thorn', 'Mirror Thorn', 'rare', 'pin', 'pin', 'A reflective thorn that shows the relic from the inside.'),
      ('bloodrose-pin', 'Blood-rose Pin', 'rare', 'pin', 'pin', 'A dark rose-metal fastener for dramatic attachments.'),
      ('void-halo', 'Void Halo', 'epic', 'halo', 'halo', 'A thin ring of absence that makes the relic feel heavier.'),
      ('eclipse-lens', 'Eclipse Lens', 'epic', 'core', 'lens', 'A smoked lens that turns glow into omen.'),
      ('last-vow-core', 'Last Vow Core', 'mythic', 'core', 'core', 'A mythic core made from a promise that survived the dark.'),
      ('forsaken-halo', 'Forsaken Halo', 'mythic', 'halo', 'halo', 'A fractured halo with no white edge, only colored fire.')
  ) as catalog(charm_key, name, rarity, slot, kind, description)
  where catalog.rarity = selected_rarity
  order by pg_catalog.random()
  limit 1;

  insert into public.user_relic_charms (
    user_id,
    created_by,
    data
  )
  values (
    caller_id,
    null,
    pg_catalog.jsonb_build_object(
      'instance_id', request_id,
      'charm_key', selected_key,
      'name', selected_name,
      'rarity', selected_rarity,
      'slot', selected_slot,
      'kind', selected_kind,
      'description', selected_description,
      'equipped', false,
      'acquired_at', pg_catalog.clock_timestamp(),
      'source', 'relic_roll'
    )
  )
  on conflict (user_id, (data ->> 'instance_id'))
  where data ->> 'source' = 'relic_roll'
    and nullif(data ->> 'instance_id', '') is not null
  do nothing
  returning * into created_charm;

  if created_charm.id is null then
    select charm.*
    into created_charm
    from public.user_relic_charms as charm
    where charm.user_id = caller_id
      and charm.data ->> 'source' = 'relic_roll'
      and charm.data ->> 'instance_id' = request_id::text
    limit 1;
  end if;

  if created_charm.id is null then
    raise exception using errcode = '40001', message = 'Charm roll replay is unavailable';
  end if;

  return pg_catalog.jsonb_build_object(
    'id', created_charm.id,
    'user_id', created_charm.user_id,
    'created_at', created_charm.created_at,
    'updated_at', created_charm.updated_at
  ) || created_charm.data;
end;
$$;

create unique index if not exists user_relic_charms_one_roll_instance
on public.user_relic_charms (user_id, (data ->> 'instance_id'))
where data ->> 'source' = 'relic_roll'
  and nullif(data ->> 'instance_id', '') is not null;

create or replace function public.set_equipped_relic_charm(
  target_charm_id uuid,
  should_equip boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  relic_row public.user_relics%rowtype;
  owned_charm public.user_relic_charms%rowtype;
  owned_slot text;
  equipped_ids jsonb;
  charm_snapshot jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if target_charm_id is null or should_equip is null then
    raise exception using errcode = '22023', message = 'Charm and equipped state are required';
  end if;

  perform public.ensure_user_relic();
  select relic.*
  into relic_row
  from public.user_relics as relic
  where relic.user_id = caller_id
  for update;

  select charm.*
  into owned_charm
  from public.user_relic_charms as charm
  where charm.id = target_charm_id
    and charm.user_id = caller_id
  for update;

  if owned_charm.id is null then
    raise exception using errcode = '42501', message = 'Charm is not owned by the caller';
  end if;
  if owned_charm.data #>> '{source,type}' = 'achievement' then
    select achievement.reward ->> 'slot'
    into owned_slot
    from public.user_achievements as unlocked
    join public.achievement_catalog as achievement
      on achievement.achievement_key = unlocked.achievement_key
    where unlocked.user_id = caller_id
      and unlocked.achievement_key = owned_charm.data #>> '{source,key}'
      and achievement.active
      and achievement.reward ->> 'kind' = 'charm'
      and achievement.reward ->> 'charm_key' = owned_charm.data ->> 'charm_key';
  else
    owned_slot := owned_charm.data ->> 'slot';
  end if;
  if nullif(owned_slot, '') is null then
    raise exception using errcode = '22023', message = 'Charm slot is invalid';
  end if;

  perform charm.id
  from public.user_relic_charms as charm
  where charm.user_id = caller_id
    and (
      (
        charm.data #>> '{source,type}' = 'achievement'
        and exists (
          select 1
          from public.user_achievements as unlocked
          join public.achievement_catalog as achievement
            on achievement.achievement_key = unlocked.achievement_key
          where unlocked.user_id = caller_id
            and unlocked.achievement_key = charm.data #>> '{source,key}'
            and achievement.active
            and achievement.reward ->> 'kind' = 'charm'
            and achievement.reward ->> 'charm_key' = charm.data ->> 'charm_key'
            and achievement.reward ->> 'slot' = owned_slot
        )
      )
      or (
        charm.data #>> '{source,type}' is distinct from 'achievement'
        and charm.data ->> 'slot' = owned_slot
      )
    )
  order by charm.id
  for update of charm;

  if should_equip then
    update public.user_relic_charms as charm
    set data = pg_catalog.jsonb_set(charm.data, '{equipped}', 'false'::jsonb, true)
    where charm.user_id = caller_id
      and charm.id <> target_charm_id
      and charm.data ->> 'equipped' = 'true'
      and (
        (
          charm.data #>> '{source,type}' = 'achievement'
          and exists (
            select 1
            from public.user_achievements as unlocked
            join public.achievement_catalog as achievement
              on achievement.achievement_key = unlocked.achievement_key
            where unlocked.user_id = caller_id
              and unlocked.achievement_key = charm.data #>> '{source,key}'
              and achievement.active
              and achievement.reward ->> 'kind' = 'charm'
              and achievement.reward ->> 'charm_key' = charm.data ->> 'charm_key'
              and achievement.reward ->> 'slot' = owned_slot
          )
        )
        or (
          charm.data #>> '{source,type}' is distinct from 'achievement'
          and charm.data ->> 'slot' = owned_slot
        )
      );
  end if;

  update public.user_relic_charms as charm
  set data = pg_catalog.jsonb_set(charm.data, '{equipped}', pg_catalog.to_jsonb(should_equip), true)
  where charm.id = target_charm_id
    and charm.user_id = caller_id;

  select coalesce(
    pg_catalog.jsonb_agg(pg_catalog.to_jsonb(charm.id::text) order by charm.created_at),
    '[]'::jsonb
  )
  into equipped_ids
  from public.user_relic_charms as charm
  where charm.user_id = caller_id
    and charm.data ->> 'equipped' = 'true';

  update public.user_relics
  set data = pg_catalog.jsonb_set(data, '{equipped_charm_ids}', equipped_ids, true)
  where id = relic_row.id;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', charm.id,
        'user_id', charm.user_id,
        'created_at', charm.created_at,
        'updated_at', charm.updated_at
      ) || charm.data
      order by charm.created_at desc, charm.id
    ),
    '[]'::jsonb
  )
  into charm_snapshot
  from public.user_relic_charms as charm
  where charm.user_id = caller_id;

  return charm_snapshot;
end;
$$;

create or replace function public.set_user_level_favored(
  level_id uuid,
  favored boolean,
  title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role text;
  level_row public.user_levels%rowtype;
  normalized_title text := pg_catalog.btrim(coalesce(title, ''));
  next_data jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if level_id is null or favored is null then
    raise exception using errcode = '22023', message = 'Favored target and state are required';
  end if;

  select profile.role
  into caller_role
  from public.profiles as profile
  where profile.id = caller_id;

  if caller_role not in ('admin', 'lead_mod', 'mod') then
    raise exception using errcode = '42501', message = 'Staff role required';
  end if;
  if pg_catalog.char_length(normalized_title) > 60 then
    raise exception using errcode = '22023', message = 'Favored title must be 60 characters or fewer';
  end if;
  if favored and normalized_title = '' then
    normalized_title := 'Favored';
  end if;

  select level.*
  into level_row
  from public.user_levels as level
  where level.id = level_id
  for update;

  if level_row.id is null then
    raise exception using errcode = '22023', message = 'Favor level not found';
  end if;
  if pg_catalog.jsonb_typeof(level_row.data) <> 'object' then
    raise exception using errcode = '22023', message = 'Favor level metadata must be an object';
  end if;

  next_data := pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        level_row.data,
        '{is_favored}',
        pg_catalog.to_jsonb(favored),
        true
      ),
      '{favored_title}',
      pg_catalog.to_jsonb(normalized_title),
      true
    ),
    '{favored_badge}',
    '"crown"'::jsonb,
    true
  );

  update public.user_levels
  set data = next_data
  where id = level_row.id;

  return pg_catalog.jsonb_build_object(
    'id', level_row.id,
    'user_id', level_row.user_id
  ) || next_data;
end;
$$;

lock table public.user_levels, public.user_relics, public.user_relic_charms
in access exclusive mode;

revoke insert, update, delete on table public.user_levels from anon, authenticated;
revoke insert, update, delete on table public.user_relics from anon, authenticated;
revoke insert, update, delete on table public.user_relic_charms from anon, authenticated;
grant select on table public.user_relics to authenticated;
grant select on table public.user_relic_charms to authenticated;

drop policy if exists "User level create" on public.user_levels;
drop policy if exists "Public create" on public.user_levels;
drop policy if exists "Owner or staff update" on public.user_levels;
drop policy if exists "Owner or staff delete" on public.user_levels;
drop policy if exists "Users create own relics" on public.user_relics;
drop policy if exists "Users update own relics" on public.user_relics;
drop policy if exists "Users delete own relics" on public.user_relics;
drop policy if exists "Users create own relic charms" on public.user_relic_charms;
drop policy if exists "Users update own relic charms" on public.user_relic_charms;
drop policy if exists "Users delete own relic charms" on public.user_relic_charms;

do $$
declare
  account_user record;
begin
  if not exists (
    select 1
    from private.favor_reconciliation_cutovers
    where cutover_key = 'favor-ledger-v1'
  ) then
    insert into private.favor_reconciliation_audit (
      cutover_key,
      audit_kind,
      user_id,
      level_id,
      details
    )
    select
      'favor-ledger-v1',
      'duplicate_level',
      portal_user.id,
      null,
      pg_catalog.jsonb_build_object(
        'row_count', pg_catalog.count(level_row.id),
        'level_ids', pg_catalog.jsonb_agg(level_row.id order by level_row.created_at, level_row.id)
      )
    from auth.users as portal_user
    join public.user_levels as level_row
      on level_row.user_id = portal_user.id
      or (
        level_row.data ->> 'user_key' = 'user:' || portal_user.id::text
        and (level_row.user_id is null or level_row.user_id = portal_user.id)
      )
    group by portal_user.id
    having pg_catalog.count(level_row.id) > 1
    on conflict do nothing;

    insert into private.favor_reconciliation_audit (
      cutover_key,
      audit_kind,
      user_id,
      level_id,
      account_balance,
      mirror_balance,
      details
    )
    select
      'favor-ledger-v1',
      'mirror_mismatch',
      account.user_id,
      mirror.id,
      account.balance,
      mirror.balance,
      pg_catalog.jsonb_build_object(
        'ledger_wins', true,
        'missing_mirror', mirror.id is null
      )
    from public.currency_accounts as account
    left join lateral (
      select
        level_row.id,
        case
          when level_row.data ->> 'points' ~ '^[0-9]+$'
            and (level_row.data ->> 'points')::numeric <= 9007199254740991
          then (level_row.data ->> 'points')::bigint
          else null
        end as balance
      from public.user_levels as level_row
      where level_row.user_id = account.user_id
        or (
          level_row.data ->> 'user_key' = 'user:' || account.user_id::text
          and (level_row.user_id is null or level_row.user_id = account.user_id)
        )
      order by level_row.created_at, level_row.id
      limit 1
    ) as mirror on true
    where account.currency_key = 'favor'
      and (
        mirror.id is null
        or mirror.balance is distinct from account.balance
      )
    on conflict do nothing;

    for account_user in select id from auth.users order by id
    loop
      perform private.ensure_favor_account(account_user.id);
    end loop;

    insert into private.favor_reconciliation_cutovers (
      cutover_key,
      completed_at
    )
    values (
      'favor-ledger-v1',
      pg_catalog.clock_timestamp()
    );
  end if;
end
$$;

revoke all on function private.favor_rank(bigint) from public, anon, authenticated;
revoke all on function private.sync_favor_mirror(uuid, bigint) from public, anon, authenticated;
revoke all on function private.ensure_favor_account(uuid) from public, anon, authenticated;
revoke all on function private.post_favor_entry(uuid, bigint, text, uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function private.assert_relic_forge_open(uuid) from public, anon, authenticated;

revoke execute on function public.ensure_user_relic() from public, anon;
grant execute on function public.ensure_user_relic() to authenticated;

revoke execute on function public.save_user_relic_with_favor(jsonb, uuid) from public, anon;
grant execute on function public.save_user_relic_with_favor(jsonb, uuid) to authenticated;

revoke execute on function public.roll_user_relic_charm(uuid) from public, anon;
grant execute on function public.roll_user_relic_charm(uuid) to authenticated;

drop function if exists public.equip_user_relic_charm(uuid, boolean);
revoke execute on function public.set_equipped_relic_charm(uuid, boolean) from public, anon;
grant execute on function public.set_equipped_relic_charm(uuid, boolean) to authenticated;

revoke execute on function public.set_user_level_favored(uuid, boolean, text) from public, anon;
grant execute on function public.set_user_level_favored(uuid, boolean, text) to authenticated;

revoke execute on function public.perform_portal_favor_action(text, uuid, text)
from public, anon;
grant execute on function public.perform_portal_favor_action(text, uuid, text)
to authenticated;

revoke execute on function public.start_starfishing_cast() from public, anon, authenticated;

revoke execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
from public, anon, authenticated;
