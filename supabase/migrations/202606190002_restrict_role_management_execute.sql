revoke all on function public.set_profile_role(uuid, text, text) from public;
revoke all on function public.set_profile_role(uuid, text, text) from anon;
grant execute on function public.set_profile_role(uuid, text, text) to authenticated;
