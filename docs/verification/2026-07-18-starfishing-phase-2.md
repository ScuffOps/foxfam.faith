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
| Node test suite | PASS: 232/232 |
| `eslint --quiet` | PASS |
| `tsc -p ./jsconfig.json` | PASS |
| `vite build` | PASS |
| `git diff --check` | PASS |

- Unresolved valid cast tickets are reused to prevent rerolls.
- Claims require the exact QTE action count, zero misses, server-enforced
  `not_before` and expiry bounds, and a plausible duration with tolerance.
- Signed-in users can preselect Keep, Release for Favor, or Convert to forge
  dust without exposing duplicate status.
- Starfishing authentication outages block local fallback.

## Browser QA

The routes `/starfishing`, `/profile`, and `/quarters` were checked at desktop
`1280x720` and mobile `390x844`.

- No horizontal overflow was observed.
- Starfishing QTEs exposed keyboard and mobile directional controls.
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
