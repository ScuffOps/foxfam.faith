-- Development branches can inherit explicit ACLs even when the original
-- authenticated-only migration is already present in the migration ledger.
-- Reassert the intended boundary without changing intentionally public RPCs.

revoke all on function public.mark_user_notifications_read(uuid[])
from public, anon, authenticated;
grant execute on function public.mark_user_notifications_read(uuid[])
to authenticated;

revoke all on function public.set_profile_display_name(uuid, text)
from public, anon, authenticated;
grant execute on function public.set_profile_display_name(uuid, text)
to authenticated;

revoke all on function public.set_profile_role(uuid, text)
from public, anon, authenticated;
grant execute on function public.set_profile_role(uuid, text)
to authenticated;

do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.mark_user_notifications_read(uuid[])',
    'public.set_profile_display_name(uuid,text)',
    'public.set_profile_role(uuid,text)'
  ] loop
    if has_function_privilege('anon', function_signature, 'execute') then
      raise exception 'Anonymous execution remains enabled for %', function_signature;
    end if;

    if not has_function_privilege('authenticated', function_signature, 'execute') then
      raise exception 'Authenticated execution is missing for %', function_signature;
    end if;
  end loop;
end
$$;
