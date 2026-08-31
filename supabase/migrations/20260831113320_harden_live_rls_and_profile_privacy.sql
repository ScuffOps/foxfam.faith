-- Reconcile schema changes that were applied to production outside Git, then
-- tighten the exposed RPC surface and profile privacy grants.

create table if not exists public.forum_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text not null default '',
  message text not null check (char_length(message) between 1 and 1200),
  reply_to_id uuid references public.forum_chat_messages(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_chat_reactions (
  message_id uuid not null references public.forum_chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('praise', 'heart', 'flame')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

create table if not exists public.forum_chat_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_chat_messages_created_at_idx
  on public.forum_chat_messages (created_at desc);
create index if not exists forum_chat_messages_reply_to_id_idx
  on public.forum_chat_messages (reply_to_id) where reply_to_id is not null;
create index if not exists forum_chat_messages_user_id_idx
  on public.forum_chat_messages (user_id);
create index if not exists forum_chat_reactions_user_id_idx
  on public.forum_chat_reactions (user_id);

alter table public.forum_chat_messages enable row level security;
alter table public.forum_chat_reactions enable row level security;
alter table public.forum_chat_reads enable row level security;

grant select, insert, update, delete on public.forum_chat_messages to authenticated;
grant select, insert, delete on public.forum_chat_reactions to authenticated;
grant select, insert, update on public.forum_chat_reads to authenticated;

drop policy if exists "Authenticated read forum chat" on public.forum_chat_messages;
create policy "Authenticated read forum chat"
on public.forum_chat_messages for select to authenticated using (true);

drop policy if exists "Users create own forum chat messages" on public.forum_chat_messages;
create policy "Users create own forum chat messages"
on public.forum_chat_messages for insert to authenticated
with check ((select auth.uid()) = user_id and is_deleted = false);

drop policy if exists "Owners or staff update forum chat messages" on public.forum_chat_messages;
create policy "Owners or staff update forum chat messages"
on public.forum_chat_messages for update to authenticated
using ((select auth.uid()) = user_id or private.can_moderate_forum())
with check ((select auth.uid()) = user_id or private.can_moderate_forum());

drop policy if exists "Authenticated read forum chat reactions" on public.forum_chat_reactions;
create policy "Authenticated read forum chat reactions"
on public.forum_chat_reactions for select to authenticated using (true);

drop policy if exists "Users create own forum chat reactions" on public.forum_chat_reactions;
create policy "Users create own forum chat reactions"
on public.forum_chat_reactions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own forum chat reactions" on public.forum_chat_reactions;
create policy "Users delete own forum chat reactions"
on public.forum_chat_reactions for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read own forum chat state" on public.forum_chat_reads;
create policy "Users read own forum chat state"
on public.forum_chat_reads for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create own forum chat state" on public.forum_chat_reads;
create policy "Users create own forum chat state"
on public.forum_chat_reads for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own forum chat state" on public.forum_chat_reads;
create policy "Users update own forum chat state"
on public.forum_chat_reads for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'forum_chat_messages'
    ) then
      alter publication supabase_realtime add table public.forum_chat_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'forum_chat_reactions'
    ) then
      alter publication supabase_realtime add table public.forum_chat_reactions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'forum_chat_reads'
    ) then
      alter publication supabase_realtime add table public.forum_chat_reads;
    end if;
  end if;
