create table if not exists public.staff_brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_brain_dumps_data_gin on public.staff_brain_dumps using gin (data);
create index if not exists staff_brain_dumps_user_id_idx on public.staff_brain_dumps (user_id);
create index if not exists staff_brain_dumps_status_idx on public.staff_brain_dumps ((data ->> 'status'));
create index if not exists staff_brain_dumps_priority_idx on public.staff_brain_dumps ((data ->> 'priority'));

alter table public.staff_brain_dumps enable row level security;
alter table public.staff_brain_dumps force row level security;

revoke all on table public.staff_brain_dumps from anon;
revoke all on table public.staff_brain_dumps from authenticated;
grant select, insert, update, delete on table public.staff_brain_dumps to authenticated;

drop trigger if exists staff_brain_dumps_touch_updated_at on public.staff_brain_dumps;
create trigger staff_brain_dumps_touch_updated_at
before update on public.staff_brain_dumps
for each row execute function private.touch_updated_at();

drop policy if exists "Staff read" on public.staff_brain_dumps;
drop policy if exists "Staff create" on public.staff_brain_dumps;
drop policy if exists "Staff update" on public.staff_brain_dumps;
drop policy if exists "Staff delete" on public.staff_brain_dumps;

create policy "Staff read"
on public.staff_brain_dumps for select
to authenticated
using (private.is_staff());

create policy "Staff create"
on public.staff_brain_dumps for insert
to authenticated
with check (
  private.is_staff()
  and jsonb_typeof(data) = 'object'
);

create policy "Staff update"
on public.staff_brain_dumps for update
to authenticated
using (private.is_staff())
with check (
  private.is_staff()
  and jsonb_typeof(data) = 'object'
);

create policy "Staff delete"
on public.staff_brain_dumps for delete
to authenticated
using (private.is_staff());
