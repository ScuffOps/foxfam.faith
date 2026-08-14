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

## 2026-08-10 Current Staging Recheck

The isolated branch remains `ACTIVE_HEALTHY` at `drauxhhxlatvylzktuqq` and the
Vercel Preview configuration preflight still points only at that project. The
Supabase branch status continues to read `MIGRATIONS_FAILED` for the unrelated
notification backfill described above; current catalog inspection confirms the
game schema and later repair migrations are present.

Current read-only and rollback-only checks proved:

- all five shared reward games can start an authenticated reward session;
- Starfishing can mint an authenticated cast ticket with a server-selected fish;
- Relic Forge state and public game progression load through their narrow RPCs;
- the current Word Garden claim wrapper accepts canonical progress, computes a
  score of 19, awards 4 Favor and Blooming Ink, attaches two collectible
  achievements, and idempotently replays the same reward event;
- every inspected game/Forge `SECURITY DEFINER` RPC revokes anonymous execution,
  pins an empty `search_path`, and reaches an `auth.uid()` ownership check;
- the collectible receipt wrapper delegates to a private function that verifies
  the caller owns the reward session;
- no transaction-smoke rows were retained because every database check rolled
  back before completion.

The current source also passes lint, typecheck, production build, the game-art
preflight, 487 Node contract tests, and 24 desktop/mobile browser route checks
with no reported accessibility violations. A fresh two-user HTTP reward smoke
has not been rerun because the Preview environment intentionally contains no
confirmed fixture credentials and email confirmation prevents disposable
client sign-up from yielding a session. The earlier full two-user smoke remains
the authority for cross-user rejection and idempotent reward delivery until
new disposable confirmed fixtures are explicitly provisioned.

No generated environment render has been integrated. Quarters and Starfishing
continue to use their procedural approval fallbacks while authored Foxfam art
awaits concept and render approval. Production remains untouched.

## 2026-08-13 Moonbrew Art System Checkpoint

The user approved the authored Moonbrew cafe palette and flat-rendering
checkpoint. The approved checkpoint was separated into three independent SVG
scene planes and wired through the art manifest's explicit approval boundary:

- `boba-cafe.room-bg` contains the dark teal/plum room shell, celestial window,
  terracotta floor, sofa, wall decor, plants, and lantern;
- `boba-cafe.workstations` contains the service station, ingredient jars, and
  staged drink prop;
- `boba-cafe.counter-fg` contains the foreground counter that occludes the
  customer and familiar without covering the active drink UI.

All three assets use the `foxfam-asset-art-v1` contract and contain solid fills,
dark navy linework, no gradients, no filters, no embedded rasters, no opacity
stacks, and no texture or grain. The game-art preflight passed all seven
negative-contract tests and checked all three approved assets.

The full game-hub Playwright pass then completed 24 desktop/mobile route checks
against `http://127.0.0.1:5190`. Both Boba captures reported no clipped customer
or familiar, no horizontal overflow, no unnamed controls, and no accessibility
violations. The cafe fulfilled all three practice tickets by keyboard on
desktop and touch on mobile. Evidence is stored outside the repository at
`/private/tmp/foxfam-moonbrew-integration`.

This checkpoint approves only the Moonbrew three-plane art family. The other
environment, prop, sprite, and collectible slots remain gated in the manifest
until their own render and system approvals. No Vercel deployment was created.

## 2026-08-13 Full Game-Hub Progression and UX Recheck

The seven staged surfaces now share a task-first responsive shell and familiar
continuity. Match & Merge, Find Vezmir, and Word Garden gained a compact saved
familiar companion outside their playfields; Boba Cafe, Starfishing, and Time
Runner retain their scene-integrated companions. The Collections route now
renders the authoritative cross-game `user_achievements` history as an
Achievement Chronicle, alongside Fishpedia, charms, trophies, and materials.
Forge charm cards now preserve game provenance and passive/cosmetic labels.

The reward audit also added two source-only hardening changes:

- a forward migration grants the reviewed Starfishing and shared reward RPCs
  only to authenticated users and enables exactly the five shared game rows;
- the disposable Starfishing fixture can force a previously caught fish and
  verify a real duplicate `release` conversion, positive server-authored Favor,
  no material conversion, and a matching ledger entry.

The migration has not been applied to Supabase. The disposable helper remains
sentinel-gated, revoked by default, and digest-pinned. The production database,
production Vercel deployment, and production branch were not modified.

Verification completed locally:

- all focused progression, auth-owner invalidation, fixture safety, familiar,
  and Collections checks passed;
- the full Node contract suite passed;
- configured TypeScript and scoped ESLint passed;
- `git diff --check` passed;
- Playwright passed 36 desktop, compact, and mobile route/viewport checks.

Priory Courtyard and Starfishing environment/foreground art remain isolated in
`/private/tmp` and are not registered in the manifest. Their render checkpoints
still require explicit user approval before staging integration. No Vercel
preview deployment was created in this checkpoint.

## 2026-08-13 Forge Achievement and Shared Passive Checkpoint

Quarters now renders the visitor's privacy-safe public cosmetic projection
around the public collection. The resolver accepts only known profile-frame and
profile-particle keys, never private inventory fields, and the shared cosmetic
frame still limits the surface to one prioritized frame and one particle effect.

