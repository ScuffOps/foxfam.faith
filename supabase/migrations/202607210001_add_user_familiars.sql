create table if not exists public.user_familiars (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  species text not null default 'fox-cat' constraint user_familiars_species_allowed check (species in ('fox-cat', 'moon-rabbit', 'shrine-cat')),
  coat text not null default 'cream' constraint user_familiars_coat_allowed check (coat in ('cream', 'rose', 'mist', 'lily', 'malibu', 'lavender', 'taupe', 'teal-gray')),
  markings text not null default 'brow-star' constraint user_familiars_markings_allowed check (markings in ('brow-star', 'soft-mask', 'none', 'moon-brow', 'petal-cheeks', 'temple-mask')),
  outfit text not null default 'teal-tunic' constraint user_familiars_outfit_allowed check (outfit in ('none', 'teal-tunic', 'rose-cardigan', 'priory-apron', 'stargazer-cape')),
  accessory text not null default 'hymn-charm' constraint user_familiars_accessory_allowed check (accessory in ('none', 'hymn-charm', 'moon-ribbon', 'forge-goggles', 'petal-crown')),
  charm_fx text not null default 'none' constraint user_familiars_charm_fx_allowed check (charm_fx in ('none', 'celestial-butterflies', 'floating-sigils', 'stardust-trail')),
  catalog_version integer not null default 1 constraint user_familiars_catalog_version check (catalog_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_familiars_species_coat_match check (
    (species = 'fox-cat' and coat in ('cream', 'rose', 'mist'))
    or (species = 'moon-rabbit' and coat in ('lily', 'malibu', 'lavender'))
    or (species = 'shrine-cat' and coat in ('taupe', 'cream', 'teal-gray'))
  ),
  constraint user_familiars_species_markings_match check (
    (species = 'fox-cat' and markings in ('brow-star', 'soft-mask', 'none'))
    or (species = 'moon-rabbit' and markings in ('none', 'moon-brow', 'petal-cheeks'))
    or (species = 'shrine-cat' and markings in ('temple-mask', 'brow-star', 'none'))
  )
);

create or replace function public.secure_user_familiar_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;
  new.user_id := (select auth.uid());
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  return new;
end;
$$;

drop trigger if exists secure_user_familiar_owner on public.user_familiars;
create trigger secure_user_familiar_owner
before insert or update on public.user_familiars
for each row execute function public.secure_user_familiar_owner();

alter table public.user_familiars enable row level security;
alter table public.user_familiars force row level security;

drop policy if exists "user_familiars_owner_select" on public.user_familiars;
create policy "user_familiars_owner_select" on public.user_familiars
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "user_familiars_owner_insert" on public.user_familiars;
create policy "user_familiars_owner_insert" on public.user_familiars
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "user_familiars_owner_update" on public.user_familiars;
create policy "user_familiars_owner_update" on public.user_familiars
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_familiars_owner_delete" on public.user_familiars;
create policy "user_familiars_owner_delete" on public.user_familiars
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.user_familiars from public, anon;
grant select, insert, update, delete on table public.user_familiars to authenticated;
revoke all on function public.secure_user_familiar_owner() from public, anon, authenticated;
