drop policy if exists "Public read stream sync states" on public.sync_states;
drop policy if exists "Public read release sync states" on public.sync_states;
create policy "Public read release sync states"
on public.sync_states for select
to anon, authenticated
using (
  data ->> 'key' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state', 'relic_roll_gate')
  or data ->> 'name' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state', 'relic_roll_gate')
  or data ->> 'type' in ('stream_live', 'stream_status', 'twitch_stream_status', 'twitch_live_state', 'relic_roll_gate')
);

drop policy if exists "Staff create sync states" on public.sync_states;
create policy "Staff create sync states"
on public.sync_states for insert
to authenticated
with check (
  jsonb_typeof(data) = 'object'
  and (
    (
      coalesce(data ->> 'key', data ->> 'name', data ->> 'type') = 'relic_roll_gate'
      and private.current_user_role() in ('admin', 'lead_mod')
    )
    or (
      coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
      and private.is_staff()
    )
  )
);

drop policy if exists "Staff update sync states" on public.sync_states;
create policy "Staff update sync states"
on public.sync_states for update
to authenticated
using (
  (
    coalesce(data ->> 'key', data ->> 'name', data ->> 'type') = 'relic_roll_gate'
    and private.current_user_role() in ('admin', 'lead_mod')
  )
  or (
    coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
    and private.is_staff()
  )
)
with check (
  jsonb_typeof(data) = 'object'
  and (
    (
      coalesce(data ->> 'key', data ->> 'name', data ->> 'type') = 'relic_roll_gate'
      and private.current_user_role() in ('admin', 'lead_mod')
    )
    or (
      coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
      and private.is_staff()
    )
  )
);

drop policy if exists "Staff delete sync states" on public.sync_states;
create policy "Staff delete sync states"
on public.sync_states for delete
to authenticated
using (
  (
    coalesce(data ->> 'key', data ->> 'name', data ->> 'type') = 'relic_roll_gate'
    and private.current_user_role() in ('admin', 'lead_mod')
  )
  or (
    coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
    and private.is_staff()
  )
);

insert into public.sync_states (data)
select jsonb_build_object(
  'key', 'relic_roll_gate',
  'enabled', false,
  'status', 'closed',
  'reason', 'Relic charms are locked until Veri opens the forge.',
  'source', 'admin-toggle',
  'updated_by', 'migration',
  'updated_at', now()
)
where not exists (
  select 1 from public.sync_states where data ->> 'key' = 'relic_roll_gate'
);
