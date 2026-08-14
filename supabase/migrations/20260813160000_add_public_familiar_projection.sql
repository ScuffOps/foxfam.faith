-- Add the owner's selected familiar to the authenticated, privacy-safe profile projection.
-- The owner-only user_familiars table and its forced RLS policies remain unchanged.
-- Depends on: 20260813150000_fix_public_game_progression_cosmetic_priority.sql

begin;

do $$
begin
  if pg_catalog.to_regprocedure('private.load_public_game_progression_without_familiar(uuid)') is null then
    alter function public.load_public_game_progression(uuid)
      rename to load_public_game_progression_without_familiar;
    alter function public.load_public_game_progression_without_familiar(uuid)
      set schema private;
  end if;
end
$$;

revoke all on function private.load_public_game_progression_without_familiar(uuid)
from public, anon, authenticated;

create or replace function public.load_public_game_progression(
  profile_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  projection jsonb;
  public_familiar jsonb;
begin
  projection := private.load_public_game_progression_without_familiar(profile_user_id);

  select pg_catalog.jsonb_build_object(
    'species', familiar.species,
    'coat', familiar.coat,
    'markings', familiar.markings,
    'outfit', familiar.outfit,
    'accessory', familiar.accessory,
    'charm_fx', familiar.charm_fx
  )
  into public_familiar
  from public.user_familiars as familiar
  where familiar.user_id = profile_user_id;

  return projection || pg_catalog.jsonb_build_object('familiar', public_familiar);
end;
$$;

revoke all on function public.load_public_game_progression(uuid)
from public, anon, authenticated;
grant execute on function public.load_public_game_progression(uuid)
to authenticated;

commit;