The source-only Forge progression migration adds three server-authored
milestones:

- `First Temper` for the first completed charm upgrade, awarding the uncommon
  `Hearthforged Seal` charm and trophy;
- `Kindly Transmuted` for the first completed duplicate conversion, awarding a
  trophy;
- `Ascendant Hand` for the first three-star upgrade, awarding the mythic
  `Ascendant Anvil` charm, profile frame, and trophy.

Forge milestones are emitted only when a durable private Forge receipt changes
to `completed`. Inserts into `user_achievements` are idempotent, use the existing
collectible-fulfillment trigger, and backfill prior completed receipts.

The subsequent source-only shared-passive migration wraps the final canonical
game claim boundary. It derives two effects only from equipped, catalog-backed
achievement charms:

- `game_favor_multiplier_bps`, bounded to 25% and constrained by the existing
  per-game daily Favor cap;
- `game_material_multiplier_bps`, bounded to 25% for each positive canonical
  material reward.

Bonus ledger entries use separate scoped idempotency identities. The enriched
claim is persisted to the reward event before return, so replays preserve the
original loadout result even when equipped charms later change. Starfishing's
specialized fishing passives remain independent.

Local verification for this checkpoint passed 32 focused contracts, TypeScript,
scoped ESLint, `git diff --check`, the 525-test repository suite, and a Vite
production build. The two new migrations have not been applied to Supabase. No
Vercel deployment was created and production was not modified.

## 2026-08-13 Isolated Staging Migration Reconciliation

A fresh read-only reconciliation against the dedicated Supabase preview branch
`game-hub-phase-2-staging` (`drauxhhxlatvylzktuqq`) supersedes the source-only
application note above. The branch remains `ACTIVE_HEALTHY`; its parent
production project remains the default branch and still does not contain the
game-hub migration wave.

The preview migration history now contains the reviewed Forge achievement,
shared charm-passive, public cosmetic-priority, and public familiar-projection
migrations. Catalog and privilege checks confirmed:

- all five shared reward games are enabled;
- `First Temper`, `Kindly Transmuted`, and `Ascendant Hand` are active with the
  expected server-owned charm, trophy, profile-frame, and passive rewards;
- Starfishing, shared reward, and public progression RPCs are executable only
  by `authenticated`, never by `anon` or `PUBLIC`;
- privileged internal reward and projection wrappers remain in `private`, pin
  an empty `search_path`, and are not executable by API roles;
- game progression and familiar tables use forced RLS, and the familiar owner
  policies include matching `USING` and `WITH CHECK` ownership predicates.

Supabase security advisors reported no anonymous game RPC exposure. The
remaining advisor notices are either intentional authenticated transaction RPC
notices, server-owned no-policy tables with API grants revoked, or pre-existing
portal findings outside this game-hub staging scope. No SQL or migration was
applied during this reconciliation, and production was not modified.

## 2026-08-13 Shared Reward Recovery Checkpoint

The five shared-reward minigames now preserve a failed reward request in
owner- and game-scoped `sessionStorage`. Action and claim recovery records carry
the original idempotency key together with the most recent canonical server
session context, allowing a reload to restore the rewarded board and retry the
same request instead of producing a duplicate action or claim. Failed session
starts restore an explicit Retry state rather than silently opening another
session.

Match & Merge and Boba Cafe now use the same auth-owner generation guard as
Find Vezmir, Time Runner, and Word Garden. A response from an old account is
discarded after sign-out or account switching, while that account's recovery
record remains isolated for a later return. Successful requests clear only the
current owner and game's record. Recovery payloads are validated and bounded
before storage; malformed UUIDs, cross-game sessions, oversized actions, and
missing action/claim sessions are rejected.

Focused verification passed 20 storage and route-integration contracts, scoped
ESLint, and `git diff --check`. The complete repository suite then passed
541/541 contracts, configured TypeScript passed, Vite produced a production
bundle, and Playwright passed 36 desktop, compact, and mobile route/viewport
checks against the local staging preview. This remains source-only staging
work: no Supabase migration, Vercel deployment, or production branch was
modified.

## 2026-08-13 Atomic Environment Approval And Interaction Recheck

The production-art manifest now models the Find Vezmir cloister as one atomic
three-plane family: far arcade, playable room, and near foreground. The live
component resolves authored art only when all three slots have complete approval
provenance. A partial approval therefore fails closed to the existing playable
flat fallback instead of producing a half-rendered courtyard.

The four authored SVG candidates for Match & Merge, Find Vezmir, Time Runner,
and Word Garden remain outside `public/` while render approval is pending. The
responsive review board is stored outside the repository at
`/private/tmp/foxfam-render-candidates/review/four-world-render-board.png`.
Every candidate passed the environment preflight with at most 18 solid fills,
the correct 16:9 viewBox, and no gradients, filters, opacity layers, blend modes,
embedded rasters, texture, or grain.

The full `foxfam-asset-art-v1` manifest now exposes 41 explicit environment,
prop, sprite, collectible, interaction, and UI slots. Six approved files remain
deployable: the Quarters three-plane room and Moonbrew three-plane cafe. The
remaining 35 slots are approval-gated and resolve to no deployable asset.

