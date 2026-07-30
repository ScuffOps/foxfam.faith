# Starfishing Phase 2 Verification

Date: 2026-07-18

## Scope And Safety

- Work was isolated to branch `codex/starfishing-phase-2` in worktree `/Users/scuffox/Documents/Codex/FoxfamPortal/foxfam.faith/.worktrees/starfishing-phase-2`.
- Production branch `deploy-login-fixed-c218` was untouched.
- No deployment was created.
- No live database writes or migration applications were performed.

## Verified Locally

| Check | Result |
| --- | --- |
| Node test suite | PASS: 388/388 |
| `eslint --quiet` | PASS |
| `tsc -p ./jsconfig.json` | PASS |
| `vite build` | PASS |
| `git diff --check` | PASS |
| Playwright game-hub suite | PASS: 24/24 route and viewport checks |
| Playable-game flat-vector contract | PASS |

- Unresolved valid cast tickets are reused to prevent rerolls.
- Claims require the exact QTE action count, zero misses, server-enforced
  `not_before` and expiry bounds, and a plausible duration with tolerance.
- Signed-in users can preselect Keep, Release for Favor, or Convert to forge
  dust without exposing duplicate status.
- Starfishing authentication outages block local fallback.

## Browser QA

The routes `/quarters`, `/quarters/visitor`, `/relic-forge`, `/profile`,
`/profile/familiar`, `/collections`, `/starfishing`, `/match-merge`,
`/boba-cafe`, `/find-vezmir`, `/time-runner`, and `/word-garden` were checked
at desktop `1280x720` and mobile `390x844`.

- No horizontal overflow was observed.
- The playable routes exercised desktop keyboard and mobile touch controls.
- Axe checks ran for every route and viewport.
- The playable-game art gate rejects gradients, filters, blended rendering,
  texture, grain, and noise effects.
- Browser error logs were empty.
- Local `auth_unavailable` handling was verified.
- A controlled HTTP 401 was verified as the normal signed-out guest state.

## Supabase Safety Harness

The Phase 2 smoke harness uses fixed, reviewed inputs and fails closed. Its
project allowlist remains intentionally empty, so it cannot target a Supabase
project until a disposable project is explicitly reviewed and allowlisted.

## External Checks

No reviewed disposable Supabase project was provisioned. The following checks
were therefore **BLOCKED / NOT RUN** and must not be treated as passed:

| Check | Status | Reason |
| --- | --- | --- |
| Migration application | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| RLS and grants runtime smoke | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| Signed-in catch claim end to end | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| Signed-in charm equip persistence | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| Signed-in profile and Fishpedia persistence | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| Supabase advisors | BLOCKED / NOT RUN | No reviewed disposable Supabase project |
| Enable migration | BLOCKED / NOT RUN | No reviewed disposable Supabase project |

These checks require a fresh disposable project, reviewed fixture setup, and
explicit allowlisting before execution. The live Foxfam Supabase project must
not be substituted for that environment.

## 2026-07-26 Persistence Boundary Recheck

A read-only inspection of the connected Foxfam Supabase project confirmed:

- production is healthy and remains the default database branch;
- the only development database branch is the unrelated
  `phase-1-bridge-dev` branch;
- production does not expose the Phase 2 game-session, reward-claim,
  Starfishing, Relic Forge, or public game-progression RPCs.

No SQL was applied and no database state was changed. Durable game progression
therefore remains intentionally unproven until a dedicated disposable
game-hub database branch is created, the staged migrations are applied there,
and both reward smoke suites pass against that exact branch.

## 2026-07-30 Isolated Persistence Verification

The approved Supabase branch `game-hub-phase-2-staging`
(`drauxhhxlatvylzktuqq`) was created without production data. Its preview
project is `ACTIVE_HEALTHY`. Supabase reports the branch migration job as
`MIGRATIONS_FAILED` because an unrelated portal notification migration requires
a production staff profile during its backfill; the game migrations were
applied separately to this isolated branch.

- The branch contains six canonical fish, five reward games, and 21
  achievements.
- The generic game-reward smoke passed anonymous rejection, disabled-game
  rejection, server-owned Word Garden progression, idempotent replay, and
  cross-user rejection.
- Starfishing rejected anonymous, early, and cross-user claims, then accepted a
  valid timed claim and replayed it without a second reward.
- Eight duplicate releases produced 18 server-authored Favor through
  `starfishing_catch` ledger entries marked with
  `duplicate_policy = release`.
- The Relic Forge rejected an unaffordable 73-Favor build, saved a canonical
  43-Favor build exactly once, and replayed the same request without a second
  debit.
- All five reward games are enabled on this isolated branch.
- Disposable users, sentinel tables, and smoke-only RPC helpers were removed
  after verification.
- The final security advisor pass reported zero errors, no anonymous game
  security-definer functions, and no remaining smoke-helper warnings. Existing
  portal warnings and intentional authenticated transaction RPC notices remain
  documented for later hardening.

The production Supabase project was not modified. Vercel Preview environment
wiring remains a separate staging-only step and must not target Production.
