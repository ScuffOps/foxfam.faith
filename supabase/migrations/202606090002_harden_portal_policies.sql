create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Public create" on public.birthdays;
create policy "Public create"
on public.birthdays for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'display_name', ''))) > 0
  and length(trim(coalesce(data ->> 'birthday_date', ''))) > 0
);

drop policy if exists "Public create" on public.blessing_comments;
create policy "Public create"
on public.blessing_comments for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'blessing_id', ''))) > 0
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Public create" on public.bug_reports;
create policy "Public create"
on public.bug_reports for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'description', ''))) > 0
);

drop policy if exists "Public create" on public.community_posts;
create policy "Public create"
on public.community_posts for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
);

drop policy if exists "Public create" on public.community_post_comments;
create policy "Public create"
on public.community_post_comments for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'post_id', ''))) > 0
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Public create" on public.community_threads;
create policy "Public create"
on public.community_threads for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
);

drop policy if exists "Public create" on public.community_thread_comments;
create policy "Public create"
on public.community_thread_comments for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'thread_id', ''))) > 0
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Public create" on public.prayers;
create policy "Public create"
on public.prayers for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Public create" on public.reliquary_comments;
create policy "Public create"
on public.reliquary_comments for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'entry_id', ''))) > 0
  and length(trim(coalesce(data ->> 'message', ''))) > 0
);

drop policy if exists "Public create" on public.suggestions;
create policy "Public create"
on public.suggestions for insert
to anon, authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'description', ''))) > 0
);

drop policy if exists "Public create" on public.user_notifications;
create policy "User notification create"
on public.user_notifications for insert
to authenticated
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'recipient_email', ''))) > 0
  and length(trim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Public upload read" on storage.objects;
