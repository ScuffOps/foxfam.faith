# Starfishing Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Starfishing's local preview progression with an authenticated, idempotent, server-authoritative Supabase transaction that persists catches, Fishpedia, Favor, forge materials, achievements, achievement charms, and equipped passive effects.

**Architecture:** PostgreSQL owns canonical fish selection and every progression mutation. React requests a one-time cast ticket, Phaser runs the encounter, and React submits a claim containing only the ticket, duplicate policy, idempotency key, and bounded telemetry. The ledger is authoritative while `user_levels.data.points` remains an atomic compatibility mirror.

**Tech Stack:** PostgreSQL 17, Supabase Auth/RLS/RPC, `@supabase/supabase-js`, React 18, Phaser 3, Zod, Node test runner, ESLint, Vite.

## Global Constraints

- Work only on `vercel/game-hub-quarters-forge`; do not merge or deploy `deploy-login-fixed-c218`.
- Preserve unrelated `.cursor/` and `supabase/.temp/` files.
- Guests remain in local preview mode and never receive durable rewards.
- The browser never supplies reward amounts, rarity, duplicate status, achievement keys, charm definitions, or balances.
- The unique `(user_id, idempotency_key)` claim identity must make retries return the original result without a second mutation.
- The Favor ledger is authoritative; `user_levels.data.points` is updated in the same transaction as a compatibility mirror.
- Enable and force RLS on all user-owned tables.
- Explicitly grant Data API access; do not rely on default table or function grants.
- Privileged functions use `security definer set search_path = ''`, schema-qualified relations, an explicit `auth.uid()` guard, and revoked `PUBLIC`/`anon` execution.
- Passive caps: Favor `2500` bps, materials `2500` bps, rare-bite modifier `500` bps, and size floor `1000` bps.
- One active cast ticket per user; tickets expire after ten minutes and cannot be claimed before their canonical `not_before`.
- No new package dependency is required.

---

### Task 1: Authoritative Progression Schema and Catalogs

**Files:**
- Modify: `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Create: `src/games/starfishing/server/starfishingCatalogContract.js`
- Test: `src/games/starfishing/server/starfishingCatalogContract.test.js`

**Interfaces:**
- Consumes: existing `STARFISHING_FISH` keys and current `user_levels` / `user_relic_charms` tables.
- Produces: `STARFISHING_SERVER_CATALOG_VERSION`, `STARFISHING_ACHIEVEMENT_KEYS`, and database tables used by all later tasks.

- [ ] **Step 1: Write a failing catalog-contract test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  STARFISHING_ACHIEVEMENT_KEYS,
  STARFISHING_SERVER_CATALOG_VERSION,
} from "./starfishingCatalogContract.js";

test("server catalog exposes stable Phase 2 keys", () => {
  assert.equal(STARFISHING_SERVER_CATALOG_VERSION, 1);
  assert.deepEqual(STARFISHING_ACHIEVEMENT_KEYS, [
    "first-light",
    "gentle-return",
    "pocket-constellation",
    "myth-in-moonwater",
    "celestial-archivist",
    "hundred-lights",
  ]);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

```bash
node --test src/games/starfishing/server/starfishingCatalogContract.test.js
```

Expected: FAIL because `starfishingCatalogContract.js` does not exist.

- [ ] **Step 3: Add the stable JavaScript contract**

```js
export const STARFISHING_SERVER_CATALOG_VERSION = 1;

export const STARFISHING_ACHIEVEMENT_KEYS = Object.freeze([
  "first-light",
  "gentle-return",
  "pocket-constellation",
  "myth-in-moonwater",
  "celestial-archivist",
  "hundred-lights",
]);

