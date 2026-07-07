drop policy if exists "Owner or staff update" on public.sync_states;
create policy "Owner or staff update"
on public.sync_states for update
to authenticated
using (
  coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
  and (private.is_staff() or private.portal_row_owner(user_id, data))
)
with check (
  coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
  and (private.is_staff() or private.portal_row_owner(user_id, data))
);

drop policy if exists "Owner or staff delete" on public.sync_states;
create policy "Owner or staff delete"
on public.sync_states for delete
to authenticated
using (
  coalesce(data ->> 'key', data ->> 'name', data ->> 'type') is distinct from 'relic_roll_gate'
  and (private.is_staff() or private.portal_row_owner(user_id, data))
);
