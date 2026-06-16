revoke select on public.profiles from anon, authenticated;
grant select (
  id,
  role,
  display_name,
  avatar_url,
  accent_color,
  notification_preferences,
  onboarded,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;

do $$
declare
  table_name text;
  public_data_tables text[] := array[
    'birthdays', 'blessings', 'blessing_comments', 'bug_reports', 'codex_entries',
    'collab_requests', 'community_posts', 'community_post_comments', 'community_threads',
    'community_thread_comments', 'events', 'prayers', 'reliquary_comments',
    'reliquary_entries', 'suggestions', 'sync_states', 'thoughts', 'user_levels'
  ];
begin
  foreach table_name in array public_data_tables loop
    execute format('revoke select on public.%I from anon, authenticated', table_name);
    execute format(
      'grant select (id, data, created_at, updated_at) on public.%I to anon, authenticated',
      table_name
    );
  end loop;
end $$;

revoke select on public.user_notifications from anon, authenticated;
grant select (id, data, created_at, updated_at) on public.user_notifications to authenticated;

drop policy if exists "Public read" on public.user_notifications;
drop policy if exists "Notification read own or staff" on public.user_notifications;
create policy "Notification read own or staff"
on public.user_notifications for select
to authenticated
using (
  private.is_staff()
  or data ->> 'recipient_email' = ((select auth.jwt()) ->> 'email')
  or created_by = ((select auth.jwt()) ->> 'email')
);

drop policy if exists "User level create" on public.user_levels;
create policy "User level create"
on public.user_levels for insert
to authenticated
with check (
  private.is_staff()
  or user_id = (select auth.uid())
  or data ->> 'user_key' = ('user:' || (select auth.uid())::text)
);

update public.birthdays
set data = data - 'submitted_by_email'
where data ? 'submitted_by_email';

update public.bug_reports
set data = data - 'submitted_by_email'
where data ? 'submitted_by_email';

update public.community_post_comments
set data = data - 'author_email'
where data ? 'author_email';

update public.community_thread_comments
set data = data - 'author_email'
where data ? 'author_email';

update public.blessing_comments
set data = data - 'author_email'
where data ? 'author_email';

update public.reliquary_comments
set data = data - 'author_email'
where data ? 'author_email';

update public.community_threads
set data = jsonb_set(data - 'author_email', '{reacted_by}', '[]'::jsonb, true)
where data ? 'author_email' or data ? 'reacted_by';

update public.blessings
set data = jsonb_set(data - 'author_email', '{upvoted_by}', '[]'::jsonb, true)
where data ? 'author_email' or data ? 'upvoted_by';

update public.reliquary_entries
set data = jsonb_set(data - 'author_email', '{upvoted_by}', '[]'::jsonb, true)
where data ? 'author_email' or data ? 'upvoted_by';

update public.community_posts
set data = jsonb_set(data - 'submitted_by_email', '{upvoted_by}', '[]'::jsonb, true)
where data ? 'submitted_by_email' or data ? 'upvoted_by';

update public.community_posts
set data = jsonb_set(
  data,
  '{poll_options}',
  coalesce(
    (
      select jsonb_agg(option_value || jsonb_build_object('voted_by', '[]'::jsonb))
      from jsonb_array_elements(data -> 'poll_options') as option_value
    ),
    '[]'::jsonb
  ),
  true
)
where jsonb_typeof(data -> 'poll_options') = 'array';

update public.user_levels
set data = case
  when user_id is null then data - 'user_email'
  else jsonb_set(data - 'user_email', '{user_key}', to_jsonb('user:' || user_id::text), true)
end
where data ? 'user_email';
