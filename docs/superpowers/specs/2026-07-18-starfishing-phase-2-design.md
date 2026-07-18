# Starfishing Phase 2: Server-Authoritative Progression

**Date:** 2026-07-18  
**Status:** Approved direction, pending implementation plan  
**Branch:** `vercel/game-hub-quarters-forge`

## Goal

Move Starfishing from local preview rewards to durable, server-authoritative progression without changing the existing production branch or breaking portal surfaces that still read Favor from `user_levels.data.points`.

Phase 2 persists catches and Fishpedia records, converts duplicate catches, grants Favor and forge materials, unlocks achievement charms, applies equipped fishing bonuses, and exposes the resulting progression to Starfishing, Profile, and Quarters.

## Non-Goals

- Generalizing every minigame onto the reward service in this slice.
- Making the browser authoritative for fish rarity, duplicate state, reward values, achievements, or balances.
- Replacing the existing Relic Forge or all `user_levels` consumers immediately.
- Building trading, marketplace, gifting, or paid gacha flows.
- Promoting the staging branch to production.

## Architecture

PostgreSQL is the authority for game progression. The browser owns moment-to-moment Phaser play and submits a completed-catch claim. A single authenticated RPC validates the claim and performs the progression transaction atomically.

The transaction:

1. Authenticates the caller through `auth.uid()`.
2. Validates an idempotency key, the ticket-bound fish key, selected duplicate policy, and bounded play evidence.
3. Loads the canonical fish and achievement definitions from database-owned catalogs.
4. Loads the caller's equipped fishing charms and computes allowed passive modifiers.
5. Determines whether the fish is new or a duplicate from server Fishpedia state.
6. Calculates the authoritative size, rewards, achievement unlocks, and charm grants.
7. Inserts the catch and reward event.
8. Updates Fishpedia aggregates.
9. Credits the Favor ledger and forge-material balance.
10. Mirrors the new Favor balance to the existing `user_levels.data.points` field.
11. Returns one normalized result payload for the catch sheet, Profile, and Quarters.

The RPC is intentionally exposed to `authenticated` users, uses a fixed empty `search_path`, explicitly qualifies every relation, validates `auth.uid()`, and receives only the minimum required execution grant. Direct reward-table writes remain unavailable to browser roles.

## Data Model

### `game_fish_catalog`

Canonical server-owned Starfishing definitions:

- `fish_key`
- display name and rarity
- minimum and maximum size
- base Favor value
- canonical material drops
- active flag and catalog version

Authenticated users may read active display metadata. Only privileged administration may mutate the catalog.

### `game_catches`

Immutable catch history:

- `id`
- `user_id`
- `game_key`
- `fish_key`
- authoritative size
- rarity snapshot
- duplicate flag
- duplicate policy
- play-evidence summary
- idempotency key
- created timestamp

The unique key `(user_id, idempotency_key)` prevents replayed requests from minting rewards twice.

### `user_fishpedia`

One aggregate row per user and fish:

- caught count
- smallest and largest size
- first and most recent catch timestamps

Users can read only their own rows. Updates occur through the claim transaction.

### `currency_accounts` and `currency_ledger`

`currency_accounts` stores a current balance per user and currency key. `currency_ledger` is append-only and records every credit or debit with:

- amount
- balance after the event
- source type and source identifier
- idempotency key
- metadata

`favor` is the first currency key. The ledger is authoritative; `user_levels.data.points` remains a compatibility mirror during the portal transition.

### `user_material_balances` and `material_ledger`

Durable balances and append-only events for Star Glass and future forge materials. The same idempotency and ownership rules used by Favor apply here.

### `achievement_catalog` and `user_achievements`

Server-owned achievement definitions and one unlock row per user/achievement. Initial Starfishing achievements are:

- `first-light`: first successful catch; grants the uncommon **Starlit Bobber** charm with `favor_multiplier_bps: 500`.
- `gentle-return`: first duplicate released for Favor; grants the rare **Merciful Tide** cosmetic catch effect.
- `pocket-constellation`: catch size within the lowest 5% of that fish's canonical size span; grants the epic **Pocket Star** profile particle.
- `myth-in-moonwater`: first mythic catch; grants the mythic **Glassfin Comet** charm with `rare_bite_bonus_bps: 300`.
- `celestial-archivist`: catch every active fish in the current catalog; grants the mythic **Fishpedia Frame** and a permanent Quarters trophy.
- `hundred-lights`: record 100 successful catches; grants the epic **Century Chain** charm with `material_multiplier_bps: 750`.

Achievement evaluation occurs after the Fishpedia aggregate update inside the transaction.

### Achievement Charms

Achievement charms continue to use `user_relic_charms`, but clients may not create achievement-sourced rows directly. The claim transaction inserts a charm instance once for achievements whose catalog definition grants one.

Each granted charm records:

- stable charm key
- achievement source key
- rarity and slot
- passive or cosmetic effect definition
- acquired timestamp
- unequipped default state

Existing profile equipment UI remains responsible for selecting an owned charm. Equipment writes will be moved to a validated RPC so one charm per slot is enforced atomically.

## Passive Bonus Model

Bonuses are data-driven and capped on the server. Supported Phase 2 effects are deliberately small:

