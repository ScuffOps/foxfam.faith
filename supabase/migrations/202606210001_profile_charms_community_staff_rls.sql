create or replace function public.toggle_community_comment_upvote(
  comment_id uuid,
  actor_key text
)
returns table (
  id uuid,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_row public.community_post_comments%rowtype;
  cleaned_actor text := left(trim(coalesce(actor_key, '')), 160);
  current_voters jsonb;
  next_voters jsonb;
  next_votes integer;
begin
  if cleaned_actor = '' then
    raise exception 'Actor key is required.';
  end if;

  select *
    into comment_row
    from public.community_post_comments
    where community_post_comments.id = comment_id
    for update;

  if not found then
    raise exception 'Comment not found.';
  end if;

  if jsonb_typeof(comment_row.data) <> 'object'
    or length(trim(coalesce(comment_row.data ->> 'post_id', ''))) = 0
    or length(trim(coalesce(comment_row.data ->> 'message', ''))) = 0 then
    raise exception 'Comment cannot be updated.';
  end if;

  current_voters := case
    when jsonb_typeof(comment_row.data -> 'upvoted_by') = 'array' then comment_row.data -> 'upvoted_by'
    else '[]'::jsonb
  end;

  if current_voters ? cleaned_actor then
    select coalesce(jsonb_agg(value), '[]'::jsonb)
      into next_voters
      from jsonb_array_elements_text(current_voters) as voter(value)
      where value <> cleaned_actor;
  else
    next_voters := current_voters || to_jsonb(cleaned_actor);
  end if;

  next_votes := jsonb_array_length(next_voters);

  update public.community_post_comments
    set data = jsonb_set(
      jsonb_set(comment_row.data, '{upvoted_by}', next_voters, true),
      '{upvotes}',
      to_jsonb(next_votes),
      true
    )
    where community_post_comments.id = comment_id
    returning community_post_comments.id, community_post_comments.data, community_post_comments.created_at, community_post_comments.updated_at
    into id, data, created_at, updated_at;

  return next;
end;
$$;

revoke all on function public.toggle_community_comment_upvote(uuid, text) from public;
grant execute on function public.toggle_community_comment_upvote(uuid, text) to anon, authenticated;

grant select on table public.sync_states to anon, authenticated;
grant insert, update, delete on table public.sync_states to authenticated;

drop policy if exists "Public read stream sync states" on public.sync_states;
create policy "Public read stream sync states"
on public.sync_states for select
to anon, authenticated
using (
  data ->> 'key' in ('stream_live', 'stream_status', 'twitch_stream_status')
  or data ->> 'name' in ('stream_live', 'stream_status', 'twitch_stream_status')
  or data ->> 'type' in ('stream_live', 'stream_status', 'twitch_stream_status')
);

drop policy if exists "Staff create sync states" on public.sync_states;
create policy "Staff create sync states"
on public.sync_states for insert
to authenticated
with check (private.is_staff() and jsonb_typeof(data) = 'object');

drop policy if exists "Staff update sync states" on public.sync_states;
create policy "Staff update sync states"
on public.sync_states for update
to authenticated
using (private.is_staff())
with check (private.is_staff() and jsonb_typeof(data) = 'object');

drop policy if exists "Staff delete sync states" on public.sync_states;
create policy "Staff delete sync states"
on public.sync_states for delete
to authenticated
using (private.is_staff());

do $$
declare
  table_name text;
  staff_tables text[] := array[
    'events',
    'staff_availabilities',
    'shift_planner_assignments',
    'staff_time_entries',
    'mod_shifts'
  ];
begin
  foreach table_name in array staff_tables loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);

    execute format('drop policy if exists "Staff create current" on public.%I', table_name);
    execute format('drop policy if exists "Staff update current" on public.%I', table_name);
    execute format('drop policy if exists "Staff delete current" on public.%I', table_name);

    execute format(
      'create policy "Staff create current" on public.%I for insert to authenticated with check (private.is_staff() and jsonb_typeof(data) = ''object'')',
      table_name
    );
    execute format(
      'create policy "Staff update current" on public.%I for update to authenticated using (private.is_staff()) with check (private.is_staff() and jsonb_typeof(data) = ''object'')',
      table_name
    );
    execute format(
      'create policy "Staff delete current" on public.%I for delete to authenticated using (private.is_staff())',
      table_name
    );
  end loop;
end $$;