Current local verification:

- Node contract suite: PASS, 542/542;
- configured TypeScript: PASS;
- scoped ESLint for the atomic Vezmir change: PASS;
- Vite production bundle: PASS;
- `git diff --check`: PASS;
- Playwright game-hub suite: PASS, 36/36 desktop, compact-desktop, and mobile
  route/viewport checks with real keyboard or touch task completion, Axe checks,
  overflow checks, canvas sampling, clipping checks, and collectible readability.

The revised Courtyard and Starfishing image is a layout-only concept. It remains
outside the repository and is explicitly rejected as a production render because
its tonal shading and micro-detail exceed the approved authored SVG language.
No Vercel deployment, production branch change, manifest approval, or live
database mutation occurred in this checkpoint.

## 2026-08-13 Isolated Vercel Preview Readiness Baseline

The staging worktree remains on `codex/starfishing-phase-2`, linked to the
`scuffops/foxfam.faith` Vercel project. Read-only project inspection confirmed
that existing deployments from this branch use `target: null`, while the current
production deployment belongs to a different branch and commit. Production was
not promoted, aliased, rolled back, or otherwise changed during this check.

Vercel CLI environment metadata confirmed exactly three game-hub variables,
all encrypted and scoped to `Preview (codex/starfishing-phase-2)`:

- `VITE_GAME_HUB_STAGING`;
- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

No variable values were read or printed. No Production or Development variable
was added, removed, or modified. The project currently has no password, SSO, or
trusted-IP deployment protection enabled, so the final stakeholder preview will
need an explicit sharing decision before deployment if access restriction is
required.

This is a readiness baseline only. No new Vercel deployment was created. The
next final preview remains gated on authored-art approvals, manifest integration,
the full local verification suite, and an unchanged production deployment
comparison immediately before and after preview creation.

## 2026-08-13 Atomic Collectible Art Boundary

The shared collectible system now exposes 79 key-specific, namespaced art
slots: 5 relic bases, 6 relic effects, 34 charms, 19 trophies, 5 profile
frames, 9 profile particles, and 1 fishing catch effect. Generic family-level
placeholders were removed from the world-art manifest because they could imply
coverage without proving that each authoritative collectible key had its own
approved asset.

Relic bases, charms, and trophies now consult the atomic collectible manifest
before their existing functional fallback. The resolver fails closed unless
concept, render, and system approval each contain complete provenance and the
asset uses its canonical key-specific path beneath
`/assets/game-hub/collectibles/`. No collectible asset is currently approved or
deployable, so this change does not alter the staged visuals yet.

The game-art validator now rejects raw or encoded traversal, backslashes,
query/fragment suffixes, paths outside the canonical game-hub root, and symlink
escapes. Current verification for this boundary:

- focused collectible, presentation, and validator contracts: PASS, 32/32;
- scoped project-local ESLint: PASS;
- approved deployable game-art preflight: PASS, 6/6 assets;
- `git diff --check`: PASS.

The first bounded collectible concept wave is documented in
`docs/art/2026-08-13-collectible-first-wave-concepts.md`. It remains approval
gated and contains no generated, authored, or deployable art.

## 2026-08-13 Public Cosmetic Priority And Trophy Provenance

A forward-only migration now replaces the public game-progression projection's
alphabetical `max()` cosmetic selection with the same deterministic priority
used by the owner's profile: rarity descending, forged star descending, charm
key ascending, then stable id order. Frame and particle selection are performed
independently and remain restricted to equipped, unlocked achievement charms
whose authoritative reward key matches the stored charm key.

The projection now preserves the canonical `relic_roll` source token instead
of rewriting it as `relic-roll`. The public client accepts only the three known
source types (`achievement`, `relic_roll`, and `legacy`), and trophy
presentation now honors the privacy-safe authoritative title supplied by the
projection before deriving a label from the trophy key.

Verification:

- public projection, cosmetic presentation, and trophy contracts: PASS, 16/16;
- scoped project-local ESLint: PASS;
- `git diff --check`: PASS;
- downstream source-token audit: no live consumer expects `relic-roll`.

The migration is source-only in this checkpoint. It has not been applied to a
local, preview, or production Supabase project.

## 2026-08-13 Avatar-Safe Profile Frame Boundary

Profile-frame cosmetics now own a dedicated 1:1 avatar layer rather than
restyling an entire profile or public-collection card. The owner profile wraps
the actual avatar in that layer; privacy-safe visitor Quarters wraps a neutral
Priory identity seal and does not expose new personal fields. Approved frame
art will resolve only inside the square layer, while the surrounding cards stay
neutral. The existing restrained particle label remains card-level until the
profile-particle art wave is approved.

Verification:

- avatar-frame, collectible-manifest, profile-cosmetic, and integration
  contracts: PASS, 13/13;
- scoped project-local ESLint: PASS;
- configured TypeScript: PASS;
- Vite production-mode bundle: PASS;
- Playwright game-hub suite: PASS, 36/36 desktop, compact-desktop, and mobile
  route/viewport checks;
- visual review: desktop/mobile public Quarters identity frame is contained,
  readable, and does not clip or frame the surrounding collection card.

