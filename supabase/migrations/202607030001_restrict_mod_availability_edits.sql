drop policy if exists "Staff create" on public.staff_availabilities;
drop policy if exists "Staff create current" on public.staff_availabilities;
create policy "Staff create current"
on public.staff_availabilities
for insert
to authenticated
with check (
  jsonb_typeof(data) = 'object'
  and (
    private.current_user_role() in ('admin', 'lead_mod')
    or (
      private.current_user_role() = 'mod'
      and data ->> 'profile_id' = (select auth.uid())::text
    )
  )
);

drop policy if exists "Staff update" on public.staff_availabilities;
drop policy if exists "Staff update current" on public.staff_availabilities;
create policy "Staff update current"
on public.staff_availabilities
for update
to authenticated
using (
  private.current_user_role() in ('admin', 'lead_mod')
  or (
    private.current_user_role() = 'mod'
    and data ->> 'profile_id' = (select auth.uid())::text
  )
)
with check (
  jsonb_typeof(data) = 'object'
  and (
    private.current_user_role() in ('admin', 'lead_mod')
    or (
      private.current_user_role() = 'mod'
      and data ->> 'profile_id' = (select auth.uid())::text
    )
  )
);

drop policy if exists "Staff delete" on public.staff_availabilities;
drop policy if exists "Staff delete current" on public.staff_availabilities;
create policy "Staff delete current"
on public.staff_availabilities
for delete
to authenticated
using (
  private.current_user_role() in ('admin', 'lead_mod')
  or (
    private.current_user_role() = 'mod'
    and data ->> 'profile_id' = (select auth.uid())::text
  )
);
