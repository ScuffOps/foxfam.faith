create or replace function private.guard_interaction_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_keys text[] := TG_ARGV;
begin
  if private.is_staff() then
    return new;
  end if;

  if old.user_id is distinct from new.user_id
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at then
    raise insufficient_privilege using message = 'Only staff can change row ownership metadata.';
  end if;

  if (old.data - allowed_keys) is distinct from (new.data - allowed_keys) then
    raise insufficient_privilege using message = 'Only interaction fields can be updated publicly.';
  end if;

  return new;
end;
$$;
