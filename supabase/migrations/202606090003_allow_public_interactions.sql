create or replace function private.guard_interaction_update()
returns trigger
language plpgsql
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

drop trigger if exists community_posts_guard_interaction_update on public.community_posts;
create trigger community_posts_guard_interaction_update
before update on public.community_posts
for each row execute function private.guard_interaction_update(
  'upvotes',
  'upvoted_by',
  'poll_options',
  'comment_count'
);

drop trigger if exists blessings_guard_interaction_update on public.blessings;
create trigger blessings_guard_interaction_update
before update on public.blessings
for each row execute function private.guard_interaction_update(
  'upvotes',
  'upvoted_by',
  'comment_count'
);

drop trigger if exists community_threads_guard_interaction_update on public.community_threads;
create trigger community_threads_guard_interaction_update
before update on public.community_threads
for each row execute function private.guard_interaction_update(
  'reactions',
  'reacted_by',
  'comment_count'
);

drop trigger if exists reliquary_entries_guard_interaction_update on public.reliquary_entries;
create trigger reliquary_entries_guard_interaction_update
before update on public.reliquary_entries
for each row execute function private.guard_interaction_update(
  'upvotes',
  'upvoted_by',
  'comment_count'
);

drop policy if exists "Public interaction update" on public.community_posts;
create policy "Public interaction update"
on public.community_posts for update
to anon, authenticated
using (true)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and data ->> 'type' in ('idea', 'poll', 'feedback', 'update')
);

drop policy if exists "Public interaction update" on public.blessings;
create policy "Public interaction update"
on public.blessings for update
to anon, authenticated
using (true)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Public interaction update" on public.community_threads;
create policy "Public interaction update"
on public.community_threads for update
to anon, authenticated
using (true)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
);

drop policy if exists "Public interaction update" on public.reliquary_entries;
create policy "Public interaction update"
on public.reliquary_entries for update
to anon, authenticated
using (true)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
  and length(trim(coalesce(data ->> 'body', ''))) > 0
);
