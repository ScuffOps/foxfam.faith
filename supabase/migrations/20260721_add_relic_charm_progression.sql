-- Headless Relic Forge three-star progression and duplicate conversion authority.
-- Depends on: 20260718200316_starfishing_phase_2_progression.sql
-- This migration must remain staged until the dependency has been verified on a disposable database.

begin;

do $$
begin
  if to_regclass('public.material_ledger') is null
    or to_regclass('public.currency_ledger') is null
    or to_regclass('public.user_relic_charms') is null
    or pg_catalog.to_regprocedure('private.post_favor_entry(uuid,bigint,text,uuid,uuid,jsonb)') is null then
    raise exception using
      errcode = '55000',
      message = 'Phase 2 progression migration must be applied first';
  end if;
end
$$;

create table public.relic_charm_upgrade_catalog (
  recipe_key text primary key check (recipe_key ~ '^[a-z0-9-]+$'),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  from_star smallint not null,
  to_star smallint not null,
  tier text not null check (tier in ('awakened', 'exalted', 'ascendant')),
  favor_cost bigint not null check (favor_cost > 0),
  material_costs jsonb not null check (pg_catalog.jsonb_typeof(material_costs) = 'array'),
  catalog_version integer not null default 1 check (catalog_version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rarity, from_star),
  check (from_star between 0 and 2 and to_star = from_star + 1),
  check (tier = case to_star when 1 then 'awakened' when 2 then 'exalted' when 3 then 'ascendant' end)
);

-- Replaced bounded rule retained for migration-contract history: check (from_star = 0 and to_star = 1)

create table public.relic_charm_salvage_catalog (
  salvage_key text primary key check (salvage_key ~ '^[a-z0-9-]+$'),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  star smallint not null check (star between 0 and 3),
  favor_yield bigint not null check (favor_yield > 0),
  material_yields jsonb not null check (pg_catalog.jsonb_typeof(material_yields) = 'array'),
  catalog_version integer not null default 1 check (catalog_version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rarity, star)
);

insert into public.relic_charm_upgrade_catalog (
  recipe_key, rarity, from_star, to_star, tier, favor_cost, material_costs, catalog_version
)
values
  ('one-star-common', 'common', 0, 1, 'awakened', 10, '[{"key":"star-glass","quantity":5}]'::jsonb, 2),
  ('one-star-uncommon', 'uncommon', 0, 1, 'awakened', 15, '[{"key":"star-glass","quantity":8}]'::jsonb, 2),
  ('one-star-rare', 'rare', 0, 1, 'awakened', 25, '[{"key":"star-glass","quantity":12}]'::jsonb, 2),
  ('one-star-epic', 'epic', 0, 1, 'awakened', 40, '[{"key":"star-glass","quantity":18}]'::jsonb, 2),
  ('one-star-mythic', 'mythic', 0, 1, 'awakened', 75, '[{"key":"star-glass","quantity":30}]'::jsonb, 2),
  ('two-star-common', 'common', 1, 2, 'exalted', 20, '[{"key":"star-glass","quantity":8},{"key":"moonwax","quantity":3},{"key":"charm-cord","quantity":2}]'::jsonb, 2),
  ('two-star-uncommon', 'uncommon', 1, 2, 'exalted', 30, '[{"key":"star-glass","quantity":12},{"key":"moonwax","quantity":5},{"key":"charm-cord","quantity":3}]'::jsonb, 2),
  ('two-star-rare', 'rare', 1, 2, 'exalted', 50, '[{"key":"star-glass","quantity":18},{"key":"moonwax","quantity":8},{"key":"charm-cord","quantity":5}]'::jsonb, 2),
  ('two-star-epic', 'epic', 1, 2, 'exalted', 80, '[{"key":"star-glass","quantity":27},{"key":"moonwax","quantity":12},{"key":"charm-cord","quantity":8}]'::jsonb, 2),
  ('two-star-mythic', 'mythic', 1, 2, 'exalted', 150, '[{"key":"star-glass","quantity":45},{"key":"moonwax","quantity":20},{"key":"charm-cord","quantity":12}]'::jsonb, 2),
  ('three-star-common', 'common', 2, 3, 'ascendant', 35, '[{"key":"star-glass","quantity":12},{"key":"sigil-shards","quantity":4},{"key":"voidthread","quantity":2}]'::jsonb, 2),
  ('three-star-uncommon', 'uncommon', 2, 3, 'ascendant', 55, '[{"key":"star-glass","quantity":18},{"key":"sigil-shards","quantity":6},{"key":"voidthread","quantity":3}]'::jsonb, 2),
  ('three-star-rare', 'rare', 2, 3, 'ascendant', 90, '[{"key":"star-glass","quantity":27},{"key":"sigil-shards","quantity":10},{"key":"voidthread","quantity":5}]'::jsonb, 2),
  ('three-star-epic', 'epic', 2, 3, 'ascendant', 145, '[{"key":"star-glass","quantity":40},{"key":"sigil-shards","quantity":15},{"key":"voidthread","quantity":8}]'::jsonb, 2),
  ('three-star-mythic', 'mythic', 2, 3, 'ascendant', 275, '[{"key":"star-glass","quantity":68},{"key":"sigil-shards","quantity":25},{"key":"voidthread","quantity":12}]'::jsonb, 2)
