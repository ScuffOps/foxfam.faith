drop policy if exists "Public interaction update" on public.community_posts;
create policy "Public interaction update"
on public.community_posts for update
to anon, authenticated
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

drop policy if exists "Public interaction update" on public.blessings;
create policy "Public interaction update"
on public.blessings for update
to anon, authenticated
using (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
)
with check (
  jsonb_typeof(data) = 'object'
  and length(trim(coalesce(data ->> 'title', ''))) > 0
);

drop policy if exists "Public interaction update" on public.community_threads;
create policy "Public interaction update"
on public.community_threads for update
to anon, authenticated
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

drop policy if exists "Public interaction update" on public.reliquary_entries;
create policy "Public interaction update"
on public.reliquary_entries for update
to anon, authenticated
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
