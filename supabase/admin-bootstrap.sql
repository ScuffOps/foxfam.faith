-- Run this after the admin has signed in once and a public.profiles row exists.
-- Replace the email before executing in the Supabase SQL editor.

update public.profiles
set role = 'admin'
where lower(email) = lower('you@example.com');

select id, email, role, display_name
from public.profiles
where lower(email) = lower('you@example.com');
