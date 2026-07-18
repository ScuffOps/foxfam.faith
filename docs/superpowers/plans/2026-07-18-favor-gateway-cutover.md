# Favor Gateway Cutover Plan

**Goal:** Make `currency_ledger` authoritative for every durable Favor mutation before Starfishing Phase 2 is enabled, while preserving `user_levels.data.points` as a read-compatible mirror.

**Safety:** This plan is staging-only. Do not apply migrations, deploy, or touch `deploy-login-fixed-c218`. Keep Starfishing durable claims disabled until all three tasks and database smoke tests pass.

## Global Constraints

- Browser callers never submit Favor amounts, balances, target users, reward definitions, or forge costs.
- Every mutation uses an authenticated `security definer` RPC with `set search_path = ''`, schema-qualified relations, explicit `auth.uid()` validation, and no `PUBLIC` or `anon` execution.
- `private.ensure_favor_account(uuid)` imports one safely owned nonnegative integer legacy balance exactly once and locks the account.
- `private.post_favor_entry(...)` atomically updates account, append-only ledger, and `user_levels.data.points`.
- Underlying portal actions have one reward identity per user, currency, action type, and source row.
- Direct authenticated writes to `user_levels`, `user_relics`, and `user_relic_charms` are revoked only after every current client mutation path has moved to validated RPCs.
- Boop milestones remain visual-only until the server can verify a durable event. They do not grant Favor during the cutover.
- Existing legacy balances are trusted as the opening balance. No historical cap or reset is introduced.

## Task 1: Database Favor Primitives

**Files:**
- Modify `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Create `src/lib/favorGatewayContract.js`
- Create `src/lib/favorGatewayContract.test.js`

Implement:

1. `private.ensure_favor_account(uuid)` with safe legacy ownership matching and deterministic opening-balance ledger import.
2. `private.post_favor_entry(uuid, bigint, text, uuid, uuid, jsonb)` with account locking, nonnegative balance enforcement, append-only ledger insertion, and atomic mirror update.
3. A source-identity uniqueness constraint for durable Favor events.
4. `perform_portal_favor_action(text, uuid, text default null)` with a server-owned action map and no amount parameter.
5. Server validation for submit-post, post-blessing, blessing-comment, reliquary-comment, praise-blessing, praise-idea, and vote-poll.
6. Praise and poll RPC branches must own their canonical toggle/vote mutation so reward validation cannot race a client-written array.
7. Stable normalized response guards for `{ replayed, favor: { delta, balance }, rank }`.

Do not revoke legacy write grants in this task.

## Task 2: Social Award Client Cutover

**Files:**
- Create `src/lib/favorService.js`
- Create `src/lib/favorService.test.js`
- Modify `src/hooks/usePoints.js`
- Modify `src/components/community/PostForm.jsx`
- Modify `src/components/community/IdeaCard.jsx`
- Modify `src/components/community/PollCard.jsx`
- Modify `src/components/blessings/BlessingCard.jsx`
- Modify `src/components/blessings/BlessingForm.jsx`
- Modify `src/components/reliquary/ReliquaryEntryCard.jsx`
- Modify `src/components/dashboard/BoopTheFox.jsx`

Implement:

1. A narrow injected RPC adapter; do not expose ledger tables through generic entities.
2. Pass stable created row/comment IDs to the gateway.
3. Move praise toggles and poll voting to the gateway RPC.
4. Preserve rank-up results and user-facing notifications from the authoritative response.
5. Remove arbitrary `awardPointAmount` writes.
6. Keep Boop milestone animation and copy, but do not call a durable Favor mutation.

## Task 3: Forge, Admin, and Final Write Cutover

**Files:**
- Modify `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Modify `src/lib/relicService.js`
- Modify `src/pages/RelicForge.jsx`
- Modify `src/pages/Admin.jsx`
- Add focused tests beside each changed service/page contract.

Implement:

1. `ensure_user_relic()` for server-created default relic state.
2. `save_user_relic_with_favor(jsonb, uuid)` with a canonical cost, gate validation, payload allow-listing, sufficient-balance check, ledger debit, relic update, and idempotent replay.
3. `set_user_level_favored(uuid, boolean, text)` with staff validation for metadata only.
4. A one-time cutover reconciliation that records any final mirror/account difference before revocation.
5. Revoke authenticated direct writes to `user_levels`, `user_relics`, and `user_relic_charms`; retain the exact owner/staff reads required by existing screens.
6. Update Forge/Admin clients to use only the validated RPCs.
7. Keep Starfishing durable claims feature-disabled until Task 3 database/RLS smoke passes.

## Verification Gate

- Focused RED/GREEN tests for every task.
- Full Node suite, ESLint, and production build.
- Disposable PostgreSQL apply and SQL parse.
- Two-user RLS smoke.
- Opening import, duplicate source replay, concurrent award, insufficient Forge balance, rollback, reconciliation, and direct-write rejection.
- Equality: account balance = latest ledger balance = `user_levels.data.points`.