export const STARFISHING_PASSIVE_CAPS = Object.freeze({
  favorMultiplierBps: 2500,
  materialMultiplierBps: 2500,
  rareBiteBonusBps: 500,
  sizeFloorBps: 1000,
});
```

- [ ] **Step 4: Build schema tables in the generated migration**

Create:

```sql
create table public.game_fish_catalog (
  fish_key text primary key,
  label text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  min_size numeric(8,2) not null check (min_size > 0),
  max_size numeric(8,2) not null check (max_size >= min_size),
  qte_length smallint not null check (qte_length between 1 and 16),
  base_favor integer not null check (base_favor >= 0),
  material_drops jsonb not null default '[]'::jsonb check (jsonb_typeof(material_drops) = 'array'),
  rarity_weight integer not null check (rarity_weight > 0),
  active boolean not null default true,
  catalog_version integer not null default 1 check (catalog_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_cast_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fish_key text not null references public.game_fish_catalog(fish_key),
  catalog_version integer not null,
  authoritative_size numeric(8,2) not null,
  applied_effects jsonb not null default '[]'::jsonb check (jsonb_typeof(applied_effects) = 'array'),
  not_before timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  claim_id uuid,
  created_at timestamptz not null default now(),
  check (expires_at > not_before)
);

create unique index game_cast_tickets_one_active_per_user
on public.game_cast_tickets (user_id)
where consumed_at is null;

create table public.game_catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null default 'starfishing' check (game_key = 'starfishing'),
  fish_key text not null references public.game_fish_catalog(fish_key),
  size numeric(8,2) not null check (size > 0),
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'mythic')),
  duplicate boolean not null,
  duplicate_policy text not null check (duplicate_policy in ('none', 'keep', 'release', 'convert')),
  play_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(play_evidence) = 'object'),
  idempotency_key uuid not null,
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.user_fishpedia (
  user_id uuid not null references auth.users(id) on delete cascade,
  fish_key text not null references public.game_fish_catalog(fish_key),
  caught_count integer not null default 0 check (caught_count >= 0),
  smallest_size numeric(8,2) not null check (smallest_size > 0),
  largest_size numeric(8,2) not null check (largest_size >= smallest_size),
  first_caught_at timestamptz not null,
  last_caught_at timestamptz not null,
  primary key (user_id, fish_key)
);

create table public.currency_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_key text not null check (currency_key ~ '^[a-z0-9-]+$'),
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, currency_key)
);

create table public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_key text not null check (currency_key ~ '^[a-z0-9-]+$'),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  source_type text not null,
  source_id uuid not null,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, currency_key, idempotency_key)
);

create table public.user_material_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, material_key)
);

create table public.material_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_key text not null check (material_key ~ '^[a-z0-9-]+$'),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  source_type text not null,
  source_id uuid not null,
  idempotency_key uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, material_key, idempotency_key)
);