The route screenshots and report are local verification artifacts under
`/private/tmp/foxfam-game-hub-playtest-avatar-frame`. No deployment or database
mutation occurred.

## 2026-08-13 Fail-Closed Collectible Effect Consumers

Relic effects, profile particles, and the Starfishing Merciful Tide catch
flourish now have key-specific production-art consumers. Each consumer consults
the atomic collectible manifest and remains absent until concept, render, and
system approval are all complete. Existing fallback visuals therefore remain
unchanged while collectible art is still pending.

Relic bases and effects are independently gated so one approved effect can be
layered over either an approved base or the current deterministic fallback,
with no more than one active effect. Profile particles retain their current
restrained icon badge until a matching approved particle asset exists.

Starfishing loads only the signed-in owner's equipped `merciful-tide`
achievement charm with canonical `gentle-return` provenance. The catch effect
is selected from the trusted local catalog rather than stored effect JSON and
can render only after an authoritative server claim confirms that the catch was
a duplicate released for Favor. Unverified catches, kept or converted
duplicates, unequipped charms, and invalid provenance render no effect.

Verification:

- focused collectible-effect and Starfishing progression contracts: PASS,
  26/26, followed by the filename-resolution repair subset at 22/22;
- broader relic, profile, progression, Starfishing server, simulation, and UI
  contracts: PASS, 126/126;
- scoped project-local ESLint: PASS with no errors;
- configured TypeScript (`tsc -p ./jsconfig.json`): PASS;
- Vite production-mode bundle: PASS;
- `git diff --check`: PASS;
- Playwright game-hub suite: PASS, 36/36 desktop, compact-desktop, and mobile
  route/viewport checks.

The first Vite bundle exposed a macOS case-insensitive module-resolution
collision between the catch-effect component and selector. The selector was
renamed to `starfishingCatchEffectModel.js`, and the production bundle then
passed. Screenshots and the route report are under
`/private/tmp/foxfam-game-hub-playtest-approved-art-hooks`.

No collectible asset was approved or integrated, and no Vercel deployment or
database mutation occurred in this checkpoint.

## 2026-08-13 Archivum Isolated Persistence Recheck

This recheck targeted only the isolated Supabase project
`drauxhhxlatvylzktuqq`. The production project
`wdypokgdqgvqpyabvshq` was not queried or changed, no migration or Edge
Function was deployed, and no Vercel deployment was created.

Current isolated-project migration history includes the shared game-reward
boundary, Relic Forge achievement, shared charm-passive, public cosmetic
priority, and public familiar-projection migrations. The four smoke harness
contract files passed 31/31 local tests.

Authenticated disposable-user smoke evidence:

- all five enabled shared-reward games completed and claimed canonical server
  rewards; anonymous starts, unknown games, direct event inserts, cross-user
  claims, cross-session idempotency reuse, and client-authored scores were
  rejected;
- Starfishing rejected anonymous casting, cross-user claims, early claims, and
  direct catch inserts; a valid claim persisted its catch and Fishpedia state,
  and replay returned the original catch and balance;
- an isolated forced duplicate of the already caught fish, claimed through the
  public RPC with `release`, awarded 2 Favor, no materials, matching
  `currency_ledger` provenance, and an idempotent replay;
- the earned `Starlit Bobber` achievement charm equipped for its owner, was
  rejected for a different authenticated user, exposed its authoritative 500
  basis-point fishing Favor passive, and a subsequent catch receipt included
  that passive in `applied_effects`;
- an owner saved a `moss-turtle` familiar through authenticated table RLS; a
  different user could not read the private row but could load the six-field
  public familiar projection together with one discovered Fishpedia entry,
  two catches, thirteen public trophies, and the equipped charm.

RLS is enabled on the reward, progression, relic, collection, and familiar
tables inspected. Game transaction RPCs are authenticated-only
`SECURITY DEFINER` functions with empty `search_path`; direct owner data uses
`auth.uid() = user_id` policies. `game_cast_tickets` intentionally has no
direct policy and remains RPC-only.

One harness constraint remains fail-closed:

- the dedicated Starfishing Phase 2 harness was not bypassed because its fixed
  bootstrap and enable fixtures are dirty and its committed disposable-user
  allowlist is empty. Production-shaped public-RPC checks above cover the live
  isolated schema, but do not replace that fixture-pinned harness.

The generic shared-reward harness is now rotation-aware. It selects a minimal
canonical normal/full-bloom pair from the public puzzle key returned by the
server, covers all seven seeded rotations, derives expected score and Favor
from that pair, and fails closed when an unregistered rotation appears. The
server continues to withhold its accepted-word list and remains authoritative.

The official checked-in `game-rewards-staging-smoke.mjs` was then rerun against
the isolated project with two disposable authenticated users. It passed
`word-garden`, `match-merge`, `boba-cafe`, `puzzle-cat`, and `time-runner`
without the temporary driver. The run produced five distinct positive-Favor
claims, five material-bearing claims, thirteen achievements, thirteen trophies,
and nine charms while preserving the anonymous, direct-insert, cross-user,
cross-session idempotency, and client-score rejection checks. Both users were
deleted, temporary credentials were removed, and exact-user cleanup returned
zero rows across the seventeen checked auth, reward, progression, collection,
Starfishing, and familiar relations.

