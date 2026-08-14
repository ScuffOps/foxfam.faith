revoke all on function public.start_starfishing_cast()
from public, anon, authenticated;
revoke all on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
from public, anon, authenticated;
revoke all on function public.start_starfishing_timing_test()
from public, anon, authenticated;
revoke all on function public.start_starfishing_duplicate_test()
from public, anon, authenticated;

grant execute on function public.start_starfishing_cast()
to authenticated;
grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
to authenticated;
grant execute on function public.start_starfishing_timing_test()
to authenticated;
grant execute on function public.start_starfishing_duplicate_test()
to authenticated;