create table public.achievement_catalog (
  achievement_key text primary key,
  title text not null,
  description text not null,
  condition jsonb not null check (jsonb_typeof(condition) = 'object'),
  reward jsonb not null default '{}'::jsonb check (jsonb_typeof(reward) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.achievement_catalog(achievement_key),
  source_catch_id uuid references public.game_catches(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create table public.user_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trophy_key text not null check (trophy_key ~ '^[a-z0-9-]+$'),
  source_achievement_key text references public.achievement_catalog(achievement_key),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  acquired_at timestamptz not null default now(),
  unique (user_id, trophy_key)
);
```

Use typed columns for ownership, balances, keys, amounts, and timestamps. Use `jsonb` only for bounded metadata, effect definitions, and the immutable normalized result snapshot.

- [ ] **Step 5: Seed canonical fish and achievement definitions**

Seed the six existing fish with catalog version `1`, their current size ranges, QTE lengths, base Favor, and Star Glass drops. Seed the six achievements and their exact conditions from the design specification. Use an explicit `on conflict (fish_key) do update` for fish and `on conflict (achievement_key) do update` for achievements so staging resets remain deterministic.

- [ ] **Step 6: Add explicit grants and RLS**

Apply policies with an explicit relation list:

```sql
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'game_catches',
    'user_fishpedia',
    'currency_accounts',
    'currency_ledger',
    'user_material_balances',
    'material_ledger',
    'user_achievements',
    'user_trophies'
  ]
  loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('alter table public.%I force row level security', relation_name);
    execute format('revoke all on table public.%I from anon, authenticated', relation_name);
    execute format('grant select on table public.%I to authenticated', relation_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      'Users read own ' || relation_name,
      relation_name
    );
  end loop;
end
$$;

alter table public.game_cast_tickets enable row level security;
alter table public.game_cast_tickets force row level security;
revoke all on table public.game_cast_tickets from anon, authenticated;

alter table public.game_fish_catalog enable row level security;
alter table public.game_fish_catalog force row level security;
revoke all on table public.game_fish_catalog from anon, authenticated;
grant select on table public.game_fish_catalog to authenticated;
create policy "Authenticated read active fish catalog"
on public.game_fish_catalog for select
to authenticated
using (active);

alter table public.achievement_catalog enable row level security;
alter table public.achievement_catalog force row level security;
revoke all on table public.achievement_catalog from anon, authenticated;
grant select on table public.achievement_catalog to authenticated;
create policy "Authenticated read active achievement catalog"
on public.achievement_catalog for select
to authenticated
using (active);
```

Catalog tables receive `SELECT` only for active rows. Cast tickets expose no direct reads or writes to browser roles.

- [ ] **Step 7: Run focused tests**

Run:

```bash
node --test src/games/starfishing/server/starfishingCatalogContract.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260718200316_starfishing_phase_2_progression.sql src/games/starfishing/server
git commit -m "feat(starfishing): add authoritative progression schema"
```

---

### Task 2: Cast Ticket and Reward Transaction RPCs

**Files:**
- Modify: `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Create: `src/games/starfishing/server/starfishingRpcContract.js`
- Test: `src/games/starfishing/server/starfishingRpcContract.test.js`

**Interfaces:**
- Consumes: Task 1 catalogs and progression tables.
- Produces: `start_starfishing_cast()` and `claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)` RPCs plus response guards.

- [ ] **Step 1: Write failing response-contract tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCastTicket,
  normalizeCatchClaimResult,
} from "./starfishingRpcContract.js";

test("normalizes a cast ticket without accepting client reward fields", () => {
  assert.deepEqual(normalizeCastTicket({
    ticket_id: "11111111-1111-4111-8111-111111111111",
    fish_key: "ember-mote",
    qte_length: 1,
    expires_at: "2026-07-18T20:10:00.000Z",
  }), {
    ticketId: "11111111-1111-4111-8111-111111111111",
    fishKey: "ember-mote",
    qteLength: 1,
    expiresAt: "2026-07-18T20:10:00.000Z",
  });
});

