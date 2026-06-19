revoke insert, update, delete on public.profiles from anon, authenticated;

grant insert (
  id,
  email,
  display_name
) on public.profiles to authenticated;

grant update (
  display_name,
  avatar_url,
  accent_color,
  notification_preferences,
  onboarded
) on public.profiles to authenticated;
