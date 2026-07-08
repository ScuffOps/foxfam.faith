# Quarters / Forge Game Hub Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Foxfam Quarters / Forge Hub as the home base for the full minigame economy, then add each minigame lane in the approved order.

**Architecture:** React owns portal routes, DOM HUDs, menus, inventory, Quarters, Forge, and reward confirmation. Phaser owns action-heavy 2D playfields only after the hub foundation lands. Game rules, reward previews, achievement unlocks, and saveable state live in shared simulation modules outside Phaser scenes.

**Tech Stack:** Vite, React, React Router, Tailwind, shadcn/Radix UI, Supabase entity wrapper, Zod, Phaser for 2D game playfields once installed.

## Global Constraints

- Work only in `/Users/scuffox/Documents/Codex/FoxfamPortal/foxfam.faith`.
- Confirm branch `deploy-login-fixed-c218` before edits.
- Do not edit the stale workspace copy.
- Do not bypass the existing relic/charm roll gate.
- Phase 1 may use local/mock game persistence.
- Phase 2 real Favor, forge materials, charms, trophies, and duplicate conversion must be server-authoritative through Supabase RPCs or equivalent narrow APIs.
- Use Phaser as the default 2D engine. Construct 3 remains optional only if a real MCP/workflow becomes available.
- Preserve portal Favor wording. Faith remains MIU-side; portal rewards use Favor.
- Keep relic/charm icon art symbolic: no cute faces, no white sticker halo edges.
- This is the master program plan. Before executing each task group, write or expand the detailed lane plan for that group with exact code steps. The first detailed lane plan should be Quarters / Forge Hub foundation.

---

## File Structure

### Phase 1 Hub Files

- Create `src/pages/QuartersHub.jsx`: Quarters page composition and data loading.
- Create `src/components/quarters/QuartersScene.jsx`: visual room/courtyard scene with accessible hotspots.
- Create `src/components/quarters/HubDock.jsx`: compact action dock for core destinations.
- Create `src/components/quarters/HubDoorCard.jsx`: reusable destination card for open/locked game doors.
- Create `src/components/quarters/RelicStatusPanel.jsx`: Favor/relic/charm status.
- Create `src/lib/gameHubCatalog.js`: game order, material families, charm/trophy definitions, route metadata.
- Modify `src/App.jsx`: add `/quarters` route.
- Modify `src/components/Sidebar.jsx`: add Quarters to The Shrine nav group.
- Add focused tests for catalog shape and reward math when the repo's available test runner supports them. Until a test runner is wired, use lint/build as the required verification gate.

### Phase 1 Shared Game Files

- Create `src/lib/gameRewards.js`: local reward intent, cap, duplicate conversion, and preview helpers.
- Create `src/lib/gameRewards.test.js`: unit tests for reward intent and duplicate conversion.
- Create `src/games/shared/rewards/gameRewardSchemas.js`: Zod schemas for reward intents.
- Create `src/games/shared/simulation/sessionScoring.js`: shared score/rank bands.

### Phaser Foundation Files

- Modify `package.json`: add `phaser` only when Task 4 begins.
- Create `src/games/shared/ui/GameShell.jsx`: shared game route wrapper.
- Create `src/games/shared/ui/GameCanvasHost.jsx`: lifecycle-safe Phaser mount host.
- Create `src/games/shared/phaser/createGameInstance.js`: Phaser instance factory.
- Create `src/games/shared/phaser/sceneBridge.js`: event bridge between Phaser and React.
- Create `src/games/shared/input/actions.js`: shared action names.
- Create `src/games/shared/input/bindings.js`: keyboard/touch bindings.

### Per-Game Files

- Starfishing: `src/pages/Starfishing.jsx`, `src/games/starfishing/*`.
- Match & Merge: `src/pages/MatchMerge.jsx`, `src/games/match-merge/*`.
- Boba Cafe: `src/pages/BobaCafe.jsx`, `src/games/boba-cafe/*`.
- Puzzle Game: `src/pages/PuzzleCat.jsx`, `src/games/puzzle-cat/*`.
- Time Side-Scroller: `src/pages/TimeRunner.jsx`, `src/games/time-runner/*`.
- Community Wordle: `src/pages/CommunityWordle.jsx`, `src/games/community-wordle/*`.

---