Both disposable users were deleted after verification. Cascade cleanup was
confirmed at zero rows for auth users, reward sessions/actions/events, cast
tickets/catches, Fishpedia, currency and material balances/ledgers,
achievements, trophies, relics/charms, and familiars.

## 2026-08-13 Approved Hero Environment Integration

The user approved the Quarters, Priory Courtyard, and Starfishing environment
systems. These three hero surfaces remain behind the authored-art manifest and
retain their registered procedural fallbacks. Match and Merge, Moonbrew Cafe,
Find Vezmir, Time Runner, and Word Garden now also consume their pending
sprite, prop, collectible, and interaction art only as complete atomic
families; no partial family can appear in the staged UI.

Verification after all art-family consumers were integrated:

- repository tests: PASS, 612/612;
- TypeScript project check: PASS;
- ESLint: PASS;
- Foxfam asset preflight: PASS, 13/13 validator tests and 12 approved assets;
- Vite production bundle: PASS;
- `git diff --check`: PASS;
- Playwright game-hub suite: PASS, 48/48 route and viewport checks, including
  keyboard, pointer, touch, Axe, canvas-pixel, and 48/64/128-pixel collectible
  raster checks.

Screenshots and the machine-readable route report are under
`/private/tmp/foxfam-game-hub-playtest-20260813-approved-heroes`.

The isolated shared-reward smoke was repeated against preview project
`drauxhhxlatvylzktuqq` using two branch-only confirmed users. Public API
authentication and canonical server-owned completion and claims passed for
`word-garden`, `match-merge`, `boba-cafe`, `puzzle-cat`, and `time-runner`.
The exact fixture users were then deleted. A post-cleanup query returned zero
rows for their Auth users, identities, sessions, game sessions, reward events,
material balances, and owned charms.

The production checkout and production Supabase project were not changed or
used by this verification. Vercel remains preview-only pending the guarded
staging deployment.

## 2026-08-13 Compact Sanctuary Navigation

Quarters, Relic Forge, Collections, Familiar Wardrobe, and every Priory game
now reserve only a 72-pixel icon rail on desktop. The full portal navigation is
available as a temporary modal overlay and cannot remain expanded through the
legacy `foxfam_sanctuary_nav_mode` browser preference. Ordinary portal routes
retain the full sidebar, while mobile retains its dedicated menu.

Verification against the current preview-only deployment
`https://foxfamfaith-8qa6quoik-scuffops.vercel.app`:

- focused navigation and browser-harness contracts: PASS, 15/15;
- ESLint: PASS;
- Vite production bundle: PASS;
- `git diff --check`: PASS;
- focused Playwright geometry check: PASS, rail remained 72 pixels before and
  after keyboard focus, and opening the full portal overlay left the game shell
  anchored at the same 72-pixel offset;
- Playwright game-hub suite: PASS, 48/48 route and viewport checks, including
  a deliberately seeded legacy `expanded` preference, keyboard/pointer/touch
  primary interactions, Axe, overflow, asset-response, visual-bound, and
  collectible-raster checks.

The current recheck also gave the drawer backdrop and its visible close button
distinct accessible names. The focused navigation regression subset passed
7/7 after that repair. Live browser geometry at 1280 pixels confirmed a
72-pixel rail, main content beginning at x=72, the correct `Match & Merge`
active state, and no horizontal overflow. At 390 pixels the rail was absent,
the dedicated mobile menu was visible, and document width remained 390
pixels. Escape dismissed the full portal drawer. The deployed JavaScript
bundle contained the isolated staging project ref once and the production
project ref zero times.

Screenshots and the machine-readable report are under
`/private/tmp/foxfam-game-hub-playtest-20260813-sanctuary-rail-final`. The
deployment `dpl_FvgiD51JcnyZrwBUR3XnrSAGSMoZ` is READY as a Vercel preview
(`target: null`) pinned to isolated Supabase project
`drauxhhxlatvylzktuqq`; production was not promoted or changed.

## 2026-08-13 Authenticated Preview Projection Proof

The final preview-only deployment above was exercised with one disposable,
confirmed user in the isolated Supabase project. The browser used the real
Blooming Ink keyboard flow, submitted one normal word and one Full Bloom,
rested the garden, and claimed the canonical server receipt.

- the claim awarded 4 Favor and 3 Blooming Ink;
- `word-garden-first-sprout` and `word-garden-full-bloom` were recorded;
- Collections projected two achievements, two charms, and two trophies;
- Profile projected the same authoritative Favor balance and owned charms;
- the client now accepts the deployed Word Garden `display_name` field on
  strict progress and claim payloads while continuing to reject unrelated
  response fields;
- first-login profile bootstrap retries only the narrow duplicate-key race
  caused when the Auth trigger wins between the client select and insert.

The authenticated report and screenshots are under
`/private/tmp/foxfam-authenticated-game-hub-20260813-final`. The exact test user
was deleted after the pass. A final cleanup query covering that user and every
earlier diagnostic fixture returned zero residual rows across 19 Auth,
profile, reward, currency, material, collection, Starfishing, relic, and
familiar relations.

