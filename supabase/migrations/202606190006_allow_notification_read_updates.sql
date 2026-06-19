revoke update on public.user_notifications from authenticated;

create or replace function public.mark_user_notifications_read(notification_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.user_notifications
  set
    data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
      'read', true,
      'read_at', timezone('utc', now())::text
    ),
    updated_at = now()
  where id = any(notification_ids)
    and private.portal_row_owner(user_id, data);
end;
$$;

revoke all on function public.mark_user_notifications_read(uuid[]) from public;
grant execute on function public.mark_user_notifications_read(uuid[]) to authenticated;
