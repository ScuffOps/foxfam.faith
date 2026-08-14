begin;

do $$
declare
  function_signature regprocedure;
  original_definition text;
  repaired_definition text;
begin
  foreach function_signature in array array[
    'public.upgrade_user_relic_charm(uuid,uuid)'::regprocedure,
    'public.convert_duplicate_relic_charm(uuid,uuid)'::regprocedure
  ]
  loop
    select pg_catalog.pg_get_functiondef(function_signature)
    into original_definition;

    repaired_definition := pg_catalog.replace(
      original_definition,
      'on conflict (user_id, request_id) do nothing',
      'on conflict on constraint relic_charm_progression_receipts_user_id_request_id_key do nothing'
    );

    if repaired_definition = original_definition then
      raise exception using
        errcode = '55000',
        message = pg_catalog.format(
          'Expected Forge receipt conflict target was not found in %s',
          function_signature::text
        );
    end if;

    execute repaired_definition;
  end loop;
end
$$;

revoke execute on function public.upgrade_user_relic_charm(uuid, uuid) from public, anon;
grant execute on function public.upgrade_user_relic_charm(uuid, uuid) to authenticated;

revoke execute on function public.convert_duplicate_relic_charm(uuid, uuid) from public, anon;
grant execute on function public.convert_duplicate_relic_charm(uuid, uuid) to authenticated;

commit;
