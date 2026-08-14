begin;

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

  select greatest(
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

revoke execute on function public.load_relic_forge_state() from public, anon;
grant execute on function public.load_relic_forge_state() to authenticated;

commit;
