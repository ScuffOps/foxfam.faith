# Foxfam Portal Launch Checklist

## Supabase

- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set locally and in Vercel.
- Add redirect URLs in Supabase Auth:
  - `http://localhost:5173/**`
  - `https://<your-vercel-domain>/**`
  - `https://foxfam.faith/**`
- Enable Manual Linking in Supabase Auth identity settings.
- Enable OAuth providers:
  - Google, with calendar event scope requested by the app.
  - Twitch.
  - Discord.
- Sign in once, then run `supabase/admin-bootstrap.sql` with the real admin email.

## Vercel

- Project framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_UPLOAD_BUCKET=community-uploads`
- After deploy, add the production domain to Supabase Auth redirects.

## Smoke Test

- Guest can view dashboard, calendar, birthdays, blessings, reliquary, prayer wall, community posts, and polls.
- Guest can submit bug reports and allowed public interactions.
- Signed-in user can comment, give praise, vote in polls, submit birthdays, and link OAuth identities from Settings.
- Admin can approve/reject birthdays and community items.
- Images from Base44 seed content render. Migrate those files into Supabase Storage before fully removing the old Base44 asset dependency.