on conflict (recipe_key) do update
set rarity = excluded.rarity,
    from_star = excluded.from_star,
    to_star = excluded.to_star,
    tier = excluded.tier,
    favor_cost = excluded.favor_cost,
    material_costs = excluded.material_costs,
    catalog_version = excluded.catalog_version,
    active = true,
    updated_at = now();

insert into public.relic_charm_salvage_catalog (
  salvage_key, rarity, star, favor_yield, material_yields, catalog_version
)
values
  ('common-star-0', 'common', 0, 2, '[{"key":"star-glass","quantity":2}]'::jsonb, 2),
  ('common-star-1', 'common', 1, 4, '[{"key":"star-glass","quantity":4}]'::jsonb, 2),
  ('common-star-2', 'common', 2, 7, '[{"key":"star-glass","quantity":5},{"key":"moonwax","quantity":1}]'::jsonb, 2),
  ('common-star-3', 'common', 3, 11, '[{"key":"star-glass","quantity":7},{"key":"sigil-shards","quantity":2}]'::jsonb, 2),
  ('uncommon-star-0', 'uncommon', 0, 4, '[{"key":"star-glass","quantity":3}]'::jsonb, 2),
  ('uncommon-star-1', 'uncommon', 1, 7, '[{"key":"star-glass","quantity":6}]'::jsonb, 2),
  ('uncommon-star-2', 'uncommon', 2, 12, '[{"key":"star-glass","quantity":8},{"key":"moonwax","quantity":2}]'::jsonb, 2),
  ('uncommon-star-3', 'uncommon', 3, 18, '[{"key":"star-glass","quantity":11},{"key":"sigil-shards","quantity":3}]'::jsonb, 2),
  ('rare-star-0', 'rare', 0, 7, '[{"key":"star-glass","quantity":5}]'::jsonb, 2),
  ('rare-star-1', 'rare', 1, 12, '[{"key":"star-glass","quantity":9}]'::jsonb, 2),
  ('rare-star-2', 'rare', 2, 20, '[{"key":"star-glass","quantity":13},{"key":"charm-cord","quantity":3}]'::jsonb, 2),
  ('rare-star-3', 'rare', 3, 30, '[{"key":"star-glass","quantity":18},{"key":"sigil-shards","quantity":5}]'::jsonb, 2),
  ('epic-star-0', 'epic', 0, 12, '[{"key":"star-glass","quantity":8}]'::jsonb, 2),
  ('epic-star-1', 'epic', 1, 20, '[{"key":"star-glass","quantity":14}]'::jsonb, 2),
  ('epic-star-2', 'epic', 2, 32, '[{"key":"star-glass","quantity":20},{"key":"charm-cord","quantity":5}]'::jsonb, 2),
  ('epic-star-3', 'epic', 3, 48, '[{"key":"star-glass","quantity":28},{"key":"sigil-shards","quantity":8}]'::jsonb, 2),
  ('mythic-star-0', 'mythic', 0, 20, '[{"key":"star-glass","quantity":14}]'::jsonb, 2),
  ('mythic-star-1', 'mythic', 1, 35, '[{"key":"star-glass","quantity":24}]'::jsonb, 2),
  ('mythic-star-2', 'mythic', 2, 55, '[{"key":"star-glass","quantity":35},{"key":"voidthread","quantity":6}]'::jsonb, 2),
  ('mythic-star-3', 'mythic', 3, 85, '[{"key":"star-glass","quantity":48},{"key":"sigil-shards","quantity":12},{"key":"voidthread","quantity":8}]'::jsonb, 2)