The final JavaScript bundle contains the isolated staging project ref once and
the production project ref zero times. The production branch, production
Supabase project, and production Vercel deployment were not changed.

## 2026-08-14 Match & Merge Short-Viewport Fit

The local staging worktree now applies a dedicated short-desktop composition
between 761 pixels wide and 800 pixels high. It removes the decorative bench
backboard, reduces secondary spacing, and caps the playable table at 20rem
without changing the four-by-four interaction grid, reward logic, or mobile
layout.

Verification against the local worktree at `http://127.0.0.1:5190`:

- focused Match & Merge contracts: PASS, 16/16;
- TypeScript project check: PASS;
- Vite production bundle: PASS;
- `git diff --check`: PASS;
- 1280x720 browser geometry: PASS, all 16 cells fully inside the viewport,
  299x294-pixel board, 64-67-pixel cells, and document height exactly 720px;
- 390x844 browser geometry: PASS, all 16 cells inside the viewport width,
  document width exactly 390px, and no horizontal overflow;
- browser console: no application errors on either viewport.

This responsive change is not yet present in the Vercel preview. Production was
not deployed, promoted, queried, or changed.

## 2026-08-14 Full Short-Desktop Game-Hub Sweep

The local staging worktree now keeps every primary minigame surface and its
task controls visible at 1280x720. Find Vezmir derives its illustrated diorama
height from the short viewport so the attached pan rail remains above the fold.
Blooming Ink retains the complete interactive flower while compacting only its
secondary spacing and hiding redundant keyboard hints at that height.

Verification against the local worktree at `http://127.0.0.1:5190`:

- focused route, navigation, Find Vezmir, and Blooming Ink contracts: PASS,
  28/28;
- Playwright game-hub suite: PASS, 60/60 route and viewport checks across
  desktop keyboard, desktop pointer, compact desktop, short desktop, and
  mobile touch profiles;
- the short-desktop profile explicitly requires each minigame's primary play
  surface and task controls to remain visible without page scrolling;
- Axe, overflow, asset-response, familiar clipping, collectible-raster, and
  primary-interaction checks remained green.

Screenshots and the machine-readable report are under
`/private/tmp/foxfam-game-hub-playtest-20260814-short-desktop-v2`. These local
responsive changes are not yet present in the Vercel preview. Production was
not deployed, promoted, queried, or changed.

## 2026-08-14 Short-Desktop Preview Refresh

The verified responsive and compact-navigation slice is now available at
`https://foxfamfaith-ddajxxv1n-scuffops.vercel.app`. Vercel reports deployment
`dpl_9x1sqoczGEY9Uw5d4kTBg2YJk5oU` as `READY` with target `preview`.

- deployed Playwright game-hub suite: PASS, 60/60 route and viewport checks;
- deployed compact rail: PASS, 72 pixels wide with the correct active route
  and a named full-navigation drawer trigger;
- deployed bundle boundary: PASS, isolated Supabase ref
  `drauxhhxlatvylzktuqq` present once and known production ref absent;
- production was not deployed, promoted, aliased, queried, or changed.

Deployed screenshots and the machine-readable report are under
`/private/tmp/foxfam-game-hub-playtest-20260814-deployed-short-desktop`.

## 2026-08-14 Authenticated Preview Confirmation Gate

The refreshed preview was exercised with the authenticated staging harness
against isolated Supabase project `drauxhhxlatvylzktuqq`. Staging Auth still
requires email confirmation, so the harness could not obtain a session and did
not invoke any game reward RPC. This is an external staging prerequisite, not
an authenticated application pass or failure.

The harness now records that distinction in a secret-free failure artifact:

- status: `blocked_external_prerequisite`;
- reason: `email_confirmation_required`;
- exact cleanup contract and deduplicated user IDs only;
- no email, password, access token, refresh token, or privileged key.

The artifact for this run is
`/private/tmp/foxfam-authenticated-game-hub-20260814-ddaj-report/failure-report.json`.
The exact disposable user `bb3b9e60-ed56-4551-8399-3f16917c0258` was deleted
immediately after the bounded confirmation wait. A post-cleanup query returned
zero residual rows across 63 relations: `auth.users`, ten Auth relations keyed
by `user_id`, `public.profiles`, and all 51 public user-owned relations.

The earlier diagnostic user `99869808-df47-4858-977d-7829cb512e75` was also
confirmed absent from Auth, profiles, and all 51 public user-owned relations.
Production Supabase, the production branch, and the production Vercel target
were not queried, deployed, promoted, aliased, or changed.

## 2026-08-14 Continuation Engineering Audit

The art approval gate remained closed while the non-art completion evidence was
refreshed. No pending candidate entered `public/`, the runtime art manifests, or
the staged deployment.

- full repository unit and contract suite: PASS, 646/646;
- focused staging reward, owner-switch recovery, and preview-boundary suite:
  PASS, 35/35;
- TypeScript project check: PASS;
- ESLint quiet check: PASS;
- isolated Vite production-mode bundle: PASS, written only to
  `/private/tmp/foxfam-game-hub-build-20260814`;
