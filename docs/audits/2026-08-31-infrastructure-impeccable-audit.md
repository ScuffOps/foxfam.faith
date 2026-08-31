# Foxfam Portal Infrastructure and Impeccable Audit

Date: 2026-08-31

Branch: `audit/rls-vercel-impeccable-20260831`

Base production commit: `f1e33fd4d2cffe601d64acf7e28f03c6ee8dbfe0`

## Scope

- Live Supabase project `wdypokgdqgvqpyabvshq`: public tables, RLS state, policies, functions, grants, storage, migration history, and advisors.
- Vercel project `prj_xzSqkWlrFlS6ADeLhVhamtprmEmZ`: production deployment, aliases, API routing, build output, and response headers.
- Portal UI: desktop and mobile review of dashboard, forum, settings, and Staff Ops using the Impeccable audit criteria.

The installed Impeccable detector could not run because its package is missing `scripts/lib/impeccable-config.mjs`. The audit therefore used the skill's documented criteria, source inspection, computed-style checks, accessibility snapshots, responsive browser checks, and Playwright E2E rather than presenting a broken detector run as evidence.

No production database migration or deployment was performed during this audit.

## Findings

### P1 - Repository migrations did not reproduce the live schema

The live database contains forum chat, managed forum categories, admin-only shrine publishing, and birthday hardening that were not represented by the repository migration history. A fresh environment created from Git would therefore be incomplete.

Resolution: `20260831113320_harden_live_rls_and_profile_privacy.sql` reconciles these objects idempotently. The entire migration passes a live-schema `BEGIN`/`ROLLBACK` rehearsal.

### P1 - Profile notification data was publicly selectable

The public profile projection and table column grants exposed `notification_preferences` and `onboarded` to anonymous and authenticated readers. The settings UI describes notification choices as private.

Resolution: public profile reads now exclude private fields. The migration adds owner-only `get_my_profile()` access and revokes public column selection for the private fields. The client includes a temporary missing-RPC fallback so frontend and database rollout can be staged without an outage.

### P1 - Security-definer execution grants were too broad

Anonymous callers could execute account mutation helpers and a legacy two-argument role setter. Several trigger-only functions were also executable by client roles.

Resolution: the migration grants owner helpers only to authenticated users, revokes the legacy role setter from authenticated clients, and removes client execution from trigger-only functions. The current audited three-argument admin role setter remains available to authenticated callers and performs its own admin check.

### P2 - Birthday message policy had an ineffective ownership check

The strict insert policy compared columns from the birthday row to itself rather than to the outer message row. A second permissive insert policy also bypassed the strict policy.

Resolution: policies are consolidated, the correlation is fixed, birthday wishes require a linked recipient, and a one-day timezone tolerance is retained.

### P2 - Duplicate policies and missing foreign-key indexes

Duplicate staff write policies increased review noise. Foreign keys on calendar sync, forum categories, and role audit logs lacked indexes.

Resolution: duplicate policy names are removed and the missing indexes are created.

### P2 - Community uploads need an explicit product limit

The `community-uploads` bucket is public and currently has no bucket-level file-size or MIME allowlist. Existing policies block known dangerous installer extensions, but unrestricted size and broad content acceptance remain abuse and cost risks.

Decision required: preserve broad creative formats while defining a maximum file size and a server-validated allowlist. This branch does not silently narrow the user's upload contract.

### P2 - Mobile Staff Ops navigation consumed most of the first viewport

The full section grid pushed page content far below the fold and conflicted with the global create control.

Resolution: desktop keeps the complete navigation grid. Mobile receives a fixed, horizontally scrollable icon dock with abbreviated small-caps labels, accessible names, active state, and reserved bottom spacing.

### P2 - Global creation appeared on read-only and unauthorized pages

The global Create button displayed throughout the portal, including Staff Ops Handbook, and offered shrine publishing more broadly than the admin-only policy.

Resolution: the button is now `+ New`, appears only on the dashboard or a route with an allowed creation action, opens that route's composer directly, and limits Reliquary and Blessing publishing to admins.

### P2 - Mobile overlays need a final accessibility pass

The forum chat seal meets the 48 px mobile target and opens as a bottom sheet. The sheet still needs dialog semantics, initial focus, focus containment, and focus restoration. The global floating controls should also be checked against safe-area insets on physical iOS devices.

### P2 - `forsaken.faith` is configured but does not resolve publicly

Vercel has the alias, but public DNS does not currently resolve it. This remains an external DNS task and was not modified.

### P3 - Visual density is high

The portal is coherent and branded, but repeated gradients, blur, rings, shadows, and rounded pills reduce hierarchy on dense dashboard and Staff Ops pages. Preserve the shrine identity while reserving the brightest effects for primary actions, status changes, and focused cards.

## Vercel Status

- Production deployment `dpl_hzPUNNpEAUWxSvw9o4FJHwxXLH9K` is ready.
- `foxfam.faith` and the Vercel project alias resolve to the current production commit.
- `/api/notifications/deliver` returns structured `401 Unauthorized` JSON without authorization, confirming the API route is not swallowed by the SPA rewrite.
- The build completed successfully with warnings for deprecated transitive packages and an inactive Recharts major version.
- Safe global headers were added in this branch: `X-Content-Type-Options`, `Referrer-Policy`, and `X-Permitted-Cross-Domain-Policies`.
- Vercel CLI environment inventory could not be verified because the locally linked CLI token is invalid. Plugin-level deployment inspection remained available.

## Impeccable Scorecard

| Dimension | Score | Notes |
| --- | ---: | --- |
| Visual hierarchy | 7/10 | Strong identity; effects compete in dense views. |
| Consistency | 7/10 | Shared primitives are common; creation and mobile navigation had exceptions. |
| Accessibility | 6/10 | Focus states and labels are generally present; mobile overlay semantics remain. |
| Responsiveness | 7/10 | No horizontal overflow in audited routes; Staff Ops first viewport needed the dock. |
| UX clarity | 7/10 | Role boundaries are improving; residual floating controls and dense frames add noise. |

Overall: 6.8/10 before the branch fixes.

## Rollout Order

1. Review and apply `20260831113320_harden_live_rls_and_profile_privacy.sql` to Supabase.
2. Re-run Supabase security and performance advisors.
3. Deploy the frontend and `vercel.json` changes.
4. Smoke-test owner profile reads, admin role management, birthday wishes, forum chat, admin-only shrine publishing, Staff Ops mobile navigation, and every route-specific `+ New` action.
5. Verify notification environment variables with a refreshed Vercel CLI login and complete a physical-device safe-area check.

## Residual Decisions

- Define upload size and accepted content types for `community-uploads`.
- Replace guest upvote identity keys with a stronger abuse-control mechanism if voting becomes reward-bearing.
- Decide whether Twitch embedding needs cross-origin framing before adding CSP or frame restrictions.
- Repair `forsaken.faith` DNS.
- Verify the production mail sender and notification worker secrets.