test("rejects a claim response without an authoritative balance", () => {
  assert.throws(() => normalizeCatchClaimResult({
    catch: {},
    favor: { delta: 3 },
  }), /authoritative Favor balance/i);
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run:

```bash
node --test src/games/starfishing/server/starfishingRpcContract.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement response normalizers**

Implement pure validators that return camelCase UI objects and reject absent ticket IDs, unknown fish keys, negative balances, malformed achievement arrays, and unknown passive effect keys. Do not silently default required server fields.

- [ ] **Step 4: Implement `start_starfishing_cast`**

The function must:

```sql
if (select auth.uid()) is null then
  raise exception using errcode = '42501', message = 'Authentication required';
end if;
```

Then:

1. Lock or expire the caller's active ticket.
2. Read only equipped, owned charm rows.
3. Parse allow-listed passive effect keys and clamp totals.
4. Select a fish from canonical weights using PostgreSQL randomness.
5. Prevent `rare_bite_bonus_bps` from directly increasing mythic weight.
6. Compute authoritative size and `not_before`.
7. Insert one ten-minute ticket.
8. Return only ticket ID, fish presentation key, QTE length, applied-effect labels, `not_before`, and expiry.

- [ ] **Step 5: Implement `claim_starfishing_catch`**

Use a single transaction and row locks. Required input validation:

```sql
if claim_duplicate_policy not in ('keep', 'release', 'convert') then
  raise exception using errcode = '22023', message = 'Invalid duplicate policy';
end if;
if claim_qte_action_count < 0 or claim_qte_action_count > 16 then
  raise exception using errcode = '22023', message = 'Invalid QTE action count';
end if;
if claim_miss_count < 0 or claim_miss_count > 16 then
  raise exception using errcode = '22023', message = 'Invalid QTE miss count';
end if;
if claim_duration_ms < 0 or claim_duration_ms > 600000 then
  raise exception using errcode = '22023', message = 'Invalid claim duration';
end if;
```

Required flow:

1. Return the stored result snapshot when `(auth.uid(), idempotency_key)` already exists.
2. Lock the matching unconsumed ticket and reject owner mismatch, expiry, or an early claim.
3. Determine duplicate status from `user_fishpedia`, not from input.
4. Use `none` for a first catch; apply `keep`, `release`, or `convert` only to duplicates.
5. Calculate base rewards from catalog data and apply capped equipped effects.
6. Insert catch, update Fishpedia, credit ledgers, and update balances.
7. Create missing achievements, achievement charms, and trophy rows using unique constraints.
8. Find or create the caller's `user_levels` row and set `data.points` to the authoritative Favor balance.
9. Mark the ticket consumed and store the complete normalized result snapshot.
10. Return the snapshot.

- [ ] **Step 6: Lock down function execution**

```sql
revoke execute on function public.start_starfishing_cast() from public, anon;
grant execute on function public.start_starfishing_cast() to authenticated;

revoke execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
from public, anon;
grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
to authenticated;
```

Every privileged function declaration must include:

```sql
language plpgsql
security definer
set search_path = ''
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
node --test src/games/starfishing/server/starfishingRpcContract.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260718200316_starfishing_phase_2_progression.sql src/games/starfishing/server
git commit -m "feat(starfishing): add cast and claim RPCs"
```

---

### Task 3: Database Integration and RLS Test Harness

**Files:**
- Create: `scripts/starfishing-phase2-smoke.mjs`
- Modify: `package.json`
- Modify: `scripts/rls-smoke.mjs`

**Interfaces:**
- Consumes: Task 2 RPCs and environment variables `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, and test-user credentials.
- Produces: repeatable `npm run test:starfishing:phase2` verification.

- [ ] **Step 1: Add the failing package script**

```json
"test:starfishing:phase2": "node scripts/starfishing-phase2-smoke.mjs"
```

- [ ] **Step 2: Create the smoke harness**

The harness must create two authenticated clients from environment-provided test accounts and assert:

```js
assert.equal(firstClaim.replayed, false);
assert.equal(repeatedClaim.replayed, true);
assert.equal(repeatedClaim.catch.id, firstClaim.catch.id);
assert.equal(repeatedClaim.favor.balance, firstClaim.favor.balance);
assert.equal(crossUserCatchRead.data.length, 0);
assert.match(String(crossUserWrite.error?.message), /permission denied|row-level security/i);
```

It must also query:

- exactly one catch for the claim ID
- exactly one Favor ledger event for the idempotency key
- the matching Fishpedia count
- equality between the Favor account balance and `user_levels.data.points`

- [ ] **Step 3: Run before applying the migration**

Run:

```bash
npm run test:starfishing:phase2
```

Expected: FAIL with missing RPC/table errors.

- [ ] **Step 4: Apply the migration to a disposable local or staging database**

Use the Supabase CLI command discovered with `--help`. Do not apply to production. Prefer local Supabase when available; otherwise use the Foxfam staging project explicitly and record the project ID in the command output, not in source.

- [ ] **Step 5: Run database smoke and RLS tests**

```bash
npm run test:starfishing:phase2
npm run test:rls
```

Expected: both PASS, including anonymous rejection and cross-user isolation.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/starfishing-phase2-smoke.mjs scripts/rls-smoke.mjs
git commit -m "test(starfishing): cover reward RPC and RLS"
```

---

### Task 4: Narrow Supabase Reward Client

**Files:**
- Create: `src/games/starfishing/api/starfishingProgressionClient.js`
- Test: `src/games/starfishing/api/starfishingProgressionClient.test.js`
- Modify: `src/api/communityClient.js`

**Interfaces:**
- Consumes: `supabase`, `normalizeCastTicket`, and `normalizeCatchClaimResult`.
- Produces:
  - `startStarfishingCast(): Promise<CastTicket>`
  - `claimStarfishingCatch(input): Promise<CatchClaimResult>`
  - `loadStarfishingProgression(): Promise<StarfishingProgression>`

- [ ] **Step 1: Write failing adapter tests with an injected RPC client**

```js
test("claim sends no reward amount or rarity", async () => {
  const calls = [];
  const client = createStarfishingProgressionClient({
    rpc: async (name, params) => {
      calls.push({ name, params });
      return { data: validClaimResult, error: null };
    },
  });
  await client.claimCatch({
    ticketId,
    idempotencyKey,
    duplicatePolicy: "release",
    telemetry: { actionCount: 2, missCount: 0, durationMs: 3200 },
  });
  assert.deepEqual(Object.keys(calls[0].params).sort(), [
    "claim_duplicate_policy",
    "claim_duration_ms",
    "claim_idempotency_key",
    "claim_miss_count",
    "claim_qte_action_count",
    "claim_ticket_id",
  ]);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test src/games/starfishing/api/starfishingProgressionClient.test.js
```

- [ ] **Step 3: Implement the injected adapter and production singleton**

Use `supabase.rpc()` for mutations and owner-scoped reads from `user_fishpedia`, `game_catches`, `currency_accounts`, `user_material_balances`, `user_achievements`, and `user_trophies`. Convert Supabase errors into stable errors with `code`, `retryable`, and a user-safe message.

- [ ] **Step 4: Expose only the raw Supabase client needed by the adapter**

Do not add the new tables to generic `communityClient.entities`; that abstraction permits client-created rows. Import the existing exported `supabase` client directly into the narrow progression adapter.

- [ ] **Step 5: Run focused tests and lint**

```bash
node --test src/games/starfishing/api/starfishingProgressionClient.test.js
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/games/starfishing/api src/api/communityClient.js
git commit -m "feat(starfishing): add authoritative progression client"
```

---

### Task 5: Signed-In Starfishing Claim Flow

**Files:**
- Modify: `src/pages/Starfishing.jsx`
- Modify: `src/games/starfishing/simulation/starfishingRules.js`
- Test: `src/games/starfishing/simulation/starfishingRules.test.js`
- Modify: `src/games/starfishing/ui/StarfishingHud.jsx`
- Modify: `src/games/starfishing/ui/FishpediaPanel.jsx`
- Modify: `src/games/starfishing/ui/starfishing.css`

**Interfaces:**
- Consumes: Task 4 client methods.
- Produces: authenticated cast/claim state machine with guest fallback.

- [ ] **Step 1: Add failing state-machine tests**

Add tests for:

```js
assert.equal(beginServerCast(state).phase, "requesting-cast");
assert.equal(receiveServerTicket(state, ticket).activeFish.key, ticket.fishKey);
assert.equal(beginServerClaim(caughtState).phase, "claiming");
assert.equal(receiveServerClaim(claimingState, result).lastClaim.favor.balance, 12);
assert.equal(failServerClaim(claimingState, retryableError).phase, "claim-error");
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test src/games/starfishing/simulation/starfishingRules.test.js
```

- [ ] **Step 3: Extend the pure state machine**

Add explicit phases:

```js
requestingCast: "requesting-cast",
claiming: "claiming",
claimError: "claim-error",
```

Keep local guest functions unchanged. Server ticket receipt replaces local fish selection only for signed-in mode.

- [ ] **Step 4: Integrate authentication and progression loading**

On mount:

1. Call `communityClient.auth.me()`.
2. If authenticated, load server Fishpedia and balances.
3. If unauthenticated, retain existing localStorage state and “Local preview” copy.
4. Never merge local preview rewards into server balances.

- [ ] **Step 5: Wire cast and claim**

- Cast requests `startStarfishingCast`.
- Successful QTE opens the duplicate-choice result sheet.
- Claim creates one UUID and retains it across retries.
- Result UI updates from `CatchClaimResult`.
- Network failure preserves the caught fish and offers Retry or Return without reward.

- [ ] **Step 6: Update Fishpedia and HUD**

Render server aggregate rows for authenticated users. Display authoritative Favor/material deltas and applied charm effects. Use `aria-live="polite"` for pending and success messages.

- [ ] **Step 7: Run focused tests, lint, and build**

```bash
node --test src/games/starfishing/simulation/starfishingRules.test.js src/games/starfishing/api/starfishingProgressionClient.test.js
npm run lint
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/Starfishing.jsx src/games/starfishing
git commit -m "feat(starfishing): persist signed-in catches"
```

---

### Task 6: Validated Achievement Charm Equipment

**Files:**
- Modify: `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Modify: `src/lib/relicService.js`
- Create: `src/lib/relicService.test.js`
- Modify: `src/lib/relicCharms.js`

**Interfaces:**
- Consumes: achievement charm rows granted by Task 2.
- Produces: `set_equipped_relic_charm(uuid, boolean)` RPC and `setEquippedCharm` using that RPC.

- [ ] **Step 1: Write failing equipment tests**

```js
test("equipment delegates one owned charm mutation to the RPC", async () => {
  const calls = [];
  const service = createRelicEquipmentService({
    rpc: async (name, params) => {
      calls.push({ name, params });
      return { data: [{ id: charmId, equipped: true }], error: null };
    },
  });
  await service.setEquipped(charmId, true);
  assert.deepEqual(calls[0], {
    name: "set_equipped_relic_charm",
    params: { target_charm_id: charmId, should_equip: true },
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test src/lib/relicService.test.js
```

- [ ] **Step 3: Add the equipment RPC**

The RPC must:

1. Authenticate with `auth.uid()`.
2. Lock the target owned charm.
3. Read its slot.
4. If equipping, set every other owned charm in that slot to `equipped = false`.
5. Update the target charm.
6. Return normalized owned charm rows.

Revoke function execution from `PUBLIC`/`anon` and grant only `authenticated`. Preserve the existing gated random-roll path, but replace the direct charm policies so browser CRUD rejects rows where `data ->> 'source' = 'starfishing_achievement'`. The privileged claim and equipment RPCs remain the only writers for achievement-sourced charm rows.

- [ ] **Step 4: Replace multi-request client equipment writes**

Change `setEquippedCharm` to one RPC call. Preserve its existing returned array contract so Profile does not require a broad rewrite.

- [ ] **Step 5: Add achievement charm definitions**

Add Starlit Bobber, Merciful Tide, Pocket Star, Glassfin Comet, Fishpedia Frame, and Century Chain to the catalog normalizer. Achievement instances retain their server-provided effect metadata rather than being overwritten by random-roll defaults.

- [ ] **Step 6: Run tests**

```bash
node --test src/lib/relicService.test.js src/games/starfishing/server/starfishingRpcContract.test.js
npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260718200316_starfishing_phase_2_progression.sql src/lib/relicService.js src/lib/relicService.test.js src/lib/relicCharms.js
git commit -m "feat(relics): validate achievement charm equipment"
```

---

### Task 7: Profile and Quarters Read Integration

**Files:**
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/QuartersHub.jsx`
- Create: `src/components/relics/StarfishingProgressCard.jsx`
- Create: `src/components/relics/StarfishingProgressCard.test.js`
- Modify: `src/components/relics/ProfileCharmShelf.jsx`

**Interfaces:**
- Consumes: `loadStarfishingProgression()` and existing `loadUserRelicInventory()`.
- Produces: one reusable progression summary for Profile and Quarters.

- [ ] **Step 1: Write failing summary-model tests**

```js
test("summarizes Fishpedia completion and equipped bonuses", () => {
  assert.deepEqual(buildStarfishingProgressSummary({
    fishpedia: [{ caught: true }, { caught: false }],
    achievements: [{ achievementKey: "first-light" }],
    equippedEffects: [{ key: "favor_multiplier_bps", value: 500 }],
  }), {
    discovered: 1,
    total: 2,
    completionPercent: 50,
    achievementCount: 1,
    bonusLabels: ["+5% catch Favor"],
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test src/components/relics/StarfishingProgressCard.test.js
```

- [ ] **Step 3: Implement the reusable card**

Render:

- Fishpedia discovered/total
- recent achievement titles
- equipped fishing-only bonuses
- selected frame/trophy
- signed-out empty state

Use semantic progress markup and do not expose private ledger events.

- [ ] **Step 4: Integrate Profile**

Load progression beside the existing relic inventory. Keep public-profile mode limited to completion percentage and selected showcase fields; only the owner sees balances and detailed achievement progress.

- [ ] **Step 5: Integrate Quarters**

Load the same summary in `QuartersHub`. Show active fishing bonuses at the Trophy Shelf/Collections station and refresh after navigation back from Starfishing.

- [ ] **Step 6: Run focused and full tests**

```bash
node --test src/components/relics/StarfishingProgressCard.test.js src/lib/relicService.test.js
node --test src/**/*.test.js
npm run lint
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Profile.jsx src/pages/QuartersHub.jsx src/components/relics
git commit -m "feat(profile): show Starfishing progression"
```

---

### Task 8: Staging Migration, Security Review, and End-to-End Verification

**Files:**
- Modify if fixes are required: `supabase/migrations/20260718200316_starfishing_phase_2_progression.sql`
- Modify if fixes are required: `scripts/starfishing-phase2-smoke.mjs`
- Create: `docs/verification/2026-07-18-starfishing-phase-2.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified staging migration and deploy-ready branch evidence.

- [ ] **Step 1: Run the complete local suite**

```bash
node --test src/**/*.test.js
npm run test:starfishing:phase2
npm run test:rls
npm run lint
npm run build
git diff --check
```

Expected: all PASS.

- [ ] **Step 2: Inspect migration state**

Discover current commands:

```bash
node_modules/.bin/supabase migration list --help
node_modules/.bin/supabase db push --help
```

Confirm the target is the Foxfam staging project before applying. Do not target production.

- [ ] **Step 3: Apply to staging and run advisors**

Apply the migration using the discovered CLI syntax or Supabase MCP migration tool. Then run both:

- Supabase security advisors
- Supabase performance advisors

Resolve every new finding caused by Phase 2 before continuing. Link remediation URLs in the verification document.

- [ ] **Step 4: Run authenticated browser smoke**

Verify:

1. Guest cast still works and remains local-only.
2. Signed-in cast receives one ticket.
3. Successful claim creates exactly one catch and ledger event.
4. Retried claim does not increase Favor.
5. Fishpedia refreshes.
6. Achievement charm appears in Profile and can be equipped.
7. Quarters shows the equipped passive.
8. Desktop and `390x844` layouts have no horizontal overflow.
9. Browser console has no errors.

- [ ] **Step 5: Record concrete evidence**

Write:

```markdown
# Starfishing Phase 2 Verification

- Branch:
- Commit:
- Supabase project:
- Migration:
- Test totals:
- RLS checks:
- Advisor findings:
- Desktop route:
- Mobile viewport:
- Production branch untouched:
```

Replace every field with observed evidence; do not leave blank labels.

- [ ] **Step 6: Commit final verification fixes and evidence**

```bash
git add supabase/migrations/20260718200316_starfishing_phase_2_progression.sql scripts/starfishing-phase2-smoke.mjs docs/verification/2026-07-18-starfishing-phase-2.md
git commit -m "test(starfishing): verify Phase 2 progression"
```

- [ ] **Step 7: Push staging only**

```bash
git push origin vercel/game-hub-quarters-forge
```

Confirm the remote branch commit. Do not promote or alias the deployment to production.

---

## Self-Review

- **Spec coverage:** Tasks cover authoritative catalogs, cast tickets, catches, Fishpedia, Favor/material ledgers, compatibility mirroring, achievements, charms, passive bonuses, Profile, Quarters, RLS, advisors, and staged verification.
- **Isolation:** Database authority lands before client integration. Starfishing-specific work does not prematurely generalize every minigame.
- **Type consistency:** RPC names and parameter names are stable across Tasks 2–6. The client consumes only normalized result contracts.
- **Security boundary:** Direct reward mutations are never added to generic CRUD entities. All privileged operations check `auth.uid()`, clamp input, schema-qualify relations, and use explicit execution grants.
- **Production safety:** Every database and deployment step explicitly targets staging; `deploy-login-fixed-c218` remains untouched.
