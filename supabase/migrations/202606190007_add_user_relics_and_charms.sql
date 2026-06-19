create table if not exists public.user_relics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_relics_one_per_user unique (user_id)
);

create table if not exists public.user_relic_charms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_relics_data_gin on public.user_relics using gin (data);
create index if not exists user_relics_user_id_idx on public.user_relics (user_id);
create index if not exists user_relic_charms_data_gin on public.user_relic_charms using gin (data);
create index if not exists user_relic_charms_user_id_idx on public.user_relic_charms (user_id);
create index if not exists user_relic_charms_slot_idx on public.user_relic_charms ((data ->> 'slot'));
create index if not exists user_relic_charms_rarity_idx on public.user_relic_charms ((data ->> 'rarity'));

alter table public.user_relics enable row level security;
alter table public.user_relics force row level security;
alter table public.user_relic_charms enable row level security;
alter table public.user_relic_charms force row level security;

grant select, insert, update, delete on table public.user_relics to authenticated;
grant select, insert, update, delete on table public.user_relic_charms to authenticated;

drop trigger if exists user_relics_touch_updated_at on public.user_relics;
create trigger user_relics_touch_updated_at
before update on public.user_relics
for each row execute function private.touch_updated_at();

drop trigger if exists user_relic_charms_touch_updated_at on public.user_relic_charms;
create trigger user_relic_charms_touch_updated_at
before update on public.user_relic_charms
for each row execute function private.touch_updated_at();

drop policy if exists "Users read own relics" on public.user_relics;
drop policy if exists "Users create own relics" on public.user_relics;
drop policy if exists "Users update own relics" on public.user_relics;
drop policy if exists "Users delete own relics" on public.user_relics;
drop policy if exists "Users read own relic charms" on public.user_relic_charms;
drop policy if exists "Users create own relic charms" on public.user_relic_charms;
drop policy if exists "Users update own relic charms" on public.user_relic_charms;
drop policy if exists "Users delete own relic charms" on public.user_relic_charms;

create policy "Users read own relics"
on public.user_relics for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create own relics"
on public.user_relics for insert
to authenticated
with check ((select auth.uid()) = user_id and jsonb_typeof(data) = 'object');

create policy "Users update own relics"
on public.user_relics for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and jsonb_typeof(data) = 'object');

create policy "Users delete own relics"
on public.user_relics for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read own relic charms"
on public.user_relic_charms for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create own relic charms"
on public.user_relic_charms for insert
to authenticated
with check ((select auth.uid()) = user_id and jsonb_typeof(data) = 'object');

create policy "Users update own relic charms"
on public.user_relic_charms for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and jsonb_typeof(data) = 'object');

create policy "Users delete own relic charms"
on public.user_relic_charms for delete
to authenticated
using ((select auth.uid()) = user_id);
