# Foxfam.Faith Community Portal

Independent React/Vite community portal for Foxfam.Faith.

## Stack

- React + Vite
- Supabase Auth, Postgres, Row Level Security, and Storage
- Vercel static hosting

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

3. Add your Supabase project URL and publishable key.

4. Apply the SQL in `supabase/migrations/202605280001_initial_portal_schema.sql` using the Supabase SQL editor or Supabase CLI.

5. Run the app:

```bash
npm run dev
```

## Vercel

Set these environment variables in Vercel:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_UPLOAD_BUCKET=community-uploads
```

Build command: `npm run build`

Output directory: `dist`

After Vercel creates the deployment URL, add these Supabase Auth redirect URLs:

```text
http://localhost:5173/**
https://<your-vercel-domain>/**
https://foxfam.faith/**
```

## Supabase Auth Providers

The app supports account linking from Settings through Supabase Auth identities:

- Google Calendar uses the `google` provider with calendar event scope.
- Twitch uses the `twitch` provider.
- Discord uses the `discord` provider.

Enable each provider in Supabase Auth and add the provider client ID/secret from the corresponding developer console. Manual identity linking must be enabled in Supabase Auth settings for linked accounts to attach to an existing signed-in user.

Google Calendar linking currently grants OAuth identity/calendar permission. Automatic event writing should be handled by a server-side Supabase Edge Function before production calendar sync is turned on.

## Admin Bootstrap

1. Sign in once through the portal so a row exists in `public.profiles`.
2. Run `supabase/admin-bootstrap.sql` in the Supabase SQL editor after replacing `you@example.com` with the admin email.
3. Refresh the app. Admin-only moderation panels should appear for that account.

## Notes

The app keeps the existing community UI and replaces the Base44 runtime with a Supabase-backed client adapter. Prayer Wall Discord posting is available through `supabase/functions/send-to-discord` when `DISCORD_WEBHOOK_URL` is configured as a Supabase Edge Function secret.
