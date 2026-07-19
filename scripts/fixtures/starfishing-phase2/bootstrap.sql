\set ON_ERROR_STOP on

begin;

create schema if not exists private;

create table if not exists private.phase2_disposable_smoke_sentinel (
  singleton boolean primary key default true check (singleton),
  project_ref text not null check (
    project_ref ~ '^[a-z0-9]{20}$'
    and project_ref <> 'wdypokgdqgvqpyabvshq'
  ),
  nonce text not null check (nonce ~ '^[0-9a-f]{32,128}$'),
  disposable boolean not null check (disposable),
  expires_at timestamptz not null,
  user_a_id uuid not null,
  user_b_id uuid not null check (user_b_id <> user_a_id),
  user_a_starting_favor bigint not null check (user_a_starting_favor >= 0),
  user_b_starting_favor bigint not null check (user_b_starting_favor >= 0),
  provisioned_at timestamptz not null default pg_catalog.clock_timestamp()
);

revoke all on table private.phase2_disposable_smoke_sentinel
from public, anon, authenticated;

select (
  :'phase2_project_ref' ~ '^[a-z0-9]{20}$'
  and :'phase2_project_ref' <> 'wdypokgdqgvqpyabvshq'
) as phase2_valid_project_ref \gset
\if :phase2_valid_project_ref
\else
  \echo 'Invalid disposable project ref'
  \quit 3
\endif

select (:'phase2_nonce' ~ '^[0-9a-f]{32,128}$') as phase2_valid_nonce \gset
\if :phase2_valid_nonce
\else
  \echo 'Invalid disposable fixture nonce'
  \quit 3
\endif

select (
  :'phase2_expires_at'::timestamptz > pg_catalog.clock_timestamp()
  and :'phase2_expires_at'::timestamptz
    <= pg_catalog.clock_timestamp() + interval '7 days'
) as phase2_valid_expiry \gset
\if :phase2_valid_expiry
\else
  \echo 'Invalid disposable fixture expiry'
  \quit 3
\endif

select (
  :'phase2_user_a_id'::uuid <> :'phase2_user_b_id'::uuid
) as phase2_valid_users \gset
\if :phase2_valid_users
\else
  \echo 'Disposable fixture users must be distinct'
  \quit 3
\endif

insert into private.phase2_disposable_smoke_sentinel (
  singleton,
  project_ref,
  nonce,
  disposable,
  expires_at,
  user_a_id,
  user_b_id,
  user_a_starting_favor,
  user_b_starting_favor,
  provisioned_at
)
values (
  true,
  :'phase2_project_ref',
  :'phase2_nonce',
  true,
  :'phase2_expires_at'::timestamptz,
  :'phase2_user_a_id'::uuid,
  :'phase2_user_b_id'::uuid,
  :'phase2_user_a_starting_favor'::bigint,
  :'phase2_user_b_starting_favor'::bigint,
  pg_catalog.clock_timestamp()
)
on conflict (singleton) do update
set project_ref = excluded.project_ref,
    nonce = excluded.nonce,
    disposable = excluded.disposable,
    expires_at = excluded.expires_at,
    user_a_id = excluded.user_a_id,
    user_b_id = excluded.user_b_id,
    user_a_starting_favor = excluded.user_a_starting_favor,
    user_b_starting_favor = excluded.user_b_starting_favor,
    provisioned_at = excluded.provisioned_at;

create or replace function public.assert_phase2_disposable_smoke_target()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $sentinel$
declare
  sentinel private.phase2_disposable_smoke_sentinel%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select target.*
  into sentinel
  from private.phase2_disposable_smoke_sentinel as target
  where target.singleton
    and target.disposable
    and target.expires_at > pg_catalog.clock_timestamp();

  if sentinel.project_ref is null then
    raise exception using errcode = '55000', message = 'Disposable sentinel missing or expired';
  end if;

  return pg_catalog.jsonb_build_object(
    'project_ref', sentinel.project_ref,
    'nonce', sentinel.nonce,
    'disposable', sentinel.disposable,
    'expires_at', sentinel.expires_at,
    'user_a_id', sentinel.user_a_id,
    'user_b_id', sentinel.user_b_id,
    'user_a_starting_favor', sentinel.user_a_starting_favor,
    'user_b_starting_favor', sentinel.user_b_starting_favor
  );
end;
$sentinel$;

revoke all on function public.assert_phase2_disposable_smoke_target()
from public, anon, authenticated;
grant execute on function public.assert_phase2_disposable_smoke_target()
to authenticated;

create or replace function public.start_starfishing_timing_test()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $timing_test$
declare
  cast_result jsonb;
  timing_not_before timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  cast_result := public.start_starfishing_cast();
  timing_not_before := pg_catalog.clock_timestamp() + interval '15 seconds';

  update public.game_cast_tickets
  set not_before = timing_not_before
  where id = (cast_result ->> 'ticket_id')::uuid
    and user_id = (select auth.uid())
    and consumed_at is null;

  if not found then
    raise exception using errcode = '55000', message = 'Timing-test cast ticket was not created';
  end if;

  return pg_catalog.jsonb_set(
    cast_result,
    '{not_before}',
    pg_catalog.to_jsonb(timing_not_before),
    true
  );
end;
$timing_test$;

revoke all on function public.start_starfishing_timing_test()
from public, anon, authenticated;

insert into public.user_trophies (
  user_id,
  trophy_key,
  data
)
values (
  :'phase2_user_a_id'::uuid,
  'phase2-smoke-isolation',
  pg_catalog.jsonb_build_object('fixture_nonce', :'phase2_nonce')
)
on conflict (user_id, trophy_key) do update
set data = excluded.data,
    acquired_at = pg_catalog.clock_timestamp();

commit;
