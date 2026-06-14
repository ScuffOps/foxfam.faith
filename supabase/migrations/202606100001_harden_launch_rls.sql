create or replace function private.guard_interaction_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_keys text[] := TG_ARGV;
begin
  if private.is_staff() then
    return new;
  end if;

  if old.user_id is distinct from new.user_id
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at then
    raise insufficient_privilege using message = 'Only staff can change row ownership metadata.';
  end if;

  if (old.data - allowed_keys) is distinct from (new.data - allowed_keys) then
    raise insufficient_privilege using message = 'Only interaction fields can be updated publicly.';
  end if;

  return new;
end;
$$;

create or replace function private.portal_row_owner(row_user_id uuid, row_data jsonb)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    row_user_id = auth.uid()
    or row_data ->> 'user_key' = ('user:' || auth.uid()::text)
    or row_data ->> 'recipient_user_id' = auth.uid()::text,
    false
  )
$$;

revoke all on function private.portal_row_owner(uuid, jsonb) from public;
grant execute on function private.portal_row_owner(uuid, jsonb) to anon, authenticated;

do $$
declare
  table_name text;
  all_tables text[] := array[
    'birthdays', 'blessings', 'blessing_comments', 'bug_reports', 'codex_entries',
    'collab_requests', 'community_posts', 'community_post_comments', 'community_threads',
    'community_thread_comments', 'events', 'prayers', 'reliquary_comments',
    'reliquary_entries', 'suggestions', 'sync_states', 'thoughts', 'user_levels',
    'user_notifications'
  ];
begin
  foreach table_name in array all_tables loop
    execute format('drop policy if exists "Owner or staff update" on public.%I', table_name);
    execute format('drop policy if exists "Owner or staff delete" on public.%I', table_name);

    if table_name not in ('blessings', 'community_posts', 'community_threads', 'prayers', 'reliquary_entries') then
      execute format(
        'create policy "Owner or staff update" on public.%I for update to authenticated using (private.is_staff() or private.portal_row_owner(user_id, data)) with check (private.is_staff() or private.portal_row_owner(user_id, data))',
        table_name
      );
    end if;

    execute format(
      'create policy "Owner or staff delete" on public.%I for delete to authenticated using (private.is_staff() or private.portal_row_owner(user_id, data))',
      table_name
    );
  end loop;
end $$;

drop policy if exists "Collab read" on public.collab_requests;
create policy "Collab read"
on public.collab_requests for select
to authenticated
using (private.is_staff() or private.portal_row_owner(user_id, data));

drop policy if exists "User notification create" on public.user_notifications;
create policy "User notification create"
on public.user_notifications for insert
to authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'recipient_user_id', ''))) > 0
  and data ->> 'recipient_user_id' = (select auth.uid())::text
  and length(trim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Notification read own or staff" on public.user_notifications;
create policy "Notification read own or staff"
on public.user_notifications for select
to authenticated
using (private.is_staff() or private.portal_row_owner(user_id, data));

drop policy if exists "Public interaction update" on public.blessings;
drop policy if exists "Anon interaction update" on public.blessings;
create policy "Anon interaction update"
on public.blessings for update
to anon
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Authenticated update" on public.blessings;
create policy "Authenticated update"
on public.blessings for update
to authenticated
using (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
  )
)
with check (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
  )
);

drop policy if exists "Public interaction update" on public.community_posts;
drop policy if exists "Anon interaction update" on public.community_posts;
create policy "Anon interaction update"
on public.community_posts for update
to anon
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
);

drop policy if exists "Authenticated update" on public.community_posts;
create policy "Authenticated update"
on public.community_posts for update
to authenticated
using (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
  )
)
with check (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
  )
);

drop policy if exists "Public interaction update" on public.community_threads;
drop policy if exists "Anon interaction update" on public.community_threads;
create policy "Anon interaction update"
on public.community_threads for update
to anon
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
);

drop policy if exists "Authenticated update" on public.community_threads;
create policy "Authenticated update"
on public.community_threads for update
to authenticated
using (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and length(trim(coalesce(data ->> 'body', ''))) > 0
  )
)
with check (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and length(trim(coalesce(data ->> 'body', ''))) > 0
  )
);

drop policy if exists "Public interaction update" on public.prayers;
drop policy if exists "Anon interaction update" on public.prayers;
create policy "Anon interaction update"
on public.prayers for update
to anon
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'message', ''))) > 0
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Authenticated update" on public.prayers;
create policy "Authenticated update"
on public.prayers for update
to authenticated
using (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'message', ''))) > 0
  )
)
with check (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'message', ''))) > 0
  )
);

drop policy if exists "Public interaction update" on public.reliquary_entries;
drop policy if exists "Anon interaction update" on public.reliquary_entries;
create policy "Anon interaction update"
on public.reliquary_entries for update
to anon
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
);

drop policy if exists "Authenticated update" on public.reliquary_entries;
create policy "Authenticated update"
on public.reliquary_entries for update
to authenticated
using (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and length(trim(coalesce(data ->> 'body', ''))) > 0
  )
)
with check (
  private.is_staff()
  or private.portal_row_owner(user_id, data)
  or (
    jsonb_typeof(data) = 'object'
    and length(trim(coalesce(data ->> 'title', ''))) > 0
    and length(trim(coalesce(data ->> 'body', ''))) > 0
  )
);

drop trigger if exists prayers_guard_interaction_update on public.prayers;
create trigger prayers_guard_interaction_update
before update on public.prayers
for each row execute function private.guard_interaction_update('support_count');

drop policy if exists "Public upload read" on storage.objects;
create policy "Public upload read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'community-uploads');

drop policy if exists "Anon bug report screenshot upload" on storage.objects;
create policy "Anon bug report screenshot upload"
on storage.objects for insert
to anon
with check (
  bucket_id = 'community-uploads'
  and name like 'bug-reports/%'
);