## Task 1: Hub Catalog And Routes

**Files:**
- Create: `src/lib/gameHubCatalog.js`
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`

**Interfaces:**
- Produces: `GAME_WORLD_ORDER`, `FORGE_MATERIALS`, `HUB_UNLOCK_STATES`, `getGameWorldByKey(key)`
- Consumes: React Router and Sidebar nav configuration.

- [ ] **Step 1: Confirm workspace**

Run:

```bash
git status --short --branch
```

Expected: branch line contains `deploy-login-fixed-c218`.

- [ ] **Step 2: Add catalog smoke assertions**

Create `src/lib/gameHubCatalog.test.js` with assertions that the game order is exactly:

```js
[
  "quarters",
  "starfishing",
  "match-merge",
  "boba-cafe",
  "puzzle-cat",
  "time-runner",
  "community-wordle",
]
```

- [ ] **Step 3: Create `src/lib/gameHubCatalog.js`**

The catalog should include each world key, label, route, material rewards, charm/trophy examples, locked/open status, and one-sentence lore hook. Keep values static in Phase 1.

- [ ] **Step 4: Add route**

Import `QuartersHub` in `src/App.jsx` and add:

```jsx
<Route path="/quarters" element={<QuartersHub />} />
```

- [ ] **Step 5: Add sidebar entry**

Add Quarters to `The Shrine` group above Prayer Wall. Use a cozy icon already imported or add `House`, `Home`, or `Sparkles` from `lucide-react`.

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass.

---

## Task 2: Quarters Hub Shell

**Files:**
- Create: `src/pages/QuartersHub.jsx`
- Create: `src/components/quarters/QuartersScene.jsx`
- Create: `src/components/quarters/HubDock.jsx`
- Create: `src/components/quarters/HubDoorCard.jsx`
- Create: `src/components/quarters/RelicStatusPanel.jsx`

**Interfaces:**
- Consumes: `GAME_WORLD_ORDER`, `getGameWorldByKey`, `loadUserRelicInventory`, `loadRelicRollGate`, `communityClient.entities.UserLevel`
- Produces: route-visible Quarters page with accessible hub navigation.

- [ ] **Step 1: Build the page shell**

`QuartersHub.jsx` should load the current user, UserLevel, relic inventory, and relic gate. Handle loading, auth errors, and local preview failures with friendly copy.

- [ ] **Step 2: Build `QuartersScene`**

Use layered DOM/CSS and existing portal assets where helpful. Include accessible hotspots for Forge, Profile Relic, Fishpedia shelf, Starfishing gate, Match & Merge bench, Boba Cafe, Puzzle Cloister, Clocktower, and Wordle Chapel.

- [ ] **Step 3: Build `HubDock`**

Use icon+text buttons for major actions. Every scene hotspot needs an equivalent text control for mobile and keyboard users.

- [ ] **Step 4: Build `HubDoorCard`**

Support `open`, `locked`, and `coming-soon` states. Locked states should explain why, not vanish.

- [ ] **Step 5: Build `RelicStatusPanel`**

Show current Favor, relic name, equipped charm count, forge gate state, and links to `/profile`, `/relic-forge`, and `/reliquary`.

- [ ] **Step 6: Verify responsive layout**

Use the dev server and inspect desktop plus mobile widths. Confirm no text overlaps, buttons remain tappable, and scene hotspots are reachable by keyboard.

---

## Task 3: Shared Reward Intent And Local Economy Preview

**Files:**
- Create: `src/lib/gameRewards.js`
- Create: `src/lib/gameRewards.test.js`
- Create: `src/games/shared/rewards/gameRewardSchemas.js`
- Create: `src/games/shared/simulation/sessionScoring.js`

**Interfaces:**
- Produces: `buildRewardIntent`, `previewRewardIntent`, `convertDuplicateCatch`, `applyLocalRewardCap`, `getSessionRank`
- Consumes: static game catalog, local game results, future RPC client.

- [ ] **Step 1: Write tests for duplicate conversion**

Cover keep, release to Favor, convert to forge dust, and invalid duplicate policy.

- [ ] **Step 2: Write reward intent schema**

Use Zod to validate `gameKey`, `eventId`, `eventType`, `score`, `durationMs`, `items`, `favorPreview`, `achievementKeys`, and `createdAt`.

- [ ] **Step 3: Implement local preview helpers**

Helpers must calculate preview values only. They must not update `UserLevel`, `UserRelicCharm`, or Supabase.

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Run the targeted test command if a test runner is added to `package.json`. If no test runner is available yet, record that limitation and rely on `npm run lint` plus `npm run build` for this task's verification.

---

## Task 4: Phaser Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/games/shared/ui/GameShell.jsx`
- Create: `src/games/shared/ui/GameCanvasHost.jsx`
- Create: `src/games/shared/phaser/createGameInstance.js`
- Create: `src/games/shared/phaser/sceneBridge.js`
- Create: `src/games/shared/input/actions.js`
- Create: `src/games/shared/input/bindings.js`

