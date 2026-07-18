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

create or replace function public.start_starfishing_cast()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  locked_user_id uuid;
  cast_created_at timestamptz := pg_catalog.clock_timestamp();
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

  update public.game_cast_tickets
  set consumed_at = cast_created_at
  where user_id = caller_id
    and consumed_at is null;

  select
    least(2500, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,favor_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,favor_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(2500, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,material_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,material_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(500, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,rare_bite_bonus_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,rare_bite_bonus_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(1000, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,size_floor_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,size_floor_bps}')::numeric
        else 0
      end
    ), 0))::integer
  into
    favor_multiplier_bps,
    material_multiplier_bps,
    rare_bite_bonus_bps,
    size_floor_bps
  from public.user_relic_charms
  where user_id = caller_id
    and data ->> 'equipped' = 'true'
    and data ->> 'slot' = 'fishing';

  if rare_bite_bonus_bps > 0 then
    cast_applied_effects := cast_applied_effects || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'key', 'rare_bite_bonus_bps',
        'value', rare_bite_bonus_bps,
        'label', '+' || (rare_bite_bonus_bps::numeric / 100)::text || '% rare bite chance'
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
          + rare_bite_bonus_bps * case fish.rarity
            when 'common' then 0
            when 'uncommon' then 1
            when 'rare' then 2
            when 'epic' then 3
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
  caller_id uuid := (select auth.uid());
  requested_idempotency_key uuid := claim_idempotency_key;
  locked_user_id uuid;
  claim_created_at timestamptz := pg_catalog.clock_timestamp();
  claim_catch_id uuid := pg_catalog.gen_random_uuid();
  existing_result_snapshot jsonb;
  claim_result_snapshot jsonb;
  claim_ticket public.game_cast_tickets%rowtype;
  claim_fish public.game_fish_catalog%rowtype;
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
  charm_results jsonb := '[]'::jsonb;
  achievement_result jsonb;
  charm_result jsonb;
  user_level_id uuid;
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
        when data #>> '{effects,favor_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,favor_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(2500, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,material_multiplier_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,material_multiplier_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(500, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,rare_bite_bonus_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,rare_bite_bonus_bps}')::numeric
        else 0
      end
    ), 0))::integer,
    least(1000, coalesce(pg_catalog.sum(
      case
        when data #>> '{effects,size_floor_bps}' ~ '^[0-9]{1,9}$'
          then (data #>> '{effects,size_floor_bps}')::numeric
        else 0
      end
    ), 0))::integer
  into
    favor_multiplier_bps,
    material_multiplier_bps,
    rare_bite_bonus_bps,
    size_floor_bps
  from public.user_relic_charms
  where user_id = caller_id
    and data ->> 'equipped' = 'true'
    and data ->> 'slot' = 'fishing';

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

  insert into public.currency_accounts (user_id, currency_key, balance, updated_at)
  values (caller_id, 'favor', 0, claim_created_at)
  on conflict (user_id, currency_key) do nothing;

  select account.balance
  into prior_favor_balance
  from public.currency_accounts as account
  where account.user_id = caller_id
    and account.currency_key = 'favor'
  for update;

  favor_balance := prior_favor_balance + favor_delta;

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

    insert into public.user_material_balances (
      user_id,
      material_key,
      balance,
      updated_at
    )
    values (caller_id, material_reward.material_key, 0, claim_created_at)
    on conflict (user_id, material_key) do nothing;

    select balance_row.balance
    into previous_material_balance
    from public.user_material_balances as balance_row
    where balance_row.user_id = caller_id
      and balance_row.material_key = material_reward.material_key
    for update;

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
  where fishpedia_row.user_id = caller_id;
  if not claim_duplicate then
    discovered_count := discovered_count + 1;
  end if;

  select pg_catalog.count(*)::integer
  into catalog_count
  from public.game_fish_catalog as fish_row
  where fish_row.active;

  completion_percent := case
    when catalog_count = 0 then 0
    else pg_catalog.round(discovered_count::numeric * 100 / catalog_count)::integer
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
        'id', pg_catalog.gen_random_uuid(),
        'charm_key', achievement.reward ->> 'charm_key',
        'label', achievement.reward ->> 'label',
        'rarity', achievement.reward ->> 'rarity',
        'slot', achievement.reward ->> 'slot',
        'effects', coalesce(achievement.reward -> 'effects', '{}'::jsonb),
        'equipped', false,
        'acquired_at', claim_created_at,
        'source', pg_catalog.jsonb_build_object(
          'type',
          'achievement',
          'key',
          achievement.achievement_key
        )
      )
      order by achievement.achievement_key
    ),
    '[]'::jsonb
  )
  into charm_results
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

  update public.currency_accounts
  set balance = favor_balance,
      updated_at = claim_created_at
  where user_id = caller_id
    and currency_key = 'favor';

  if favor_delta > 0 then
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
      caller_id,
      'favor',
      favor_delta,
      favor_balance,
      'starfishing_catch',
      claim_catch_id,
      requested_idempotency_key,
      pg_catalog.jsonb_build_object(
        'fish_key', claim_fish.fish_key,
        'duplicate_policy', effective_duplicate_policy
      ),
      claim_created_at
    );
  end if;

  for material_result in
    select material.value
    from pg_catalog.jsonb_array_elements(material_results) as material(value)
  loop
    update public.user_material_balances
    set balance = (material_result ->> 'balance')::bigint,
        updated_at = claim_created_at
    where user_id = caller_id
      and material_key = material_result ->> 'key';

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

  for charm_result in
    select charm.value
    from pg_catalog.jsonb_array_elements(charm_results) as charm(value)
  loop
    insert into public.user_relic_charms (
      id,
      user_id,
      created_by,
      data,
      created_at,
      updated_at
    )
    values (
      (charm_result ->> 'id')::uuid,
      caller_id,
      'starfishing',
      pg_catalog.jsonb_build_object(
        'charm_key', charm_result ->> 'charm_key',
        'name', charm_result ->> 'label',
        'label', charm_result ->> 'label',
        'rarity', charm_result ->> 'rarity',
        'slot', charm_result ->> 'slot',
        'effects', charm_result -> 'effects',
        'equipped', false,
        'acquired_at', charm_result -> 'acquired_at',
        'source', charm_result -> 'source'
      ),
      claim_created_at,
      claim_created_at
    )
    on conflict do nothing;
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

  select level_row.id
  into user_level_id
  from public.user_levels as level_row
  where level_row.user_id = caller_id
  order by level_row.created_at, level_row.id
  limit 1
  for update;

  if user_level_id is null then
    select level_row.id
    into user_level_id
    from public.user_levels as level_row
    where level_row.data ->> 'user_key' = 'user:' || caller_id::text
      and (level_row.user_id is null or level_row.user_id = caller_id)
    order by level_row.created_at, level_row.id
    limit 1
    for update;
  end if;

  if user_level_id is null then
    insert into public.user_levels (user_id, created_by, data, created_at, updated_at)
    values (
      caller_id,
      null,
      pg_catalog.jsonb_build_object(
        'user_key', 'user:' || caller_id::text,
        'points', favor_balance
      ),
      claim_created_at,
      claim_created_at
    )
    returning id into user_level_id;
  else
    update public.user_levels
    set user_id = coalesce(user_id, caller_id),
        data = pg_catalog.jsonb_set(data, '{points}', pg_catalog.to_jsonb(favor_balance), true),
        updated_at = claim_created_at
    where id = user_level_id;
  end if;

  update public.game_cast_tickets
  set consumed_at = claim_created_at,
      claim_id = claim_catch_id
  where id = claim_ticket.id;

  return claim_result_snapshot;
end;
$$;

revoke execute on function public.start_starfishing_cast() from public, anon;
grant execute on function public.start_starfishing_cast() to authenticated;

revoke execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
from public, anon;
grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
to authenticated;