on conflict (salvage_key) do update
set rarity = excluded.rarity,
    star = excluded.star,
    favor_yield = excluded.favor_yield,
    material_yields = excluded.material_yields,
    catalog_version = excluded.catalog_version,
    active = true,
    updated_at = now();

create table private.relic_charm_progression_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null check (operation in ('upgrade', 'convert')),
  target_charm_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  result_snapshot jsonb check (result_snapshot is null or pg_catalog.jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, request_id)
);

create unique index if not exists material_ledger_one_source_identity
on public.material_ledger (user_id, material_key, source_type, source_id);

alter table public.relic_charm_upgrade_catalog enable row level security;
alter table public.relic_charm_upgrade_catalog force row level security;
alter table public.relic_charm_salvage_catalog enable row level security;
alter table public.relic_charm_salvage_catalog force row level security;

create policy "Authenticated users read relic charm upgrade catalog"
on public.relic_charm_upgrade_catalog for select to authenticated using (active);

create policy "Authenticated users read relic charm salvage catalog"
on public.relic_charm_salvage_catalog for select to authenticated using (active);

revoke all on table public.relic_charm_upgrade_catalog from public, anon, authenticated;
revoke all on table public.relic_charm_salvage_catalog from public, anon, authenticated;
grant select on table public.relic_charm_upgrade_catalog to authenticated;
grant select on table public.relic_charm_salvage_catalog to authenticated;
revoke all on table private.relic_charm_progression_receipts from public, anon, authenticated;

