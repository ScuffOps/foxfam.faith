create table if not exists public.scuffox_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scuffox_updates_data_gin on public.scuffox_updates using gin (data);
create index if not exists scuffox_updates_user_id_idx on public.scuffox_updates (user_id);
create index if not exists scuffox_updates_status_idx on public.scuffox_updates ((data ->> 'status'));

alter table public.scuffox_updates enable row level security;
alter table public.scuffox_updates force row level security;

revoke all on table public.scuffox_updates from anon;
revoke all on table public.scuffox_updates from authenticated;
grant select, insert, update, delete on table public.scuffox_updates to authenticated;

drop trigger if exists scuffox_updates_touch_updated_at on public.scuffox_updates;
create trigger scuffox_updates_touch_updated_at
before update on public.scuffox_updates
for each row execute function private.touch_updated_at();

drop policy if exists "Scuffox updates read" on public.scuffox_updates;
drop policy if exists "Scuffox updates create" on public.scuffox_updates;
drop policy if exists "Scuffox updates update" on public.scuffox_updates;
drop policy if exists "Scuffox updates delete" on public.scuffox_updates;

create policy "Scuffox updates read"
on public.scuffox_updates
for select
to authenticated
using (
  private.is_staff()
  or (
    data ->> 'status' = 'active'
    and nullif(data ->> 'title', '') is not null
    and nullif(data ->> 'message', '') is not null
    and (
      nullif(data ->> 'starts_at', '') is null
      or (data ->> 'starts_at')::timestamptz <= now()
    )
    and (
      nullif(data ->> 'expires_at', '') is null
      or (data ->> 'expires_at')::timestamptz > now()
    )
  )
);

create policy "Scuffox updates create"
on public.scuffox_updates
for insert
to authenticated
with check (private.is_staff() and jsonb_typeof(data) = 'object');

create policy "Scuffox updates update"
on public.scuffox_updates
for update
to authenticated
using (private.is_staff())
with check (private.is_staff() and jsonb_typeof(data) = 'object');

create policy "Scuffox updates delete"
on public.scuffox_updates
for delete
to authenticated
using (private.is_staff());
