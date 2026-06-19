do $$
declare
  table_name text;
  staff_tables text[] := array[
    'mod_shifts',
    'staff_time_entries',
    'bot_commands'
  ];
begin
  foreach table_name in array staff_tables loop
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
    execute format('alter table public.%I force row level security', table_name);

    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);

    execute format('drop trigger if exists %I on public.%I', table_name || '_touch_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.touch_updated_at()',
      table_name || '_touch_updated_at',
      table_name
    );

    execute format('drop policy if exists "Staff read" on public.%I', table_name);
    execute format('drop policy if exists "Staff create" on public.%I', table_name);
    execute format('drop policy if exists "Staff update" on public.%I', table_name);
    execute format('drop policy if exists "Staff delete" on public.%I', table_name);

    execute format(
      'create policy "Staff read" on public.%I for select to authenticated using (private.is_staff())',
      table_name
    );
    execute format(
      'create policy "Staff create" on public.%I for insert to authenticated with check (private.is_staff() and jsonb_typeof(data) = ''object'')',
      table_name
    );
    execute format(
      'create policy "Staff update" on public.%I for update to authenticated using (private.is_staff()) with check (private.is_staff() and jsonb_typeof(data) = ''object'')',
      table_name
    );
    execute format(
      'create policy "Staff delete" on public.%I for delete to authenticated using (private.is_staff())',
      table_name
    );
  end loop;
end $$;

create or replace function public.set_profile_display_name(
  target_profile_id uuid,
  new_display_name text
)
returns table (
  id uuid,
  role text,
  display_name text,
  avatar_url text,
  accent_color text,
  notification_preferences jsonb,
  onboarded boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  cleaned_display_name text;
begin
  if not private.is_staff() then
    raise exception 'Only staff can change member display names';
  end if;

  cleaned_display_name := nullif(btrim(new_display_name), '');

  if cleaned_display_name is null then
    raise exception 'Display name is required';
  end if;

  if length(cleaned_display_name) > 80 then
    raise exception 'Display name must be 80 characters or fewer';
  end if;

  return query
  update public.profiles
  set display_name = cleaned_display_name
  where profiles.id = target_profile_id
  returning
    profiles.id,
    profiles.role,
    profiles.display_name,
    profiles.avatar_url,
    profiles.accent_color,
    profiles.notification_preferences,
    profiles.onboarded,
    profiles.created_at,
    profiles.updated_at;
end;
$$;

revoke all on function public.set_profile_display_name(uuid, text) from public;
grant execute on function public.set_profile_display_name(uuid, text) to authenticated;