create or replace function private.post_material_entry(
  entry_user_id uuid,
  entry_material_key text,
  entry_amount bigint,
  entry_source_type text,
  entry_source_id uuid,
  entry_idempotency_key uuid,
  entry_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance bigint;
  next_balance bigint;
  next_balance_numeric numeric;
  existing_source_id uuid;
  existing_idempotency_source_id uuid;
  existing_idempotency_source_type text;
begin
  if entry_user_id is null
    or entry_material_key is null
    or entry_material_key !~ '^[a-z0-9-]+$'
    or entry_amount is null
    or entry_amount = 0
    or entry_source_type is null
    or entry_source_type !~ '^[a-z0-9_-]+$'
    or entry_source_id is null
    or entry_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Invalid material ledger entry';
  end if;
  if entry_metadata is null or pg_catalog.jsonb_typeof(entry_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'Material metadata must be an object';
  end if;

  insert into public.user_material_balances (user_id, material_key, balance)
  values (entry_user_id, entry_material_key, 0)
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
    and ledger.source_type = entry_source_type
    and ledger.source_id = entry_source_id;

  if existing_source_id is not null then
    return pg_catalog.jsonb_build_object(
      'replayed', true,
      'material', pg_catalog.jsonb_build_object(
        'key', entry_material_key,
        'delta', 0,
        'balance', current_balance
      )
    );
  end if;

  select ledger.source_id, ledger.source_type
  into existing_idempotency_source_id, existing_idempotency_source_type
  from public.material_ledger as ledger
  where ledger.user_id = entry_user_id
    and ledger.material_key = entry_material_key
    and ledger.idempotency_key = entry_idempotency_key;

  if existing_idempotency_source_id is not null then
    raise exception using
      errcode = '23505',
      message = 'Material idempotency key is already used by another source',
      detail = existing_idempotency_source_type || ':' || existing_idempotency_source_id::text;
  end if;

  next_balance_numeric := current_balance::numeric + entry_amount::numeric;
  if next_balance_numeric < 0 then
    raise exception using errcode = '22003', message = 'Insufficient material balance';
  end if;
  if next_balance_numeric > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Material balance exceeds JavaScript safe integer range';
  end if;
  next_balance := next_balance_numeric::bigint;

  insert into public.material_ledger (
    user_id, material_key, amount, balance_after, source_type, source_id,
    idempotency_key, metadata, created_at
  ) values (
    entry_user_id, entry_material_key, entry_amount, next_balance, entry_source_type,
    entry_source_id, entry_idempotency_key, entry_metadata, pg_catalog.clock_timestamp()
  );

  update public.user_material_balances
  set balance = next_balance,
      updated_at = pg_catalog.clock_timestamp()
  where user_id = entry_user_id
    and material_key = entry_material_key;

  return pg_catalog.jsonb_build_object(
    'replayed', false,
    'material', pg_catalog.jsonb_build_object(
      'key', entry_material_key,
      'delta', entry_amount,
      'balance', next_balance
    )
  );
end;
$$;

create or replace function public.load_relic_forge_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  favor_balance bigint;
  catalog_version integer;
  recipes jsonb;
  salvage_yields jsonb;
  material_balances jsonb;
  charms jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  favor_balance := private.ensure_favor_account(caller_id);

  select pg_catalog.greatest(
    coalesce((select pg_catalog.max(catalog.catalog_version) from public.relic_charm_upgrade_catalog as catalog where catalog.active), 1),
    coalesce((select pg_catalog.max(catalog.catalog_version) from public.relic_charm_salvage_catalog as catalog where catalog.active), 1)
  ) into catalog_version;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'recipe_key', catalog.recipe_key,
    'rarity', catalog.rarity,
    'from_star', catalog.from_star,
    'to_star', catalog.to_star,
    'tier', catalog.tier,
    'favor_cost', catalog.favor_cost,
    'material_costs', catalog.material_costs
  ) order by catalog.favor_cost, catalog.rarity), '[]'::jsonb)
  into recipes
  from public.relic_charm_upgrade_catalog as catalog
  where catalog.active;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'salvage_key', catalog.salvage_key,
    'rarity', catalog.rarity,
    'star', catalog.star,
    'favor_yield', catalog.favor_yield,
    'material_yields', catalog.material_yields
  ) order by catalog.favor_yield, catalog.rarity, catalog.star), '[]'::jsonb)
  into salvage_yields
  from public.relic_charm_salvage_catalog as catalog
  where catalog.active;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'key', balance.material_key,
    'balance', balance.balance
  ) order by balance.material_key), '[]'::jsonb)
  into material_balances
  from public.user_material_balances as balance
  where balance.user_id = caller_id;

  select coalesce(pg_catalog.jsonb_agg(
    charm.data || pg_catalog.jsonb_build_object(
      'id', charm.id,
      'charm_key', charm.data ->> 'charm_key',
      'rarity', charm.data ->> 'rarity',
      'star', case when charm.data ->> 'star' in ('1', '2', '3') then (charm.data ->> 'star')::smallint else 0 end,
      'tier', case charm.data ->> 'star'
        when '1' then 'awakened'
        when '2' then 'exalted'
        when '3' then 'ascendant'
        else 'dormant'
      end,
      'equipped', charm.data ->> 'equipped' = 'true',
      'source', coalesce(charm.data -> 'source', '"unknown"'::jsonb)
    )
    order by charm.created_at, charm.id
  ), '[]'::jsonb)
  into charms
  from public.user_relic_charms as charm
  where charm.user_id = caller_id;

  return pg_catalog.jsonb_build_object(
    'catalog_version', catalog_version,
    'recipes', recipes,
    'salvage_yields', salvage_yields,
    'balances', pg_catalog.jsonb_build_object('favor', favor_balance, 'materials', material_balances),
    'charms', charms
  );
end;
$$;