- `favor_multiplier_bps`: increases catch Favor, capped at `2500` basis points total.
- `material_multiplier_bps`: increases material drops, capped at `2500` basis points total.
- `rare_bite_bonus_bps`: adjusts the next server-issued cast ticket, not a completed client claim.
- `size_floor_bps`: raises the minimum authoritative size roll, capped at `1000` basis points of the fish's size span.
- cosmetic effects and profile frames: no economy impact.

Additive effects are summed by category and clamped before application. `rare_bite_bonus_bps` is capped at `500` basis points and reweights only common through epic ticket selection; it cannot directly select a mythic fish. The server ignores unknown effects. The result payload lists which equipped effects were applied so the UI can explain the reward without recomputing it.

Rarity manipulation cannot safely trust a completed client catch. Therefore, Phase 2 introduces short-lived server-issued cast tickets. A ticket binds the user, fish key, catalog version, applied rarity modifiers, issue time, and one-time nonce. The completed-catch claim consumes the ticket exactly once.

## API Contract

### `start_starfishing_cast`

Authenticated RPC that:

- loads equipped fishing bonuses
- chooses the canonical fish server-side
- creates a short-lived one-time cast ticket
- returns fish-safe presentation information needed for the encounter

It does not expose hidden reward calculations.

Each ticket records `not_before`, expires after ten minutes, and can be consumed once. A user may hold only one active Starfishing ticket. The earliest claim time is derived from the canonical bite delay plus the fish's QTE length. This makes reward claims replay-safe and rate-bounded, while recognizing that a browser game cannot provide perfect cheat-proof attestation of human input.

### `claim_starfishing_catch`

Authenticated RPC input:

- cast ticket identifier
- idempotency key
- duplicate policy: `keep`, `release`, or `convert`
- QTE action count, miss count, and client duration, each clamped to documented integer ranges and retained for telemetry

The RPC never accepts reward amounts, rarity, duplicate status, achievement keys, charm definitions, or balances from the client.

Normalized output:

- catch record
- updated Fishpedia row and completion summary
- Favor delta and authoritative balance
- material deltas and balances
- newly unlocked achievements
- newly granted charms
- applied passive effects
- replay flag for idempotent retries

### Read APIs

Owner-scoped reads provide:

- Fishpedia collection
- recent catches
- currency and material balances
- achievement progress
- owned/equipped charm effects

Public Profile receives only explicitly public display fields: selected achievement title, showcased charms, profile frame, and aggregate Fishpedia completion. Raw reward events and balances are private.

## Client Integration

### Starfishing

- Guests retain the current local preview mode and cannot claim durable rewards.
- Signed-in players request a cast ticket before the Phaser encounter.
- A successful QTE submits one claim and shows a pending state.
- Retry reuses the same idempotency key.
- The result sheet renders only the normalized server response.
- Fishpedia loads from Supabase and can import local preview progress only through a separate, non-rewarding migration path.

### Profile

- Shows server-owned achievement charms and trophies.
- Allows validated equipping and unequipping.
- Shows the selected public title/frame.
- Displays Fishpedia completion without exposing private catch history.

### Quarters

- Reads the same balances, equipped charm effects, trophies, and collection summary.
- Does not maintain a second progression store.

## Error Handling

- Unauthenticated users receive a sign-in-required result and remain in local preview mode.
- Expired, consumed, mismatched, or invalid cast tickets grant nothing.
- Repeated claims return the original normalized result.
- Invalid duplicate policies fail before mutation.
- Transaction failures roll back catches, balances, achievements, and charm grants together.
- Compatibility-mirror failure rolls back the full transaction rather than allowing the ledger and portal Favor display to diverge.
- The client preserves the caught-result screen during retryable network failures.

## Security and RLS

- Enable and force RLS on every user-owned table.
- Grant only required `SELECT` privileges to authenticated users for owner-facing reads.
- Revoke direct `INSERT`, `UPDATE`, and `DELETE` on reward, balance, catch, achievement, and achievement-charm paths.
- Catalog tables expose only active public metadata.
- Privileged functions use an empty `search_path`, schema-qualified names, explicit `auth.uid()` checks, strict input bounds, and explicit execution grants.
- Revoke function execution from `PUBLIC` and `anon`.
- Do not use JWT `user_metadata` for authorization.
- Run security and performance advisors after schema changes.

## Testing

### Database

- first catch versus duplicate catch
- every duplicate policy
- replayed idempotency key
- consumed and expired cast tickets
- ownership and cross-user access attempts
- reward caps with stacked charms
- achievement and charm uniqueness
- complete Fishpedia unlock
- transaction rollback
- Favor ledger and `user_levels` mirror equality

### Client

- guest local-preview fallback
- authenticated loading and pending states
- successful server claim
- retry with stable idempotency key
- non-retryable rejection messaging
- Fishpedia/Profile/Quarters refresh after claim
- equipment RPC and passive-effect explanation

### Release Verification

- migration applies cleanly to staging
- all new tables have RLS and explicit grants
- advisors contain no new unresolved security findings
- signed-in smoke claim mutates exactly one catch, ledger event, and Fishpedia aggregate
- anonymous and cross-user writes fail
- full tests, lint, build, desktop, and mobile game smoke pass

## Delivery Order

1. Schema catalogs, catch tickets, progression tables, indexes, grants, and RLS.
2. Server-authoritative cast and catch RPCs with database tests.
3. Read service and Starfishing integration.
4. Achievement charm grant and validated equipment RPC.
5. Passive bonus application.
6. Profile, Fishpedia, and Quarters integration.
7. Staging migration, advisors, end-to-end verification, and preview deployment.
