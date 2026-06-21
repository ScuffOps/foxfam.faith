create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oauth_tokens_provider_check check (provider in ('google')),
  constraint oauth_tokens_user_provider_unique unique (user_id, provider)
);

create table if not exists public.calendar_sync_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  calendar_id text not null default 'primary',
  sync_enabled boolean not null default true,
  status text not null default 'pending',
  scopes text[] not null default '{}'::text[],
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_sync_connections_provider_check check (provider in ('google')),
  constraint calendar_sync_connections_status_check check (status in ('pending', 'connected', 'needs_reauth', 'paused', 'error')),
  constraint calendar_sync_connections_user_provider_unique unique (user_id, provider)
);

create table if not exists public.calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  connection_id uuid references public.calendar_sync_connections(id) on delete set null,
  event_id uuid,
  provider text not null default 'google',
  action text not null,
  status text not null,
  google_event_id text,
  error text,
  created_at timestamptz not null default now(),
  constraint calendar_sync_runs_provider_check check (provider in ('google')),
  constraint calendar_sync_runs_status_check check (status in ('success', 'error', 'skipped'))
);

create index if not exists oauth_tokens_user_provider_idx on public.oauth_tokens (user_id, provider);
create index if not exists calendar_sync_connections_user_provider_idx on public.calendar_sync_connections (user_id, provider);
create index if not exists calendar_sync_runs_user_created_idx on public.calendar_sync_runs (user_id, created_at desc);
create index if not exists sync_states_key_idx on public.sync_states ((data ->> 'key'));
create index if not exists sync_states_provider_idx on public.sync_states ((data ->> 'provider'));

alter table public.oauth_tokens enable row level security;
alter table public.oauth_tokens force row level security;
alter table public.calendar_sync_connections enable row level security;
alter table public.calendar_sync_connections force row level security;
alter table public.calendar_sync_runs enable row level security;
alter table public.calendar_sync_runs force row level security;

revoke all on table public.oauth_tokens from anon, authenticated;
grant select, insert, update, delete on table public.oauth_tokens to service_role;

grant select on table public.calendar_sync_connections to authenticated;
grant select on table public.calendar_sync_runs to authenticated;
grant insert, update, delete on table public.calendar_sync_connections to service_role;
grant insert, update, delete on table public.calendar_sync_runs to service_role;

drop trigger if exists oauth_tokens_touch_updated_at on public.oauth_tokens;
create trigger oauth_tokens_touch_updated_at
before update on public.oauth_tokens
for each row execute function private.touch_updated_at();

drop trigger if exists calendar_sync_connections_touch_updated_at on public.calendar_sync_connections;
create trigger calendar_sync_connections_touch_updated_at
before update on public.calendar_sync_connections
for each row execute function private.touch_updated_at();

drop policy if exists "Users read own calendar sync connection" on public.calendar_sync_connections;
create policy "Users read own calendar sync connection"
on public.calendar_sync_connections for select
to authenticated
using ((select auth.uid()) = user_id or private.is_staff());

drop policy if exists "Users read own calendar sync runs" on public.calendar_sync_runs;
create policy "Users read own calendar sync runs"
on public.calendar_sync_runs for select
to authenticated
using ((select auth.uid()) = user_id or private.is_staff());

drop policy if exists "Public read stream sync states" on public.sync_states;
create policy "Public read stream sync states"
on public.sync_states for select
to anon, authenticated
using (
  data ->> 'key' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state')
  or data ->> 'name' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state')
  or data ->> 'type' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state')
);

insert into public.sync_states (data)
select jsonb_build_object(
  'key', 'twitch_live_state',
  'provider', 'twitch',
  'status', 'offline',
  'is_live', false,
  'source', 'sync-row',
  'updated_by', 'migration',
  'checked_at', now()
)
where not exists (
  select 1 from public.sync_states where data ->> 'key' = 'twitch_live_state'
);
