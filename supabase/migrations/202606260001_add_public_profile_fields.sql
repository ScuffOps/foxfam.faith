alter table public.profiles
  add column if not exists profile_status text,
  add column if not exists bio text,
  add column if not exists favorite_shrine text;

grant update (profile_status, bio, favorite_shrine) on public.profiles to authenticated;
