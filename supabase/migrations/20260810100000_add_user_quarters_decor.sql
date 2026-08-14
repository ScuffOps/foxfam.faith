begin;

create table if not exists public.user_quarters_decor (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  rug_key text not null default 'moonweave-rug' constraint user_quarters_decor_rug_allowed check (rug_key in ('moonweave-rug', 'petal-rug', 'moss-rug')),
  wall_key text not null default 'crescent-banner' constraint user_quarters_decor_wall_allowed check (wall_key in ('crescent-banner', 'bloom-banner', 'clock-banner')),
  shelf_key text not null default 'star-lantern' constraint user_quarters_decor_shelf_allowed check (shelf_key in ('star-lantern', 'fish-keepsake', 'bloom-vase')),
  nook_key text not null default 'moon-cushion' constraint user_quarters_decor_nook_allowed check (nook_key in ('moon-cushion', 'petal-cushion', 'moss-basket')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.secure_user_quarters_decor_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  new.user_id := (select auth.uid());
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  return new;
end;
$$;

drop trigger if exists secure_user_quarters_decor_owner on public.user_quarters_decor;
create trigger secure_user_quarters_decor_owner
before insert or update on public.user_quarters_decor
for each row execute function public.secure_user_quarters_decor_owner();

alter table public.user_quarters_decor enable row level security;
alter table public.user_quarters_decor force row level security;

drop policy if exists "user_quarters_decor_authenticated_select" on public.user_quarters_decor;
create policy "user_quarters_decor_authenticated_select" on public.user_quarters_decor
for select to authenticated using (true);

drop policy if exists "user_quarters_decor_owner_insert" on public.user_quarters_decor;
create policy "user_quarters_decor_owner_insert" on public.user_quarters_decor
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "user_quarters_decor_owner_update" on public.user_quarters_decor;
create policy "user_quarters_decor_owner_update" on public.user_quarters_decor
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "user_quarters_decor_owner_delete" on public.user_quarters_decor;
create policy "user_quarters_decor_owner_delete" on public.user_quarters_decor
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.user_quarters_decor from public, anon;
grant select, insert, update, delete on table public.user_quarters_decor to authenticated;
revoke all on function public.secure_user_quarters_decor_owner() from public, anon, authenticated;

commit;
