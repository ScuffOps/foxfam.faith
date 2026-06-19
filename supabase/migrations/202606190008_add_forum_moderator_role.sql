alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'admin',
      'lead_mod',
      'mod',
      'forum_moderator',
      'favored',
      'creator',
      'foxfam',
      'verified',
      'user',
      'guest'
    )
  );

create or replace function private.can_moderate_forum()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(private.current_user_role() in ('admin', 'lead_mod', 'mod', 'forum_moderator'), false)
$$;

revoke all on function private.can_moderate_forum() from public;
grant execute on function private.can_moderate_forum() to authenticated;

create or replace function public.set_profile_role(
  target_profile_id uuid,
  new_role text
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
  actor_role text;
  cleaned_role text;
begin
  actor_role := private.current_user_role();
  cleaned_role := nullif(btrim(lower(replace(new_role, '-', '_'))), '');

  if actor_role not in ('admin', 'lead_mod') then
    raise exception 'Only admins and lead mods can change roles';
  end if;

  if target_profile_id = auth.uid() then
    raise exception 'Self-role changes are blocked';
  end if;

  if cleaned_role not in (
    'admin',
    'lead_mod',
    'mod',
    'forum_moderator',
    'favored',
    'creator',
    'foxfam',
    'verified',
    'user',
    'guest'
  ) then
    raise exception 'Unknown role';
  end if;

  if actor_role = 'lead_mod' and cleaned_role in ('admin', 'lead_mod') then
    raise exception 'Lead mods cannot assign admin or lead mod roles';
  end if;

  return query
  update public.profiles
  set role = cleaned_role
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

revoke all on function public.set_profile_role(uuid, text) from public;
grant execute on function public.set_profile_role(uuid, text) to authenticated;

drop policy if exists "Forum moderator update" on public.community_threads;
create policy "Forum moderator update"
on public.community_threads
for update
to authenticated
using (private.can_moderate_forum())
with check (private.can_moderate_forum());

drop policy if exists "Forum moderator delete" on public.community_threads;
create policy "Forum moderator delete"
on public.community_threads
for delete
to authenticated
using (private.can_moderate_forum());

drop policy if exists "Forum moderator update" on public.community_thread_comments;
create policy "Forum moderator update"
on public.community_thread_comments
for update
to authenticated
using (private.can_moderate_forum())
with check (private.can_moderate_forum());

drop policy if exists "Forum moderator delete" on public.community_thread_comments;
create policy "Forum moderator delete"
on public.community_thread_comments
for delete
to authenticated
using (private.can_moderate_forum());