end
$$;

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' and char_length(slug) <= 48),
  label text not null check (char_length(btrim(label)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_categories_active_order_idx
  on public.forum_categories (is_active, sort_order, label);
create index if not exists forum_categories_created_by_idx
  on public.forum_categories (created_by);

alter table public.forum_categories enable row level security;
grant select on public.forum_categories to anon, authenticated;
grant insert, update, delete on public.forum_categories to authenticated;

drop trigger if exists forum_categories_touch_updated_at on public.forum_categories;
create trigger forum_categories_touch_updated_at
before update on public.forum_categories
for each row execute function private.touch_updated_at();

drop policy if exists "Forum categories are managed by leads" on public.forum_categories;
drop policy if exists "Forum categories are readable" on public.forum_categories;
drop policy if exists "Forum categories are created by leads" on public.forum_categories;
drop policy if exists "Forum categories are updated by leads" on public.forum_categories;
drop policy if exists "Forum categories are deleted by leads" on public.forum_categories;

create policy "Forum categories are readable"
on public.forum_categories for select to anon, authenticated
using (is_active or private.current_user_role() in ('admin', 'lead_mod'));

create policy "Forum categories are created by leads"
on public.forum_categories for insert to authenticated
with check (private.current_user_role() in ('admin', 'lead_mod'));

create policy "Forum categories are updated by leads"
on public.forum_categories for update to authenticated
using (private.current_user_role() in ('admin', 'lead_mod'))
with check (private.current_user_role() in ('admin', 'lead_mod'));

create policy "Forum categories are deleted by leads"
on public.forum_categories for delete to authenticated
using (private.current_user_role() in ('admin', 'lead_mod'));

insert into public.forum_categories (slug, label, description, sort_order)
values
  ('general', 'General', 'Open chat, questions, and everyday Foxfam threads.', 0),
  ('introductions', 'Introductions', 'New here? Step into the circle and say hello.', 1),
  ('veri_lore', 'Veri Lore', 'Shrine theories, stream callbacks, and sacred nonsense.', 2),
  ('fanworks', 'Fanworks', 'Share WIPs, edits, poems, songs, and creative offerings.', 3),
  ('stream_chat', 'Stream Chat', 'Episode reactions, clips, quotes, and live community chatter.', 4),
  ('help_desk', 'Help Desk', 'Portal help, community questions, and gentle troubleshooting.', 5),
  ('off_topic', 'Off Topic', 'Low-stakes chatter that does not need a formal altar.', 6)
on conflict (slug) do nothing;

drop policy if exists "Staff create" on public.blessings;
drop policy if exists "Admin create" on public.blessings;
create policy "Admin create"
on public.blessings for insert to authenticated
with check (
  private.current_user_role() = 'admin'
  and jsonb_typeof(data) = 'object'
  and length(btrim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Staff create" on public.reliquary_entries;
drop policy if exists "Admin create" on public.reliquary_entries;
create policy "Admin create"
on public.reliquary_entries for insert to authenticated
with check (
  private.current_user_role() = 'admin'
  and jsonb_typeof(data) = 'object'
  and length(btrim(coalesce(data ->> 'title', ''))) > 0
  and length(btrim(coalesce(data ->> 'body', ''))) > 0
);

create or replace function private.guard_birthday_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_staff() then return new; end if;
  if (old.data - 'is_visible') is distinct from (new.data - 'is_visible')
    or old.user_id is distinct from new.user_id
    or old.created_at is distinct from new.created_at then
    raise insufficient_privilege using message = 'Birthday recipients can only change profile visibility.';
  end if;
  return new;
end;
$$;

create or replace function private.notify_birthday_wish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if nullif(new.data ->> 'recipient_user_id', '') is null then return new; end if;
  recipient := (new.data ->> 'recipient_user_id')::uuid;
  insert into public.user_notifications (user_id, data)
  values (recipient, jsonb_build_object(
    'recipient_user_id', recipient::text,
    'type', 'birthday_wish',
    'title', 'A birthday wish arrived',
    'message', left(coalesce(new.data ->> 'message', ''), 355),
    'source_type', 'birthday_message',
    'source_id', new.id::text,
    'action_url', '/activity?category=birthdays',
    'read', false
  ));
  return new;
exception when invalid_text_representation then
  return new;
end;
$$;

drop trigger if exists guard_birthday_message_update on public.birthday_messages;
create trigger guard_birthday_message_update
before update on public.birthday_messages
for each row execute function private.guard_birthday_message_update();

drop trigger if exists notify_birthday_wish on public.birthday_messages;
create trigger notify_birthday_wish
after insert on public.birthday_messages
for each row execute function private.notify_birthday_wish();

drop policy if exists "Birthday wishes are readable" on public.birthday_messages;
drop policy if exists "Birthday wishes read" on public.birthday_messages;
create policy "Birthday wishes are readable"
on public.birthday_messages for select to anon, authenticated
using (
  coalesce((data ->> 'is_visible')::boolean, true)
  or data ->> 'recipient_user_id' = (select auth.uid())::text
  or private.is_staff()
);

drop policy if exists "Anyone can leave a birthday wish" on public.birthday_messages;
drop policy if exists "Birthday wishes create" on public.birthday_messages;
create policy "Birthday wishes create"
on public.birthday_messages for insert to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(btrim(coalesce(data ->> 'message', ''))) between 1 and 355
  and nullif(btrim(coalesce(data ->> 'recipient_user_id', '')), '') is not null
  and exists (
    select 1
    from public.birthdays as birthday
    where birthday.id::text = birthday_messages.data ->> 'birthday_id'
      and birthday.data ->> 'status' = 'approved'
      and right(birthday.data ->> 'birthday_date', 5) = any (array[
        to_char(current_date - 1, 'MM-DD'),
        to_char(current_date, 'MM-DD'),
        to_char(current_date + 1, 'MM-DD')
      ])
      and coalesce(nullif(birthday.data ->> 'recipient_user_id', ''), birthday.user_id::text, '')
        = birthday_messages.data ->> 'recipient_user_id'
  )
);

drop policy if exists "Authors recipients or staff delete birthday wishes" on public.birthday_messages;
drop policy if exists "Birthday wish owners delete" on public.birthday_messages;
create policy "Authors recipients or staff delete birthday wishes"
on public.birthday_messages for delete to authenticated
using (
  user_id = (select auth.uid())
  or data ->> 'recipient_user_id' = (select auth.uid())::text
  or private.is_staff()
);

drop policy if exists "Birthday recipients update visibility" on public.birthday_messages;
create policy "Birthday recipients update visibility"
on public.birthday_messages for update to authenticated
using (data ->> 'recipient_user_id' = (select auth.uid())::text or private.is_staff())
with check (data ->> 'recipient_user_id' = (select auth.uid())::text or private.is_staff());

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select profile.*
  from public.profiles as profile
  where profile.id = (select auth.uid())
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

revoke select (notification_preferences, onboarded) on public.profiles from anon, authenticated;
grant select (
  id, role, display_name, avatar_url, accent_color, profile_status,
  bio, favorite_shrine, created_at, updated_at
) on public.profiles to anon, authenticated;

revoke execute on function public.mark_user_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_user_notifications_read(uuid[]) to authenticated;
revoke execute on function public.set_profile_display_name(uuid, text) from public, anon;
grant execute on function public.set_profile_display_name(uuid, text) to authenticated;
revoke execute on function public.set_profile_role(uuid, text) from public, anon, authenticated;
grant execute on function public.set_profile_role(uuid, text) to service_role;
revoke execute on function public.set_profile_role(uuid, text, text) from public, anon;
grant execute on function public.set_profile_role(uuid, text, text) to authenticated;
revoke execute on function public.set_birthday_message_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_birthday_message_visibility(uuid, boolean) to authenticated;

revoke execute on function private.guard_interaction_update() from public, anon, authenticated;
revoke execute on function private.guard_birthday_message_update() from public, anon, authenticated;
revoke execute on function private.notify_birthday_wish() from public, anon, authenticated;
revoke execute on function private.touch_updated_at() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

drop policy if exists "Staff create" on public.staff_time_entries;
drop policy if exists "Staff update" on public.staff_time_entries;
drop policy if exists "Staff delete" on public.staff_time_entries;
drop policy if exists "Staff create" on public.mod_shifts;
drop policy if exists "Staff update" on public.mod_shifts;
drop policy if exists "Staff delete" on public.mod_shifts;
drop policy if exists "Staff create" on public.shift_planner_assignments;
drop policy if exists "Staff update" on public.shift_planner_assignments;
drop policy if exists "Staff delete" on public.shift_planner_assignments;

create index if not exists calendar_sync_runs_connection_id_idx
  on public.calendar_sync_runs (connection_id);
create index if not exists role_audit_logs_actor_profile_id_idx
  on public.role_audit_logs (actor_profile_id);
create index if not exists role_audit_logs_target_profile_id_idx
  on public.role_audit_logs (target_profile_id);
