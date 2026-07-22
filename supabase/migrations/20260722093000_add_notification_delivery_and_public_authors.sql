create table if not exists public.notification_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.notification_push_subscriptions enable row level security;
revoke all on public.notification_push_subscriptions from anon;
grant select, insert, update, delete on public.notification_push_subscriptions to authenticated;

drop policy if exists "Users manage their push subscriptions" on public.notification_push_subscriptions;
create policy "Users manage their push subscriptions"
on public.notification_push_subscriptions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.user_notifications
  add column if not exists push_delivered_at timestamptz,
  add column if not exists email_delivered_at timestamptz,
  add column if not exists delivery_attempted_at timestamptz,
  add column if not exists delivery_error text;

do $$
declare
  target_table text;
  staff_id uuid;
begin
  select id into staff_id from public.profiles where role in ('admin', 'lead_mod') order by role = 'admin' desc limit 1;
  if staff_id is null then
    raise exception 'A staff profile is required for the guarded author backfill';
  end if;
  perform set_config('request.jwt.claim.sub', staff_id::text, true);

  foreach target_table in array array[
    'birthdays','blessings','blessing_comments','bug_reports','collab_requests',
    'community_posts','community_post_comments','community_threads','community_thread_comments',
    'offerings','prayers','reliquary_comments','reliquary_entries','suggestions'
  ] loop
    execute format(
      'update public.%I r set data = jsonb_strip_nulls(r.data || jsonb_build_object(
        ''author_key'', ''user:'' || r.user_id::text,
        ''author_name'', coalesce(nullif(r.data->>''author_name'',''''), nullif(r.data->>''submitted_by_name'',''''), nullif(r.data->>''creator_name'',''''), nullif(p.display_name,''''), ''Guest''),
        ''author_avatar_url'', nullif(p.avatar_url, '''')
      )) from public.profiles p where r.user_id = p.id and r.user_id is not null',
      target_table
    );
  end loop;
end $$;

revoke select (email) on public.profiles from anon, authenticated;
grant select (profile_status, bio, favorite_shrine) on public.profiles to anon, authenticated;