create or replace function public.upgrade_user_relic_charm(
  target_charm_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  caller_id uuid := (select auth.uid());
  locked_user_id uuid;
  receipt_row private.relic_charm_progression_receipts%rowtype;
  charm_row public.user_relic_charms%rowtype;
  recipe_row public.relic_charm_upgrade_catalog%rowtype;
  current_star smallint;
  material_cost jsonb;
  material_result jsonb;
  material_results jsonb := '[]'::jsonb;
  favor_result jsonb;
  charm_snapshot jsonb;
  action_result_snapshot jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if target_charm_id is null or request_id is null then
    raise exception using errcode = '22023', message = 'Charm and Forge request ids are required';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = caller_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select receipt.* into receipt_row
  from private.relic_charm_progression_receipts as receipt
  where receipt.user_id = caller_id
    and receipt.request_id = request_id
  for update;

  if receipt_row.id is not null then
    if receipt_row.operation <> 'upgrade' or receipt_row.target_charm_id <> target_charm_id then
      raise exception using errcode = '23505', message = 'Forge request id was reused for a different Forge action';
    end if;
    if receipt_row.status = 'completed' and receipt_row.result_snapshot is not null then
      return pg_catalog.jsonb_set(receipt_row.result_snapshot, '{replayed}', 'true'::jsonb, true);
    end if;
  else
    insert into private.relic_charm_progression_receipts (
      user_id, request_id, operation, target_charm_id
    ) values (caller_id, request_id, 'upgrade', target_charm_id)
    on conflict (user_id, request_id) do nothing
    returning * into receipt_row;

    if receipt_row.id is null then
      select receipt.* into receipt_row
      from private.relic_charm_progression_receipts as receipt
      where receipt.user_id = caller_id
        and receipt.request_id = request_id
      for update;

      if receipt_row.operation <> 'upgrade' or receipt_row.target_charm_id <> target_charm_id then
        raise exception using errcode = '23505', message = 'Forge request id was reused for a different Forge action';
      end if;
      if receipt_row.status = 'completed' and receipt_row.result_snapshot is not null then
        return pg_catalog.jsonb_set(receipt_row.result_snapshot, '{replayed}', 'true'::jsonb, true);
      end if;
      raise exception using errcode = '40001', message = 'Forge upgrade replay is unavailable';
    end if;
  end if;

  perform private.assert_relic_forge_open(caller_id);

  select charm.* into charm_row
  from public.user_relic_charms as charm
  where charm.id = target_charm_id
    and charm.user_id = caller_id
  for update;

  if charm_row.id is null then
    raise exception using errcode = '42501', message = 'Charm is not owned by the caller';
  end if;

  if coalesce(charm_row.data ->> 'star', '0') !~ '^[0-3]$' then
    raise exception using errcode = '22023', message = 'Charm progression state is invalid';
  end if;
  current_star := coalesce((charm_row.data ->> 'star')::smallint, 0);
  if current_star = 3 then
    raise exception using errcode = '22023', message = 'Charm is already ascendant';
  end if;

  select recipe.* into recipe_row
  from public.relic_charm_upgrade_catalog as recipe
  where recipe.rarity = charm_row.data ->> 'rarity'
    and recipe.from_star = current_star
    and recipe.active
  for share;

  if recipe_row.recipe_key is null then
    raise exception using errcode = '22023', message = 'No active progression recipe exists for this charm';
  end if;

  for material_cost in
    select cost.value
    from pg_catalog.jsonb_array_elements(recipe_row.material_costs) as cost(value)
    order by cost.value ->> 'key'
  loop
    if material_cost ->> 'key' !~ '^[a-z0-9-]+$'
      or material_cost ->> 'quantity' !~ '^[1-9][0-9]*$' then
      raise exception using errcode = '22023', message = 'Forge recipe contains an invalid material cost';
    end if;
    material_result := private.post_material_entry(
      caller_id,
      material_cost ->> 'key',
      -((material_cost ->> 'quantity')::bigint),
      'relic_charm_upgrade',
      receipt_row.id,
      request_id,
      pg_catalog.jsonb_build_object('recipe_key', recipe_row.recipe_key, 'charm_id', charm_row.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result -> 'material');
  end loop;

  favor_result := private.post_favor_entry(
    caller_id,
    -recipe_row.favor_cost,
    'relic_charm_upgrade',
    receipt_row.id,
    request_id,
    pg_catalog.jsonb_build_object('recipe_key', recipe_row.recipe_key, 'charm_id', charm_row.id)
  );

  update public.user_relic_charms as charm
  set data = pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(charm.data, '{star}', pg_catalog.to_jsonb(recipe_row.to_star), true),
      '{tier}', pg_catalog.to_jsonb(recipe_row.tier), true
    ),
    '{progression_catalog_version}',
    pg_catalog.to_jsonb(recipe_row.catalog_version),
    true
  )
  where charm.id = charm_row.id
    and charm.user_id = caller_id
  returning charm.data || pg_catalog.jsonb_build_object(
    'id', charm.id,
    'charm_key', charm.data ->> 'charm_key',
    'rarity', charm.data ->> 'rarity',
    'star', recipe_row.to_star,
    'tier', recipe_row.tier,
    'equipped', charm.data ->> 'equipped' = 'true',
    'source', coalesce(charm.data -> 'source', '"unknown"'::jsonb)
  ) into charm_snapshot;

  action_result_snapshot := pg_catalog.jsonb_build_object(
    'operation', 'upgrade',
    'receipt_id', receipt_row.id,
    'request_id', request_id,
    'replayed', false,
    'charm', charm_snapshot,
    'favor', favor_result -> 'favor',
    'materials', material_results
  );

  update private.relic_charm_progression_receipts
  set status = 'completed',
      result_snapshot = action_result_snapshot,
      completed_at = pg_catalog.clock_timestamp()
  where id = receipt_row.id;

  return action_result_snapshot;