- review-only art candidate manifest: PASS, 13/13 exact SHA-256 checksums;
- Find Vezmir v3 scene planes: PASS, no gradients, filters, opacity, patterns,
  masks, embedded images, or style attributes; runtime integration remains
  false pending stakeholder approval.
- completion audit coverage: PASS, expanded beyond routes and art to ten
  explicit functional, persistence, accessibility, isolation, and release
  evidence gates. Eight are verified; `authenticated-preview-projection` and
  `final-stakeholder-release` remain fail-closed as `needs-proof`.

The local Vercel environment snapshots contain deployment metadata but no game
hub application variables. The preview preflight therefore failed closed on a
missing `VITE_GAME_HUB_STAGING` value rather than inferring or borrowing a
backend. A read-only Supabase connector check then supplied the actual isolated
project URL and its enabled publishable key directly to the same preflight; it
passed for `drauxhhxlatvylzktuqq`. Read-only Supabase advisor checks returned
zero security notices and zero performance notices for that isolated project.

The previously documented authenticated browser gate remains email confirmation
on the isolated staging Auth project. Production Supabase, the production
branch, and the production Vercel target were not queried, deployed, promoted,
aliased, or changed.

## 2026-08-14 Sanctuary Rail Preview Refresh

The current game-hub worktree was rebuilt and deployed through the fail-closed
preview wrapper after the always-compact Sanctuary navigation rail was verified
against the complete route set. The refreshed preview is
`https://foxfamfaith-qvgglrlbp-scuffops.vercel.app`; Vercel reports deployment
`dpl_GeggafZ1A2e8gvgMQSDV2LHsgcfw` as `READY` with `target: null`.

- compact rail contracts: PASS, 16/16;
- full repository unit and contract suite: PASS, 647/647;
- TypeScript project check: PASS;
- ESLint quiet check: PASS;
- isolated Vite production-mode bundle: PASS, written only to
  `/private/tmp/foxfam-game-hub-build-sanctuary-rail`;
- local Playwright game-hub suite: PASS, 60/60 route and viewport checks;
- deployed Playwright game-hub suite: PASS, 60/60 route and viewport checks;
- desktop Sanctuary rail: 72 pixels wide, named, keyboard-focusable, and active
  on Quarters, Forge, Collections, Familiar Wardrobe, and all six games;
- full portal navigation remains available as a dismissible dialog, while
  mobile retains the existing menu interaction;
- deployed playtest screenshots and report are under
  `/private/tmp/foxfam-game-hub-playtest-vercel-qvgglrlbp`.

The safe wrapper loaded the branch-scoped preview environment and verified the
isolated Supabase project `drauxhhxlatvylzktuqq` before deployment. It did not
invoke a production target, promotion, rollback, or alias operation. Production
Supabase, the production branch, and the production Vercel deployment remain
unchanged.

## 2026-08-14 Authenticated Projection Rerun And Tooling Repair

The guarded authenticated browser harness was rerun against the newest ready
preview, `https://foxfamfaith-qvgglrlbp-scuffops.vercel.app`, and the isolated
Supabase project `drauxhhxlatvylzktuqq`. It reached the same external Auth
prerequisite: client signup created one disposable user, but staging email
confirmation prevented issuance of an authenticated session. No game reward
RPC or claim was invoked, so `authenticated-preview-projection` correctly
remains `needs-proof`.

The secret-free failure report is stored at
`/private/tmp/foxfam-authenticated-game-hub-20260814/failure-report.json` with
status `blocked_external_prerequisite` and reason
`email_confirmation_required`. The exact disposable Auth row returned by the
harness was deleted from the isolated project and the delete returned that
same identifier. Production Supabase was not addressed.

The tracked `scripts/npm-safe.zsh` wrapper also drifted behind the current
Codex dependency runtime: pnpm moved from `dependencies/bin/pnpm` to
`dependencies/bin/fallback/pnpm`, and its dependency-status check attempted an
unnecessary install before executing repository scripts. The wrapper now:

- respects an explicit `CODEX_PNPM_BIN` override;
- resolves both bundled pnpm locations;
- keeps pnpm dlx, store, npm, and XDG caches under `/private/tmp`;
- treats the npm-worktree dependency-status mismatch as a warning before
  launching the existing npm command.

The completion audit then ran successfully through the repaired wrapper and
remained fail-closed at 8/10 delivery gates, with only authenticated preview
projection and final stakeholder release still awaiting proof.

Verification for this continuation:

- wrapper contract tests: PASS, 3/3;
- full repository unit and contract suite: PASS, 664/664;
- ESLint quiet check: PASS;
- TypeScript project check: PASS;
- Vite production-mode bundle: PASS, written only to
  `/private/tmp/foxfam-game-hub-build-20260814-continuation`;
- manifest-derived completion audit: intentionally INCOMPLETE, 8/10 delivery
  gates verified, 12/38 world-art slots approved, and 0/81 collectible-art
  slots approved.

## 2026-08-14 Authenticated Preview Projection Pass

The guarded browser harness completed the previously open authenticated gate
against `https://foxfamfaith-qvgglrlbp-scuffops.vercel.app` and isolated
Supabase project `drauxhhxlatvylzktuqq`. The harness used one exact,
confirmed, disposable staging identity; no Auth setting was changed globally.

