-- Community post metadata must change through locked server-side patches.

create or replace function public.update_community_post_metadata(
  post_id uuid,
  patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  actor_role text;
  locked_post public.community_posts%rowtype;
  patch_key text;
  allowed_patch_keys text[] := array['title', 'description', 'status', 'roadmap_status'];
  updated_post jsonb;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if patch is null or jsonb_typeof(patch) <> 'object' or patch = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Community post patch must be a non-empty object';
  end if;

  for patch_key in select jsonb_object_keys(patch) loop
    if patch_key <> all (allowed_patch_keys) then
      raise exception using errcode = '22023', message = 'Community post patch contains a server-owned field';
    end if;
    if jsonb_typeof(patch -> patch_key) <> 'string' then
      raise exception using errcode = '22023', message = 'Community post patch values must be text';
    end if;
  end loop;

  if patch ? 'title' and length(btrim(patch ->> 'title')) = 0 then
    raise exception using errcode = '22023', message = 'Community post title cannot be empty';
  end if;
  if patch ? 'status' and length(btrim(patch ->> 'status')) = 0 then
    raise exception using errcode = '22023', message = 'Community post status cannot be empty';
  end if;
  if patch ? 'roadmap_status' and length(btrim(patch ->> 'roadmap_status')) = 0 then
    raise exception using errcode = '22023', message = 'Community post roadmap status cannot be empty';
  end if;

  select post_row.*
  into locked_post
  from public.community_posts as post_row
  where post_row.id = post_id
  for update;

  if locked_post.id is null then
    raise exception using errcode = '22023', message = 'Community post was not found';
  end if;

  actor_role := coalesce(private.current_user_role(), 'guest');
  if (patch ? 'title' or patch ? 'description')
    and not (coalesce(locked_post.user_id = caller_id, false) or actor_role in ('admin', 'lead_mod', 'mod')) then
    raise exception using errcode = '42501', message = 'Only owners or staff can edit post text';
  end if;
  if (patch ? 'status' or patch ? 'roadmap_status')
    and actor_role not in ('admin', 'lead_mod', 'mod') then
    raise exception using errcode = '42501', message = 'Only staff can change post workflow';
  end if;

  update public.community_posts as target_post
  set data = locked_post.data || patch || jsonb_build_object('edited_at', to_jsonb(clock_timestamp()))
  where target_post.id = locked_post.id
  returning jsonb_build_object(
    'id', target_post.id,
    'data', target_post.data,
    'updated_at', target_post.updated_at
  ) into updated_post;

  return updated_post;
end;
$$;

create or replace function public.sync_community_post_comment_count(post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_post public.community_posts%rowtype;
  next_comment_count integer := 0;
  updated_post jsonb;
begin
  select post_row.*
  into locked_post
  from public.community_posts as post_row
  where post_row.id = post_id
  for update;

  if locked_post.id is null then
    raise exception using errcode = '22023', message = 'Community post was not found';
  end if;

  select count(*)
  into next_comment_count
  from public.community_post_comments as comment_row
  where comment_row.data ->> 'post_id' = post_id::text;

  update public.community_posts as target_post
  set data = jsonb_set(target_post.data, '{comment_count}', to_jsonb(next_comment_count), true)
  where target_post.id = locked_post.id
  returning jsonb_build_object(
    'id', target_post.id,
    'comment_count', target_post.data -> 'comment_count',
    'updated_at', target_post.updated_at
  ) into updated_post;

  return updated_post;
end;
$$;

revoke update on table public.community_posts from public, anon, authenticated;

revoke execute on function public.update_community_post_metadata(uuid, jsonb)
from public, anon;
grant execute on function public.update_community_post_metadata(uuid, jsonb)
to authenticated;

revoke execute on function public.sync_community_post_comment_count(uuid) from public, anon;
grant execute on function public.sync_community_post_comment_count(uuid) to anon, authenticated;