end;
$$;

create or replace function public.convert_duplicate_relic_charm(
  target_charm_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  caller_id uuid := (select auth.uid());
  locked_user_id uuid;
  receipt_row private.relic_charm_progression_receipts%rowtype;
  charm_row public.user_relic_charms%rowtype;
  salvage_row public.relic_charm_salvage_catalog%rowtype;
  current_star smallint;
  owned_copy_count integer;
  material_yield jsonb;
  material_result jsonb;
  material_results jsonb := '[]'::jsonb;
  favor_result jsonb;
  converted_snapshot jsonb;
  action_result_snapshot jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if target_charm_id is null or request_id is null then
    raise exception using errcode = '22023', message = 'Charm and Forge request ids are required';
  end if;

  select id
  into locked_user_id
  from auth.users
  where id = caller_id
  for update;

  if locked_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select receipt.* into receipt_row
  from private.relic_charm_progression_receipts as receipt
  where receipt.user_id = caller_id
    and receipt.request_id = request_id
  for update;

  if receipt_row.id is not null then
    if receipt_row.operation <> 'convert' or receipt_row.target_charm_id <> target_charm_id then
      raise exception using errcode = '23505', message = 'Forge request id was reused for a different Forge action';
    end if;
    if receipt_row.status = 'completed' and receipt_row.result_snapshot is not null then
      return pg_catalog.jsonb_set(receipt_row.result_snapshot, '{replayed}', 'true'::jsonb, true);
    end if;
  else
    insert into private.relic_charm_progression_receipts (
      user_id, request_id, operation, target_charm_id
    ) values (caller_id, request_id, 'convert', target_charm_id)
    on conflict (user_id, request_id) do nothing
    returning * into receipt_row;

    if receipt_row.id is null then
      select receipt.* into receipt_row
      from private.relic_charm_progression_receipts as receipt
      where receipt.user_id = caller_id
        and receipt.request_id = request_id
      for update;

      if receipt_row.operation <> 'convert' or receipt_row.target_charm_id <> target_charm_id then
        raise exception using errcode = '23505', message = 'Forge request id was reused for a different Forge action';
      end if;
      if receipt_row.status = 'completed' and receipt_row.result_snapshot is not null then
        return pg_catalog.jsonb_set(receipt_row.result_snapshot, '{replayed}', 'true'::jsonb, true);
      end if;
      raise exception using errcode = '40001', message = 'Forge conversion replay is unavailable';
    end if;
  end if;

  perform private.assert_relic_forge_open(caller_id);

  select charm.* into charm_row
  from public.user_relic_charms as charm
  where charm.id = target_charm_id
    and charm.user_id = caller_id
  for update;

  if charm_row.id is null then
    raise exception using errcode = '42501', message = 'Charm is not owned by the caller';
  end if;
  if charm_row.data #>> '{source,type}' = 'achievement'
    or charm_row.data ->> 'source' = 'achievement' then
    raise exception using errcode = '22023', message = 'Achievement charms cannot be converted';
  end if;
  if charm_row.data ->> 'equipped' = 'true' then
    raise exception using errcode = '22023', message = 'Equipped charms cannot be converted';
  end if;
  if nullif(charm_row.data ->> 'charm_key', '') is null then
    raise exception using errcode = '22023', message = 'Charm key is invalid';
  end if;

  perform charm.id
  from public.user_relic_charms as charm
  where charm.user_id = caller_id
    and charm.data ->> 'charm_key' = charm_row.data ->> 'charm_key'
  order by charm.id
  for update;

  select pg_catalog.count(*)::integer into owned_copy_count
  from public.user_relic_charms as charm
  where charm.user_id = caller_id
    and charm.data ->> 'charm_key' = charm_row.data ->> 'charm_key';

  if owned_copy_count <= 1 then
    raise exception using errcode = '22023', message = 'The final copy of a charm cannot be converted';
  end if;

  if coalesce(charm_row.data ->> 'star', '0') !~ '^[0-3]$' then
    raise exception using errcode = '22023', message = 'Charm progression state is invalid';
  end if;
  current_star := coalesce((charm_row.data ->> 'star')::smallint, 0);
  select salvage.* into salvage_row
  from public.relic_charm_salvage_catalog as salvage
  where salvage.rarity = charm_row.data ->> 'rarity'
    and salvage.star = current_star
    and salvage.active
  for share;

  if salvage_row.salvage_key is null then
    raise exception using errcode = '22023', message = 'No active conversion yield exists for this charm';
  end if;

  converted_snapshot := charm_row.data || pg_catalog.jsonb_build_object(
    'id', charm_row.id,
    'charm_key', charm_row.data ->> 'charm_key',
    'rarity', charm_row.data ->> 'rarity',
    'star', current_star,
    'tier', case current_star
      when 1 then 'awakened'
      when 2 then 'exalted'
      when 3 then 'ascendant'
      else 'dormant'
    end,
    'equipped', false,
    'source', coalesce(charm_row.data -> 'source', '"unknown"'::jsonb)
  );

  delete from public.user_relic_charms
  where id = charm_row.id
    and user_id = caller_id;

  for material_yield in
    select item.value
    from pg_catalog.jsonb_array_elements(salvage_row.material_yields) as item(value)
    order by item.value ->> 'key'
  loop
    if material_yield ->> 'key' !~ '^[a-z0-9-]+$'
      or material_yield ->> 'quantity' !~ '^[1-9][0-9]*$' then
      raise exception using errcode = '22023', message = 'Conversion catalog contains an invalid material yield';
    end if;
    material_result := private.post_material_entry(
      caller_id,
      material_yield ->> 'key',
      (material_yield ->> 'quantity')::bigint,
      'relic_charm_conversion',
      receipt_row.id,
      request_id,
      pg_catalog.jsonb_build_object('salvage_key', salvage_row.salvage_key, 'charm_id', charm_row.id)
    );
    material_results := material_results || pg_catalog.jsonb_build_array(material_result -> 'material');
  end loop;

  favor_result := private.post_favor_entry(
    caller_id,
    salvage_row.favor_yield,
    'relic_charm_conversion',
    receipt_row.id,
    request_id,
    pg_catalog.jsonb_build_object('salvage_key', salvage_row.salvage_key, 'charm_id', charm_row.id)
  );

  action_result_snapshot := pg_catalog.jsonb_build_object(
    'operation', 'convert',
    'receipt_id', receipt_row.id,
    'request_id', request_id,
    'replayed', false,
    'converted_charm', converted_snapshot,
    'favor', favor_result -> 'favor',
    'materials', material_results
  );

  update private.relic_charm_progression_receipts
  set status = 'completed',
      result_snapshot = action_result_snapshot,
      completed_at = pg_catalog.clock_timestamp()
  where id = receipt_row.id;

  return action_result_snapshot;
end;
$$;

lock table public.user_relic_charms in access exclusive mode;
revoke insert, update, delete on table public.user_relic_charms from anon, authenticated;
drop policy if exists "Users create own relic charms" on public.user_relic_charms;
drop policy if exists "Users update own relic charms" on public.user_relic_charms;
drop policy if exists "Users delete own relic charms" on public.user_relic_charms;

revoke all on function private.post_material_entry(uuid, text, bigint, text, uuid, uuid, jsonb)
from public, anon, authenticated;

revoke execute on function public.load_relic_forge_state() from public, anon;
grant execute on function public.load_relic_forge_state() to authenticated;

revoke execute on function public.upgrade_user_relic_charm(uuid, uuid) from public, anon;
grant execute on function public.upgrade_user_relic_charm(uuid, uuid) to authenticated;

revoke execute on function public.convert_duplicate_relic_charm(uuid, uuid) from public, anon;
grant execute on function public.convert_duplicate_relic_charm(uuid, uuid) to authenticated;

commit;
