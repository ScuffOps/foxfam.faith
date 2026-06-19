create table if not exists public.role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  previous_role text not null
    check (previous_role in ('admin', 'lead_mod', 'mod', 'favored', 'creator', 'foxfam', 'verified', 'user', 'guest')),
  new_role text not null
    check (new_role in ('admin', 'lead_mod', 'mod', 'favored', 'creator', 'foxfam', 'verified', 'user', 'guest')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.role_audit_logs enable row level security;

revoke all on public.role_audit_logs from anon, authenticated;
grant select on public.role_audit_logs to authenticated;

drop policy if exists "Admins read role audit logs" on public.role_audit_logs;
create policy "Admins read role audit logs"
on public.role_audit_logs for select
to authenticated
using (private.current_user_role() = 'admin');

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(private.current_user_role() = 'admin', false)
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create or replace function public.set_profile_role(
  target_profile_id uuid,
  new_role text,
  reason text default null
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
set search_path = public, private, pg_temp
as $$
declare
  actor_id uuid := (select auth.uid());
  previous_role text;
  normalized_role text := lower(trim(replace(new_role, '-', '_')));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'You must be signed in to manage access levels.';
  end if;

  if not private.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only admins can manage access levels.';
  end if;

  if target_profile_id = actor_id then
    raise exception using
      errcode = '22023',
      message = 'Admins cannot change their own access level.';
  end if;

  if normalized_role not in ('admin', 'lead_mod', 'mod', 'favored', 'creator', 'foxfam', 'verified', 'user', 'guest') then
    raise exception using
      errcode = '22023',
      message = 'Unsupported access level.';
  end if;

  select p.role
  into previous_role
  from public.profiles p
  where p.id = target_profile_id
  for update;

  if previous_role is null then
    raise exception using
      errcode = 'P0002',
      message = 'Profile not found.';
  end if;

  update public.profiles p
  set role = normalized_role
  where p.id = target_profile_id;

  insert into public.role_audit_logs (
    actor_profile_id,
    target_profile_id,
    previous_role,
    new_role,
    note
  )
  values (
    actor_id,
    target_profile_id,
    previous_role,
    normalized_role,
    nullif(trim(reason), '')
  );

  return query
  select
    p.id,
    p.role,
    p.display_name,
    p.avatar_url,
    p.accent_color,
    p.notification_preferences,
    p.onboarded,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = target_profile_id;
end;
$$;

revoke all on function public.set_profile_role(uuid, text, text) from public;
grant execute on function public.set_profile_role(uuid, text, text) to authenticated;
