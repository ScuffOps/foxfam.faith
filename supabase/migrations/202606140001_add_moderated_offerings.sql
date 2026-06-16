create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offerings_data_gin on public.offerings using gin (data);
create index if not exists offerings_user_id_idx on public.offerings (user_id);

alter table public.offerings enable row level security;

grant select, insert on public.offerings to anon, authenticated;
grant update, delete on public.offerings to authenticated;

drop trigger if exists offerings_touch_updated_at on public.offerings;
create trigger offerings_touch_updated_at
before update on public.offerings
for each row execute function private.touch_updated_at();

drop policy if exists "Public read approved offerings" on public.offerings;
create policy "Public read approved offerings"
on public.offerings for select
to anon, authenticated
using (
  jsonb_typeof(data) = 'object'
  and data ->> 'status' = 'approved'
);

drop policy if exists "Staff read offerings" on public.offerings;
create policy "Staff read offerings"
on public.offerings for select
to authenticated
using (private.is_staff());

drop policy if exists "Public create pending offerings" on public.offerings;
create policy "Public create pending offerings"
on public.offerings for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) >= 2
  and data ->> 'kind' in ('fanart', 'song', 'poetry', 'story', 'edit', 'other')
  and data ->> 'status' = 'pending'
);

drop policy if exists "Staff update offerings" on public.offerings;
create policy "Staff update offerings"
on public.offerings for update
to authenticated
using (private.is_staff())
with check (private.is_staff());

drop policy if exists "Staff delete offerings" on public.offerings;
create policy "Staff delete offerings"
on public.offerings for delete
to authenticated
using (private.is_staff());

drop policy if exists "Anon offering upload" on storage.objects;
create policy "Anon offering upload"
on storage.objects for insert
to anon
with check (
  bucket_id = 'community-uploads'
  and name like 'offerings/%'
);

drop policy if exists "Authenticated offering upload" on storage.objects;
create policy "Authenticated offering upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'community-uploads'
  and name like 'offerings/%'
);
