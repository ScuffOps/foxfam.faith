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
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, currency_key)
);

create table public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_key text not null check (currency_key ~ '^[a-z0-9-]+$'),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  source_type text not null,
  source_id uuid not null,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, currency_key, idempotency_key)
);

create table public.user_material_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, material_key)
);

create table public.material_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
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
    '{"kind":"cosmetic","effect_key":"merciful-tide","label":"Merciful Tide","rarity":"rare","effects":{"catch_effect":"merciful-tide"}}'::jsonb
  ),
  (
    'pocket-constellation',
    'Pocket Constellation',
    'Catch a fish within the lowest 5% of its canonical size span.',
    '{"type":"size_percentile","direction":"lowest","percentile":5}'::jsonb,
    '{"kind":"profile_particle","effect_key":"pocket-star","label":"Pocket Star","rarity":"epic","effects":{"profile_particle":"pocket-star"}}'::jsonb
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
    '{"kind":"profile_frame","effect_key":"fishpedia-frame","label":"Fishpedia Frame","rarity":"mythic","effects":{"profile_frame":"fishpedia-frame"},"trophy_key":"celestial-archivist"}'::jsonb
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

-- Achievement charms use data.source = 'starfishing_achievement' and
-- data.achievement_key = achievement_catalog.achievement_key. Task 2 inserts
-- this stable tuple with ON CONFLICT DO NOTHING to make claim retries safe.
create unique index user_relic_charms_one_starfishing_achievement_per_user
on public.user_relic_charms (user_id, (data ->> 'achievement_key'))
where data ->> 'source' = 'starfishing_achievement'
  and nullif(data ->> 'achievement_key', '') is not null;

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
