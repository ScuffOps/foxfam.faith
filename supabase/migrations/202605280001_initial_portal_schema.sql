create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'user'
    check (role in ('admin', 'lead_mod', 'mod', 'favored', 'creator', 'foxfam', 'verified', 'user', 'guest')),
  display_name text,
  avatar_url text,
  accent_color text,
  notification_preferences jsonb not null default '{}'::jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert (id, email, display_name) on public.profiles to authenticated;
grant update (display_name, avatar_url, accent_color, notification_preferences, onboarded) on public.profiles to authenticated;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users insert their profile" on public.profiles;
create policy "Users insert their profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users update their profile" on public.profiles;
create policy "Users update their profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function private.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(role, 'guest')
  from public.profiles
  where id = auth.uid()
$$;

revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_role() to anon, authenticated;

create or replace function private.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(private.current_user_role() in ('admin', 'lead_mod', 'mod'), false)
$$;

revoke all on function private.is_staff() from public;
grant execute on function private.is_staff() to anon, authenticated;

do $$
declare
  table_name text;
  public_read_tables text[] := array[
    'birthdays', 'blessings', 'blessing_comments', 'bug_reports', 'codex_entries',
    'community_posts', 'community_post_comments', 'community_threads',
    'community_thread_comments', 'events', 'prayers', 'reliquary_comments',
    'reliquary_entries', 'suggestions', 'thoughts', 'user_levels', 'user_notifications'
  ];
  public_create_tables text[] := array[
    'birthdays', 'blessing_comments', 'bug_reports', 'community_posts',
    'community_post_comments', 'community_threads', 'community_thread_comments',
    'prayers', 'reliquary_comments', 'suggestions', 'user_notifications'
  ];
  staff_create_tables text[] := array[
    'blessings', 'codex_entries', 'events', 'reliquary_entries', 'thoughts'
  ];
  all_tables text[] := array[
    'birthdays', 'blessings', 'blessing_comments', 'bug_reports', 'codex_entries',
    'collab_requests', 'community_posts', 'community_post_comments', 'community_threads',
    'community_thread_comments', 'events', 'prayers', 'reliquary_comments',
    'reliquary_entries', 'suggestions', 'sync_states', 'thoughts', 'user_levels',
    'user_notifications'
  ];
begin
  foreach table_name in array all_tables loop
    execute format(
      'create table if not exists public.%I (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete set null,
        created_by text,
        data jsonb not null default ''{}''::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )',
      table_name
    );

    execute format('create index if not exists %I on public.%I using gin (data)', table_name || '_data_gin', table_name);
    execute format('create index if not exists %I on public.%I (user_id)', table_name || '_user_id_idx', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert on public.%I to anon, authenticated', table_name);
    execute format('grant update, delete on public.%I to authenticated', table_name);

    execute format('drop trigger if exists %I on public.%I', table_name || '_touch_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.touch_updated_at()',
      table_name || '_touch_updated_at',
      table_name
    );

    execute format('drop policy if exists "Public read" on public.%I', table_name);
    if table_name = any(public_read_tables) then
      execute format(
        'create policy "Public read" on public.%I for select to anon, authenticated using (true)',
        table_name
      );
    elsif table_name = 'collab_requests' then
      execute format(
        'create policy "Collab read" on public.%I for select to authenticated using (private.is_staff() or user_id = (select auth.uid()) or created_by = ((select auth.jwt()) ->> ''email''))',
        table_name
      );
    else
      execute format(
        'create policy "Staff read" on public.%I for select to authenticated using (private.is_staff())',
        table_name
      );
    end if;

    execute format('drop policy if exists "Public create" on public.%I', table_name);
    if table_name = any(public_create_tables) then
      execute format(
        'create policy "Public create" on public.%I for insert to anon, authenticated with check (true)',
        table_name
      );
    elsif table_name = 'collab_requests' then
      execute format(
        'create policy "Creator create" on public.%I for insert to authenticated with check (private.current_user_role() in (''creator'', ''favored'', ''mod'', ''lead_mod'', ''admin''))',
        table_name
      );
    elsif table_name = 'user_levels' then
      execute format(
        'create policy "User level create" on public.%I for insert to authenticated with check (private.is_staff() or data ->> ''user_email'' = ((select auth.jwt()) ->> ''email''))',
        table_name
      );
    elsif table_name = any(staff_create_tables) then
      execute format(
        'create policy "Staff create" on public.%I for insert to authenticated with check (private.is_staff())',
        table_name
      );
    end if;

    execute format('drop policy if exists "Owner or staff update" on public.%I', table_name);
    execute format(
      'create policy "Owner or staff update" on public.%I for update to authenticated using (private.is_staff() or user_id = (select auth.uid()) or created_by = ((select auth.jwt()) ->> ''email'')) with check (private.is_staff() or user_id = (select auth.uid()) or created_by = ((select auth.jwt()) ->> ''email''))',
      table_name
    );

    execute format('drop policy if exists "Owner or staff delete" on public.%I', table_name);
    execute format(
      'create policy "Owner or staff delete" on public.%I for delete to authenticated using (private.is_staff() or user_id = (select auth.uid()) or created_by = ((select auth.jwt()) ->> ''email''))',
      table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('community-uploads', 'community-uploads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public upload read" on storage.objects;
create policy "Public upload read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'community-uploads');

drop policy if exists "Authenticated upload insert" on storage.objects;
create policy "Authenticated upload insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'community-uploads');

drop policy if exists "Uploader update own objects" on storage.objects;
create policy "Uploader update own objects"
on storage.objects for update
to authenticated
using (bucket_id = 'community-uploads' and owner = (select auth.uid()))
with check (bucket_id = 'community-uploads' and owner = (select auth.uid()));

drop policy if exists "Uploader delete own objects" on storage.objects;
create policy "Uploader delete own objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'community-uploads' and owner = (select auth.uid()));