**Interfaces:**
- Produces: lifecycle-safe React/Phaser mount boundary.
- Consumes: future per-game scenes and shared input actions.

- [ ] **Step 1: Install Phaser**

Run:

```bash
npm install phaser
```

- [ ] **Step 2: Create lifecycle host**

`GameCanvasHost` should create a Phaser instance on mount, destroy it on unmount, and never let Phaser own React UI state.

- [ ] **Step 3: Create scene bridge**

Bridge emits gameplay events to React and accepts action input from React/mobile controls.

- [ ] **Step 4: Verify clean mount/unmount**

Create a tiny temporary smoke scene only if needed, then remove or convert it into Starfishing's first scene.

---

## Task 5: Starfishing MVP

**Files:**
- Create: `src/pages/Starfishing.jsx`
- Create: `src/games/starfishing/content/fishCatalog.js`
- Create: `src/games/starfishing/simulation/starfishingState.js`
- Create: `src/games/starfishing/simulation/starfishingRules.js`
- Create: `src/games/starfishing/phaser/StarfishingScene.js`
- Create: `src/games/starfishing/ui/StarfishingHud.jsx`
- Create: `src/games/starfishing/ui/FishpediaPanel.jsx`
- Modify: `src/App.jsx`
- Modify: `src/lib/gameHubCatalog.js`

**Interfaces:**
- Produces: `/starfishing`, catch loop, QTE reeling, fishpedia, duplicate choice, local reward intent.
- Consumes: Phaser foundation and reward helpers.

- [ ] **Step 1: Build fish catalog**

Include rarity, size range, constellation theme, QTE difficulty, Favor preview, material drops, silhouette state, and achievement hooks.

- [ ] **Step 2: Implement simulation rules**

Rules cover cast, bite, QTE prompt queue, success/failure timing, tension, catch resolution, duplicate detection, and session summary.

- [ ] **Step 3: Implement Phaser scene**

Scene renders pond/sky, line, bobber, catch motion, spark particles, and input prompts. It does not calculate final rewards.

- [ ] **Step 4: Implement React HUD**

HUD shows Favor preview, QTE prompts, tension, catch modal, duplicate keep/release/convert choices, and Fishpedia.

- [ ] **Step 5: Verify desktop/mobile**

Check keyboard and touch controls, timing readability, catch modal layout, and fishpedia silhouettes.

---

## Task 6: Match & Merge MVP

**Files:**
- Create: `src/pages/MatchMerge.jsx`
- Create: `src/games/match-merge/content/materialCatalog.js`
- Create: `src/games/match-merge/simulation/mergeBoard.js`
- Create: `src/games/match-merge/ui/MatchMergeBoard.jsx`

**Interfaces:**
- Produces: material-focused puzzle loop and reward intent.

- [ ] **Step 1: Build material catalog**

Include Moonwax, Sigil Shards, Star Glass, Charm Cord, and rarity tiers.

- [ ] **Step 2: Build pure board rules**

Support match three, merge upgrades, combo count, move limit, and reward rank.

- [ ] **Step 3: Build UI board**

Use DOM grid first unless canvas becomes necessary. Make tap/click and keyboard selection work.

---

## Task 7: Boba Cafe MVP

**Files:**
- Create: `src/pages/BobaCafe.jsx`
- Create: `src/games/boba-cafe/content/orderCatalog.js`
- Create: `src/games/boba-cafe/simulation/bobaService.js`
- Create: `src/games/boba-cafe/ui/BobaCafeCounter.jsx`

**Interfaces:**
- Produces: cozy order-service loop and reward intent.