The signed-in browser run:

- started a real Blooming Ink session through the deployed Word Garden route;
- submitted two accepted words through the server-authoritative reward RPC;
- claimed `+4 Favor` and `+3 Blooming Ink`;
- unlocked `word-garden-first-sprout` and `word-garden-full-bloom`;
- projected two owned charms and two trophies in Collections;
- projected the resulting four-Favor balance and two owned charms in Profile.

The machine-readable report and three screenshots are stored under
`/private/tmp/foxfam-authenticated-game-hub-20260814-qvgg-confirmed`:

- `report.json`;
- `word-garden-claimed.png`;
- `collections-projection.png`;
- `profile-projection.png`.

After the pass, the exact Auth user was deleted by both its UUID and fixture
email marker. A post-delete query returned zero rows in `auth.users`,
`auth.identities`, the profile table, all checked reward, ledger, achievement,
charm, trophy, material, familiar, decor, catch, and Fishpedia tables, and the
checked private Forge receipt/investment tables: 23 relations in total.

Production Supabase, the production branch, and the production Vercel target
were not queried, deployed, promoted, aliased, or changed. The delivery audit
may now count `authenticated-preview-projection` as verified; final stakeholder
release and the remaining art approval inventory stay fail-closed.

Verification after recording the pass:

- focused completion-audit contracts: PASS, 5/5;
- full repository unit and contract suite: PASS, 664/664;
- ESLint quiet check: PASS;
- TypeScript project check: PASS;
- isolated Vite production-mode bundle: PASS, written only to
  `/private/tmp/foxfam-game-hub-build-20260814-authenticated-gate`;
- manifest-derived completion audit: intentionally INCOMPLETE, 9/10 delivery
  gates verified, 12/38 world-art slots approved, and 0/81 collectible-art
  slots approved.

## 2026-08-14 Current Preview Full Playtest

The complete current worktree, including the approved environment planes and
latest game state implementations, was rebuilt and deployed through the
preview-only wrapper to
`https://foxfamfaith-ngo6j4ejz-scuffops.vercel.app`. Vercel reports deployment
`dpl_5BhXnadHSRocE7enbh7yup343Rtv` as `READY` with target `preview`.

- isolated Vite build: PASS;
- Sanctuary rail and route contracts: PASS, 7/7;
- deployed Playwright game-hub suite: PASS, 60/60 route and viewport checks;
- desktop Sanctuary rail: 72 pixels on every desktop profile and hidden on
  mobile;
- full portal navigation overlay: opens and closes by keyboard without moving
  the game canvas;
- Boba Cafe at 1200x817: scene row and station actions both fit without page
  scrolling, with no clipped customer or familiar bounds;
- Boba Cafe at 1280x720: scene row and station actions both fit without page
  scrolling, with no clipped customer or familiar bounds;
- serious or critical Axe findings for the checked Match & Merge and Boba Cafe
  profiles: zero;
- same-origin route responses for Quarters, Forge, all six games, Collections,
  and Familiar Wardrobe: HTTP 200.

The machine-readable report and screenshots are stored under
`/private/tmp/foxfam-game-hub-playtest-ngo6`. The deploy wrapper verified the
isolated Supabase project `drauxhhxlatvylzktuqq` before upload. Production
Supabase, the production branch, and the production Vercel target were not
deployed, promoted, aliased, or changed.

The Veri Starwhale work produced during this continuation remains a local
review-only checkpoint under `/private/tmp/foxfam-art-checkpoints`. It has not
been copied into `public/`, added to the runtime art manifest, or deployed. The
art gate therefore remains fail-closed pending stakeholder concept and render
approval.

## 2026-08-14 Collectible Guardrail Preview

The Relic Forge presentation now limits its visible equipped-charm rail to two
keyed thumbnails plus a stable overflow count. The relic body still renders at
most one prioritized cosmetic effect, so larger equipped inventories cannot
turn the collectible silhouette into a scattered socket pile.

The collectible approval manifest now records the shared flat-cel render
contract on all 81 slots: transparent background, 12 meaningful fills maximum,
two cel-shadow tones maximum, top-left light, bottom-right shadow, two visible
effect layers maximum, and no white sticker halo. Approved raster collectibles
also receive a significant-color-band check that rejects soft gradient fields
while allowing transparent flat-color PNG exports.

Verification:

- focused Relic, Charm, trophy, profile cosmetic, manifest, and art-preflight
  contracts: PASS, 66/66;
- isolated Vite build: PASS;
- local Relic Forge browser check at 1440x900: two visible sockets, zero page
  errors, zero horizontal overflow;
- fresh preview deployment:
  `https://foxfamfaith-7s85kqtw5-scuffops.vercel.app`;
- Vercel deployment: `dpl_8YGTGEDQz86aiB14h7rHGPk9v2tN`, status `Ready`,
  target `preview`;
- deployed Playwright game-hub suite: PASS, 60/60 route and viewport checks;
- deployed evidence: `/private/tmp/foxfam-game-hub-playtest-7s85`.

The deployment wrapper again verified isolated Supabase project
`drauxhhxlatvylzktuqq` before upload. No production branch, production
deployment target, alias, or production Supabase project was addressed.