- [ ] **Step 1: Build order catalog**

Include drink base, topping, syrup, patience, accuracy scoring, and material reward.

- [ ] **Step 2: Build service rules**

Support queue, assembly, timing, customer satisfaction, streaks, and session close.

- [ ] **Step 3: Build cafe UI**

Use accessible buttons for ingredient assembly. Keep controls large for mobile.

---

## Task 8: Find Vezmir Puzzle MVP

**Files:**
- Create: `src/pages/PuzzleCat.jsx`
- Create: `src/games/puzzle-cat/content/puzzleScenes.js`
- Create: `src/games/puzzle-cat/simulation/hiddenObjectRules.js`
- Create: `src/games/puzzle-cat/ui/PuzzleScene.jsx`

**Interfaces:**
- Produces: hidden-object/logic puzzle loop and reward intent.

- [ ] **Step 1: Build scene catalog**

Include object list, clue copy, hint costs, reward hooks, and completion star thresholds.

- [ ] **Step 2: Build scene UI**

Support zoom/pan, tap targets, keyboard list navigation, hints, and completion modal.

---

## Task 9: Time Side-Scroller MVP

**Files:**
- Create: `src/pages/TimeRunner.jsx`
- Create: `src/games/time-runner/content/levelCatalog.js`
- Create: `src/games/time-runner/simulation/timeRunnerState.js`
- Create: `src/games/time-runner/phaser/TimeRunnerScene.js`
- Create: `src/games/time-runner/ui/TimeRunnerHud.jsx`

**Interfaces:**
- Produces: clocktower platforming loop and reward intent.

- [ ] **Step 1: Add level data**

Include clock hands, roman numeral platforms, pendulums, clock face shards, checkpoints, and target times.

- [ ] **Step 2: Build simulation and Phaser scene**

Keep collision/gameplay rules isolated from final reward grants.

---

## Task 10: Community Wordle MVP

**Files:**
- Create: `src/pages/CommunityWordle.jsx`
- Create: `src/games/community-wordle/content/wordleCatalog.js`
- Create: `src/games/community-wordle/simulation/wordleRules.js`
- Create: `src/games/community-wordle/ui/WordleBoard.jsx`

**Interfaces:**
- Produces: portal daily word puzzle and future Twitch-extension-safe contract.

- [ ] **Step 1: Build local daily puzzle**

Use deterministic local seed for Phase 1. Do not leak future server answer plans into public client code for Phase 2.

- [ ] **Step 2: Build board UI**

Support keyboard, touch keyboard, color feedback, streak preview, and spoiler-safe share text.

- [ ] **Step 3: Phase 2 follow-up**

Move answer validation and aggregate sharing server-side before Twitch extension integration.

---

## Task 11: Phase 2 Supabase Economy

**Files:**
- Create migration: `supabase/migrations/<timestamp>_add_game_hub_economy.sql`
- Modify: `src/api/communityClient.js`
- Create: `src/lib/gameRewardClient.js`
- Modify: game reward UI call sites from local preview to RPC commit.

**Interfaces:**
- Produces: server-authoritative reward grant and spend path.
- Consumes: reward intent schemas, game catalogs, user auth.

- [ ] **Step 1: Add tables**

Add `game_profiles`, `game_reward_events`, `game_inventory_items`, `game_collectibles`, and `quarters_states` with RLS.

- [ ] **Step 2: Add RPCs**

Implement `claim_game_reward`, `spend_favor`, `equip_game_charm`, and future MIU outbox enqueue points.

- [ ] **Step 3: Add client wrapper**

Expose narrow calls from `src/lib/gameRewardClient.js`; Phaser scenes never call these directly.

- [ ] **Step 4: Verify RLS and reward integrity**

Run:

```bash
npm run test:rls
npm run lint
npm run build
```

Add targeted smoke tests for duplicate idempotency and cross-user access.

---

## Self-Review

- Spec coverage: covers hub, reward/Favor/forge system, charm/trophies, each requested game, Phase 1/Phase 2, and July 13 rule.
- Placeholder scan: no unresolved placeholder markers remain.
- Type consistency: game keys and file names are consistent across catalog, route, and task sections.
- Scope check: implementation is intentionally split into independently testable tasks. Quarters/Forge Hub is first, followed by Starfishing and each requested game in order.
