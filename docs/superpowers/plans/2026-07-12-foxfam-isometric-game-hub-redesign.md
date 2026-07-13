# Foxfam Isometric Game Hub Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark prototype presentation with a cohesive chalk-pastel isometric Personal Quarters, Priory Courtyard, customizable familiar, shared game shell, and six intuitive mouse-and-keyboard minigames while preserving local reward safety.

**Architecture:** React owns routes, isometric hub composition, menus, collections, accessibility, and four UI-driven games. Phaser remains responsible for Starfishing and Time Runner action playfields through the existing scene bridge. Plain simulation modules remain authoritative for game rules, and every game emits the existing Zod-validated local reward-intent shape rather than mutating real Favor.

**Tech Stack:** Vite 6, React 18, React Router, JavaScript modules, Tailwind CSS, Radix/shadcn components, Lucide icons, Phaser 4, Zod, Node test runner, Playwright browser checks.

## Global Constraints

- Work only in `/Users/scuffox/Documents/Codex/FoxfamPortal/foxfam.faith` on `vercel/game-hub-quarters-forge` or an isolated worktree created from it.
- Preserve `/Users/scuffox/Documents/Codex/FoxfamPortal/foxfam.faith/docs/superpowers/specs/2026-07-12-foxfam-isometric-game-hub-redesign.md` as the source of truth.
- Use `docs/superpowers/specs/assets/foxfam-quarters-production-concept.png` as the visual north star, not as a direct full-screen production asset.
- Canonical material names are `Star Glass`, `Moonwax`, `Charm Cord`, `Sigil Shards`, `Pearl Resin`, `Catnip Silver`, `Voidthread`, `Clock Brass`, and `Blooming Ink`.
- Replace Community Wordle with Word Garden; do not leave a public `/community-wordle` route except as a redirect to `/word-garden`.
- Support click-to-walk plus `WASD`/arrow movement, mouse interactions, `E`/`Enter` confirm, `Space` primary action, and `Escape` cancel/pause through shared action bindings.
- Use warm deep-slate text and outlines (`#364152`, `#485365`); pale chalk colors are surfaces, not low-contrast text.
- Do not use glassmorphism, white sticker outlines, nested cards, oversized instructional copy, or faces on relic/charm/material icons.
- Do not write real Favor, materials, charms, or trophies from a game client. Keep Phase 1 reward state local and schema-shaped.
- Preserve unrelated `.cursor/` and `supabase/.temp/` files.
- Every task follows test-first development and ends with a focused commit.

---

## File Structure

### Shared foundation

- `src/games/shared/theme/gameTheme.js`: canonical palette, surface, rarity, and world accent tokens.
- `src/games/shared/theme/gameTheme.test.js`: token completeness and contrast-pair contracts.
- `src/games/shared/input/actions.js`: semantic game and hub actions.
- `src/games/shared/input/bindings.js`: keyboard-to-action mapping.
- `src/games/shared/input/bindings.test.js`: keyboard mapping tests.
- `src/games/shared/input/useGameControls.js`: one lifecycle-safe keyboard dispatcher hook.
- `src/games/shared/ui/GameShell.jsx`: universal game header, playfield, status, and action layout.
- `src/games/shared/ui/GameResultSheet.jsx`: local reward summary and duplicate-choice surface.
- `src/games/shared/ui/InteractionPrompt.jsx`: shared contextual input hint.
- `src/games/shared/ui/game-shell.css`: scoped chalk-pastel game-shell styles and responsive constraints.

### Familiar and hub

- `src/games/shared/familiar/familiarCatalog.js`: species, palettes, markings, clothing, and defaults.
- `src/games/shared/familiar/familiarCatalog.test.js`: catalog and selection validation.
- `src/games/shared/familiar/FamiliarAvatar.jsx`: layered accessible familiar renderer.
- `src/components/quarters/IsometricRoom.jsx`: Personal Quarters scene composition and depth layers.
- `src/components/quarters/PrioryCourtyard.jsx`: walkable courtyard and world entrances.
- `src/components/quarters/QuartersHud.jsx`: compact profile, Favor, and navigation HUD.
- `src/components/quarters/StationPanel.jsx`: focused station interaction shell.
- `src/components/quarters/quarters-scene.css`: room/courtyard geometry, camera, focus, and responsive rules.
- `src/pages/QuartersHub.jsx`: Quarters/Courtyard state and station routing.

### Content and rewards

- `src/lib/gameHubCatalog.js`: canonical world routes, labels, materials, and lore.
- `src/lib/gameHubCatalog.test.js`: canonical route and material tests.
- `src/lib/gameRewards.js`: duplicate and local reward preview rules.
- `src/lib/gameRewards.test.js`: duplicate and renamed-material tests.

### Game lanes

- Starfishing: `src/pages/Starfishing.jsx`, `src/games/starfishing/phaser/StarfishingScene.js`, `src/games/starfishing/ui/*`, existing rule tests.
- Match & Merge: `src/pages/MatchMerge.jsx`, `src/games/matchMerge/ui/*`, existing rule tests.
- Boba Cafe: `src/pages/BobaCafe.jsx`, `src/games/bobaCafe/ui/*`, existing rule tests.
- Find Vezmir: `src/pages/FindVezmir.jsx`, `src/games/findVezmir/ui/*`, existing rule tests.
- Time Runner: `src/pages/TimeRunner.jsx`, `src/games/timeRunner/phaser/TimeRunnerScene.js`, `src/games/timeRunner/ui/*`, existing rule tests.
- Word Garden: `src/pages/WordGarden.jsx`, `src/games/wordGarden/content/wordGardenCatalog.js`, `src/games/wordGarden/simulation/wordGardenRules.js`, `src/games/wordGarden/simulation/wordGardenRules.test.js`, `src/games/wordGarden/ui/WordFlower.jsx`, `src/games/wordGarden/ui/WordGardenHud.jsx`.

---

### Task 1: Canonical Game Theme And Shared Shell

**Files:**
- Create: `src/games/shared/theme/gameTheme.js`
- Create: `src/games/shared/theme/gameTheme.test.js`
- Create: `src/games/shared/ui/GameShell.jsx`
- Create: `src/games/shared/ui/InteractionPrompt.jsx`
- Create: `src/games/shared/ui/game-shell.css`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `GAME_COLORS`, `GAME_WORLD_ACCENTS`, `getWorldAccent(worldKey)`, `GameShell`, and `InteractionPrompt`.
- Consumes: existing React Router links, Lucide icons, and `GAME_WORLD_KEYS`.

- [ ] **Step 1: Write failing theme-contract tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { GAME_COLORS, GAME_WORLD_ACCENTS, getWorldAccent } from "./gameTheme.js";

test("game theme exposes approved chalk palette", () => {
  assert.equal(GAME_COLORS.dreamLinen, "#FAF3EB");
  assert.equal(GAME_COLORS.malibuBlue, "#D9E6EC");
  assert.equal(GAME_COLORS.ink, "#364152");
  assert.equal(GAME_COLORS.outline, "#485365");
});

test("every playable world has a readable accent", () => {
  for (const accent of Object.values(GAME_WORLD_ACCENTS)) {
    assert.match(accent.surface, /^#[0-9A-F]{6}$/i);
    assert.equal(accent.text, GAME_COLORS.ink);
  }
  assert.equal(getWorldAccent("missing").surface, GAME_COLORS.malibuBlue);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test src/games/shared/theme/gameTheme.test.js`

Expected: FAIL because `gameTheme.js` does not exist.

- [ ] **Step 3: Implement the canonical token module**

```js
export const GAME_COLORS = Object.freeze({
  dreamLinen: "#FAF3EB",
  pinkPetals: "#F8E6E6",
  greenFields: "#EAEEE0",
  malibuBlue: "#D9E6EC",
  lavenderChalk: "#EEE8E8",
  trulyTeal: "#80ADBC",
  roseClay: "#D5A1A3",
  bellBlue: "#B4C6DC",
  hymnGold: "#DFD8AB",
  forgeBiscuit: "#CAB08B",
  ink: "#364152",
  outline: "#485365",
});

export const GAME_WORLD_ACCENTS = Object.freeze({
  starfishing: { surface: GAME_COLORS.trulyTeal, text: GAME_COLORS.ink },
  "match-merge": { surface: GAME_COLORS.lavenderChalk, text: GAME_COLORS.ink },
  "boba-cafe": { surface: GAME_COLORS.pinkPetals, text: GAME_COLORS.ink },
  "puzzle-cat": { surface: GAME_COLORS.greenFields, text: GAME_COLORS.ink },
  "time-runner": { surface: GAME_COLORS.bellBlue, text: GAME_COLORS.ink },
  "word-garden": { surface: GAME_COLORS.hymnGold, text: GAME_COLORS.ink },
});

export function getWorldAccent(worldKey) {
  return GAME_WORLD_ACCENTS[worldKey] || {
    surface: GAME_COLORS.malibuBlue,
    text: GAME_COLORS.ink,
  };
}
```

- [ ] **Step 4: Build the shared shell and prompt**

```jsx
export default function GameShell({ world, title, status, actions, children, sidebar }) {
  return (
    <main className="game-shell" data-world={world}>
      <header className="game-shell__header">
        <Link className="game-icon-button" to="/quarters" aria-label="Return to Quarters">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div className="game-shell__identity"><h1>{title}</h1>{status}</div>
        <div className="game-shell__actions">{actions}</div>
      </header>
      <div className="game-shell__layout">
        <section className="game-shell__playfield">{children}</section>
        {sidebar ? <aside className="game-shell__sidebar">{sidebar}</aside> : null}
      </div>
    </main>
  );
}
```

`InteractionPrompt` accepts `{ keys, label }`, renders semantic `<kbd>` elements, and remains `aria-hidden` only when an equivalent accessible label is already attached to the target.

- [ ] **Step 5: Add scoped CSS and verify tests**

Use CSS custom properties prefixed `--game-*`, stable `aspect-ratio: 16 / 9` playfields, `minmax(0, 1fr)` grid tracks, 44px minimum icon buttons, and a mobile breakpoint that stacks the sidebar below the playfield.

Run: `node --test src/games/shared/theme/gameTheme.test.js`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/shared/theme src/games/shared/ui src/index.css
git commit -m "Add shared isometric game theme and shell"
```

---

### Task 2: Semantic Mouse And Keyboard Input Layer

**Files:**
- Modify: `src/games/shared/input/actions.js`
- Modify: `src/games/shared/input/bindings.js`
- Create: `src/games/shared/input/bindings.test.js`
- Create: `src/games/shared/input/useGameControls.js`
- Modify: `src/pages/Starfishing.jsx`
- Modify: `src/pages/TimeRunner.jsx`

**Interfaces:**
- Produces: `GAME_ACTIONS.moveLeft`, `moveRight`, `moveUp`, `moveDown`, `interact`, `primary`, `secondary`, `confirm`, `cancel`, `pause`; `getActionForKeyboardEvent(event)`; `useGameControls({ enabled, onAction })`.
- Consumes: `dispatchAction(action)` functions from each route.

- [ ] **Step 1: Write failing input tests**

```js
test("maps shared movement and interaction keys", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW" }), GAME_ACTIONS.moveUp);
  assert.equal(getActionForKeyboardEvent({ code: "ArrowLeft" }), GAME_ACTIONS.moveLeft);
  assert.equal(getActionForKeyboardEvent({ code: "KeyE" }), GAME_ACTIONS.interact);
  assert.equal(getActionForKeyboardEvent({ code: "Space" }), GAME_ACTIONS.primary);
  assert.equal(getActionForKeyboardEvent({ code: "Escape" }), GAME_ACTIONS.cancel);
});

test("ignores modified shortcuts", () => {
  assert.equal(getActionForKeyboardEvent({ code: "KeyW", metaKey: true }), null);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test src/games/shared/input/bindings.test.js`

Expected: FAIL because the new semantic actions do not exist.

- [ ] **Step 3: Implement actions, bindings, and hook**

```js
export function useGameControls({ enabled = true, onAction }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (event) => {
      const action = getActionForKeyboardEvent(event);
      if (!action) return;
      event.preventDefault();
      onAction(action, event);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAction]);
}
```

Keep temporary aliases from legacy `cast` and `qte*` actions to semantic actions inside each game's adapter. Do not make scenes read `KeyboardEvent` directly.

- [ ] **Step 4: Replace direct window listeners in Phaser routes**

`Starfishing.jsx` maps `primary` to cast/reel and movement actions to QTE directions. `TimeRunner.jsx` maps `moveLeft`, `moveRight`, `primary`, and `confirm` to its existing rule actions.

- [ ] **Step 5: Run shared and game tests**

Run: `node --test src/games/shared/input/bindings.test.js src/games/starfishing/simulation/starfishingRules.test.js src/games/timeRunner/simulation/timeRunnerRules.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/shared/input src/pages/Starfishing.jsx src/pages/TimeRunner.jsx
git commit -m "Unify game mouse and keyboard actions"
```

---

### Task 3: Familiar Catalog And Layered Avatar

**Files:**
- Create: `src/games/shared/familiar/familiarCatalog.js`
- Create: `src/games/shared/familiar/familiarCatalog.test.js`
- Create: `src/games/shared/familiar/FamiliarAvatar.jsx`
- Create: `src/games/shared/familiar/familiar-avatar.css`

**Interfaces:**
- Produces: `DEFAULT_FAMILIAR`, `FAMILIAR_SPECIES`, `normalizeFamiliarSelection(value)`, and `<FamiliarAvatar familiar size pose />`.
- Consumes: approved game theme tokens.

- [ ] **Step 1: Write failing catalog tests**

```js
test("normalizes an invalid selection to the cream fox-cat default", () => {
  assert.deepEqual(normalizeFamiliarSelection({ species: "dragon" }), DEFAULT_FAMILIAR);
});

test("every species exposes required layer slots", () => {
  for (const species of Object.values(FAMILIAR_SPECIES)) {
    assert.deepEqual(species.layers, ["body", "markings", "outfit", "accessory", "charmFx"]);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test src/games/shared/familiar/familiarCatalog.test.js`

Expected: FAIL because the catalog does not exist.

- [ ] **Step 3: Implement the validated catalog**

```js
export const DEFAULT_FAMILIAR = Object.freeze({
  species: "fox-cat",
  coat: "cream",
  markings: "brow-star",
  outfit: "teal-tunic",
  accessory: "hymn-charm",
  charmFx: "none",
});

export function normalizeFamiliarSelection(value) {
  const species = FAMILIAR_SPECIES[value?.species];
  if (!species) return { ...DEFAULT_FAMILIAR };
  return {
    species: value.species,
    coat: species.coats.includes(value.coat) ? value.coat : species.coats[0],
    markings: species.markings.includes(value.markings) ? value.markings : species.markings[0],
    outfit: value.outfit || DEFAULT_FAMILIAR.outfit,
    accessory: value.accessory || "none",
    charmFx: value.charmFx || "none",
  };
}
```

- [ ] **Step 4: Build the layered renderer**

Render each layer as a positioned `<img>` with an empty-alt decorative contract inside one labeled figure. Use stable square dimensions and `object-fit: contain`; never use generated text inside the avatar.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/games/shared/familiar/familiarCatalog.test.js`

Expected: all tests PASS.

```bash
git add src/games/shared/familiar
git commit -m "Add customizable familiar foundation"
```

---

### Task 4: Canonical Worlds, Materials, And Result Sheet

**Files:**
- Modify: `src/lib/gameHubCatalog.js`
- Modify: `src/lib/gameHubCatalog.test.js`
- Modify: `src/lib/gameRewards.js`
- Modify: `src/lib/gameRewards.test.js`
- Create: `src/games/shared/ui/GameResultSheet.jsx`

**Interfaces:**
- Produces: `/word-garden` world entry, `voidthread`, `blooming-ink`, and `GameResultSheet({ intent, record, choices, onChoose, onReturn })`.
- Consumes: existing `gameRewardIntentSchema` and duplicate policies.

- [ ] **Step 1: Update tests first**

```js
test("catalog uses canonical renamed materials", () => {
  assert.equal(MATERIAL_BY_KEY.voidthread.label, "Voidthread");
  assert.equal(MATERIAL_BY_KEY["blooming-ink"].label, "Blooming Ink");
  assert.equal(GAME_WORLD_BY_KEY[GAME_WORLD_KEYS.wordGarden].route, "/word-garden");
  assert.equal(GAME_WORLD_BY_KEY[GAME_WORLD_KEYS.wordGarden].sourceMaterialKeys[0], "blooming-ink");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/lib/gameHubCatalog.test.js src/lib/gameRewards.test.js`

Expected: FAIL on old `community-wordle`, `hymn-ink`, and `vezmir-thread` values.

- [ ] **Step 3: Update catalog and compatibility migration**

Add a local-state migration map:

```js
export const LEGACY_MATERIAL_KEYS = Object.freeze({
  "vezmir-thread": "voidthread",
  "hymn-ink": "blooming-ink",
});

export function normalizeMaterialKey(key) {
  return LEGACY_MATERIAL_KEYS[key] || key;
}
```

Rename the world key to `wordGarden`, set route `/word-garden`, and change user-facing lore and rewards to Word Garden.

- [ ] **Step 4: Build GameResultSheet**

Use a Radix Dialog on narrow screens and an inline parchment panel on wide screens. Show record, item quantities, Favor preview, achievements, and exact duplicate outcomes. Disable the confirmation button after one choice until `onChoose` resolves.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/lib/gameHubCatalog.test.js src/lib/gameRewards.test.js`

Expected: all tests PASS.

```bash
git add src/lib/gameHubCatalog.js src/lib/gameHubCatalog.test.js src/lib/gameRewards.js src/lib/gameRewards.test.js src/games/shared/ui/GameResultSheet.jsx
git commit -m "Align game rewards and material catalog"
```

---

### Task 5: Personal Quarters And Priory Courtyard

**Files:**
- Create: `src/components/quarters/IsometricRoom.jsx`
- Create: `src/components/quarters/PrioryCourtyard.jsx`
- Create: `src/components/quarters/QuartersHud.jsx`
- Create: `src/components/quarters/StationPanel.jsx`
- Create: `src/components/quarters/quarters-scene.css`
- Modify: `src/pages/QuartersHub.jsx`
- Retire from route use: `src/components/quarters/QuartersScene.jsx`, `HubDock.jsx`, `HubDoorCard.jsx`

**Interfaces:**
- Produces: scene mode `"quarters" | "courtyard"`, semantic station definitions, and `onEnterStation(stationKey)`.
- Consumes: `FamiliarAvatar`, `GAME_WORLD_ORDER`, shared theme, and existing relic/Favor loading.

- [ ] **Step 1: Add a pure station-navigation test**

Create `src/components/quarters/quartersSceneModel.js` and test:

```js
test("courtyard exposes every playable world once", () => {
  const stations = buildCourtyardStations(GAME_WORLD_ORDER);
  assert.equal(stations.length, 6);
  assert.deepEqual(new Set(stations.map((item) => item.route)).size, 6);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/components/quarters/quartersSceneModel.test.js`

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the station model and hub state**

```js
export const QUARTERS_STATIONS = Object.freeze([
  { key: "forge", label: "Relic Forge", action: "open-forge" },
  { key: "customize", label: "Familiar Wardrobe", action: "open-customize" },
  { key: "decorate", label: "Decorate", action: "open-decorate" },
  { key: "trophies", label: "Trophy Shelf", action: "open-trophies" },
  { key: "collections", label: "Collections", action: "open-collections" },
  { key: "courtyard", label: "Priory Courtyard", action: "show-courtyard" },
]);
```

`QuartersHub` keeps its current guest-safe data loading. Replace card grids with one scene mode, focused station state, and a compact `QuartersHud`.

- [ ] **Step 4: Build scene components**

Use layered positioned assets with explicit `z-index` tokens, stable 16:9 framing, semantic buttons over interactable props, and a mobile station ribbon. The Courtyard uses one entrance per game and returns to Quarters without page reload.

- [ ] **Step 5: Verify route and responsive behavior**

Run: `node --test src/components/quarters/quartersSceneModel.test.js src/lib/gameHubCatalog.test.js`

Expected: all tests PASS.

Browser checks at 1440×900 and 390×844:

- Quarters scene is nonblank;
- all station labels fit;
- keyboard focus reaches all stations;
- click and `E` open the same selected station;
- Courtyard exposes all six entrances;
- guest notice remains usable.

- [ ] **Step 6: Commit**

```bash
git add src/components/quarters src/pages/QuartersHub.jsx
git commit -m "Rebuild Quarters and Priory Courtyard"
```

---

### Task 6: Piscatio.Starfishing Lane

**Files:**
- Modify: `src/pages/Starfishing.jsx`
- Modify: `src/games/starfishing/phaser/StarfishingScene.js`
- Modify: `src/games/starfishing/ui/StarfishingHud.jsx`
- Modify: `src/games/starfishing/ui/FishpediaPanel.jsx`
- Modify: `src/games/starfishing/simulation/starfishingRules.test.js`

**Interfaces:**
- Consumes: `GameShell`, `GameResultSheet`, `useGameControls`, shared theme, and existing Starfishing simulation functions.
- Produces: complete mouse and keyboard catch flow and isometric pond scene.

- [ ] **Step 1: Add failing mouse-action and result tests**

Add rule tests proving `primary` starts a cast from idle, directional actions advance QTEs, and exactly one duplicate choice produces one reward intent.

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/starfishing/simulation/starfishingRules.test.js`

Expected: FAIL on semantic action adapters.

- [ ] **Step 3: Add a semantic Starfishing adapter**

```js
export function applyStarfishingAction(state, action, fishpedia) {
  if (action === GAME_ACTIONS.primary && state.phase === STARFISHING_PHASES.idle) return beginCast(state);
  const qteAction = MOVEMENT_TO_QTE[action];
  return qteAction ? applyQteAction(state, qteAction, fishpedia) : state;
}
```

- [ ] **Step 4: Recompose scene and UI**

Use an isometric chalk-pastel pond with a visible familiar, cast marker, line/tension visualization, fish shadow tells, and rarity glow only at catch reveal. Put Fishpedia in an illustrated tabbed panel and duplicate choices in `GameResultSheet`.

- [ ] **Step 5: Verify and commit**

Run: `node --test src/games/starfishing/simulation/starfishingRules.test.js`

Browser checks: mouse-only catch, keyboard-only catch, QTE assistance, duplicate choice, Fishpedia silhouette, restart, and Return to Quarters.

```bash
git add src/pages/Starfishing.jsx src/games/starfishing
git commit -m "Rework Starfishing as an isometric pond"
```

---

### Task 7: Concordia.MatchMerge Lane

**Files:**
- Modify: `src/pages/MatchMerge.jsx`
- Modify: `src/games/matchMerge/ui/MatchMergeBoard.jsx`
- Modify: `src/games/matchMerge/ui/MatchMergeHud.jsx`
- Modify: `src/games/matchMerge/simulation/matchMergeRules.js`
- Modify: `src/games/matchMerge/simulation/matchMergeRules.test.js`

**Interfaces:**
- Consumes: `GameShell`, `GameResultSheet`, shared theme, semantic directional actions.
- Produces: mouse drag/click and keyboard selection on the Reliquary Bench.

- [ ] **Step 1: Add failing keyboard-selection tests**

Test `moveMatchMergeSelection(state, direction)` wraps safely within the grid and `confirmMatchMergeSelection` delegates to existing swap rules.

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/matchMerge/simulation/matchMergeRules.test.js`

Expected: FAIL because keyboard selection helpers do not exist.

- [ ] **Step 3: Implement pure selection helpers**

```js
export function moveMatchMergeSelection(state, deltaRow, deltaColumn) {
  const row = Math.max(0, Math.min(BOARD_ROWS - 1, state.cursor.row + deltaRow));
  const column = Math.max(0, Math.min(BOARD_COLUMNS - 1, state.cursor.column + deltaColumn));
  return { ...state, cursor: { row, column } };
}
```

- [ ] **Step 4: Rebuild board presentation**

Render the board as an isometric reliquary tabletop with stable square tiles, material icons, selected/focused states, drag feedback, undo icon, shuffle icon, request tray, and combo feedback. Do not change reward math.

- [ ] **Step 5: Verify and commit**

Run: `node --test src/games/matchMerge/simulation/matchMergeRules.test.js`

Browser checks: click swap, drag swap, keyboard swap, invalid move feedback, claim, reset, and mobile tile fit.

```bash
git add src/pages/MatchMerge.jsx src/games/matchMerge
git commit -m "Rework Match and Merge reliquary bench"
```

---

### Task 8: Taberna.BobaCafe Lane

**Files:**
- Modify: `src/pages/BobaCafe.jsx`
- Create: `src/games/bobaCafe/ui/BobaCounter.jsx`
- Create: `src/games/bobaCafe/ui/BobaOrderTicket.jsx`
- Create: `src/games/bobaCafe/ui/BobaStationTray.jsx`
- Modify: `src/games/bobaCafe/simulation/bobaCafeRules.js`
- Modify: `src/games/bobaCafe/simulation/bobaCafeRules.test.js`

**Interfaces:**
- Consumes: shared shell, result sheet, familiar renderer, semantic primary/confirm actions.
- Produces: station-focused mouse, drag, number-key, and keyboard focus flow.

- [ ] **Step 1: Add failing shortcut tests**

Test `selectCafeOptionByShortcut(state, stationKey, ordinal)` chooses only valid options and leaves state unchanged for unavailable ordinals.

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/bobaCafe/simulation/bobaCafeRules.test.js`

Expected: FAIL because shortcut selection does not exist.

- [ ] **Step 3: Implement the pure shortcut adapter**

```js
export function selectCafeOptionByShortcut(state, stationKey, ordinal) {
  const options = BOBA_OPTIONS_BY_STATION[stationKey] || [];
  const option = options[ordinal - 1];
  return option ? selectCafeOption(state, stationKey, option.key) : state;
}
```

- [ ] **Step 4: Recompose the cafe page**

Split the existing large page into an isometric counter, one readable order ticket, and one active station tray. Show customer patience using shape and fill, not color alone. Keep retries local and result claims single-use.

- [ ] **Step 5: Verify and commit**

Run: `node --test src/games/bobaCafe/simulation/bobaCafeRules.test.js`

Browser checks: mouse recipe, number-key recipe, physical keyboard focus, incorrect ingredient recovery, perfect order, queue reset, and result sheet.

```bash
git add src/pages/BobaCafe.jsx src/games/bobaCafe
git commit -m "Rework Boba Cafe moonbrew counter"
```

---

### Task 9: Occultus.FindVezmir Lane

**Files:**
- Modify: `src/pages/FindVezmir.jsx`
- Create: `src/games/findVezmir/ui/CloisterDiorama.jsx`
- Create: `src/games/findVezmir/ui/ClueTray.jsx`
- Modify: `src/games/findVezmir/content/hiddenObjects.js`
- Modify: `src/games/findVezmir/simulation/findVezmirRules.js`
- Modify: `src/games/findVezmir/simulation/findVezmirRules.test.js`

**Interfaces:**
- Consumes: shared shell, semantic pan/interact actions, `Voidthread` material.
- Produces: layer cycling, pan state, visible clue focus, and no-hint completion.

- [ ] **Step 1: Add failing depth-layer tests**

Test `cycleDioramaLayer(state, 1)` and `cycleDioramaLayer(state, -1)` wrap through the explicit layer list without altering found targets.

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/findVezmir/simulation/findVezmirRules.test.js`

Expected: FAIL because depth cycling does not exist.

- [ ] **Step 3: Implement depth and pan state**

```js
export function cycleDioramaLayer(state, delta) {
  const count = state.layers.length;
  const activeLayer = (state.activeLayer + delta + count) % count;
  return { ...state, activeLayer };
}
```

- [ ] **Step 4: Build the cloister diorama**

Render foreground, room, and background as explicit layers with focusable target buttons. `Q`/`E` cycles layers, `WASD` pans within bounded offsets, mouse drag pans, and hints identify a region without auto-completing the target.

- [ ] **Step 5: Verify and commit**

Run: `node --test src/games/findVezmir/simulation/findVezmirRules.test.js`

Browser checks: mouse pan, keyboard pan, layer cycling, hint, no-hint clear, reward includes `voidthread`, and mobile labels do not overlap.

```bash
git add src/pages/FindVezmir.jsx src/games/findVezmir
git commit -m "Rework Find Vezmir cloister dioramas"
```

---

### Task 10: Tempus.TimeRunner Lane

**Files:**
- Modify: `src/pages/TimeRunner.jsx`
- Modify: `src/games/timeRunner/phaser/TimeRunnerScene.js`
- Modify: `src/games/timeRunner/ui/TimeRunnerHud.jsx`
- Modify: `src/games/timeRunner/simulation/timeRunnerRules.js`
- Modify: `src/games/timeRunner/simulation/timeRunnerRules.test.js`

**Interfaces:**
- Consumes: `GameShell`, Phaser bridge, semantic movement/primary actions, shared familiar style.
- Produces: 2.5D isometric lane, marked mouse landings, Clock Brass result.

- [ ] **Step 1: Add failing landing tests**

Test `selectMouseLanding(state, landingId)` accepts only currently reachable landing markers and maps the choice to the same jump transition as `primary`.

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/timeRunner/simulation/timeRunnerRules.test.js`

Expected: FAIL because mouse landing selection does not exist.

- [ ] **Step 3: Implement deterministic landing selection**

```js
export function selectMouseLanding(state, landingId) {
  const landing = state.availableLandings.find((item) => item.id === landingId);
  return landing ? beginJump(state, landing) : state;
}
```

- [ ] **Step 4: Rebuild the Phaser scene**

Render a fixed 2.5D isometric lane with clock-hand platforms, Roman-numeral gates, pendulums, face shards, familiar sprite layers, depth sorting, and clickable landing markers. Preserve rule-module timing and reward behavior.

- [ ] **Step 5: Verify and commit**

Run: `node --test src/games/timeRunner/simulation/timeRunnerRules.test.js`

Browser checks: keyboard run, mouse landing run, pause-safe timer, no-fall completion, shard count, restart, and nonblank canvas pixel check.

```bash
git add src/pages/TimeRunner.jsx src/games/timeRunner
git commit -m "Rework Time Runner clocktower traverse"
```

---

### Task 11: Florilegium.WordGarden Lane

**Files:**
- Create: `src/pages/WordGarden.jsx`
- Create: `src/games/wordGarden/content/wordGardenCatalog.js`
- Create: `src/games/wordGarden/simulation/wordGardenRules.js`
- Create: `src/games/wordGarden/simulation/wordGardenRules.test.js`
- Create: `src/games/wordGarden/ui/WordFlower.jsx`
- Create: `src/games/wordGarden/ui/WordGardenHud.jsx`
- Modify: `src/App.jsx`
- Retire from route use: `src/pages/CommunityWordle.jsx`, `src/games/communityWordle/*`

**Interfaces:**
- Produces: `createWordGardenState({ seedKey })`, `appendPetal`, `removePetal`, `submitGardenWord`, `shufflePetals`, `calculateWordGardenScore`, `buildWordGardenRewardIntent`.
- Consumes: shared shell, result sheet, `Blooming Ink`, local JSON helpers, and route catalog.

- [ ] **Step 1: Write complete failing rule tests**

```js
test("requires the center letter and four characters", () => {
  const state = createWordGardenState({ seedKey: "2026-07-12", letters: "PETALSR", center: "A" });
  assert.equal(submitGardenWord(state, "PETS").state.lastError, "Every word must use A.");
  assert.equal(submitGardenWord(state, "ART").state.lastError, "Words need at least 4 letters.");
});

test("awards a Full Bloom for all seven letters", () => {
  const result = scoreGardenWord("PETALERS", { letters: "PETALSR", center: "A" });
  assert.equal(result.isFullBloom, true);
  assert.ok(result.score > "PETAL".length);
});

test("shuffling preserves the center and letter set", () => {
  const state = createWordGardenState({ seedKey: "2026-07-12" });
  const next = shufflePetals(state);
  assert.equal(next.center, state.center);
  assert.deepEqual([...next.petals].sort(), [...state.petals].sort());
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test src/games/wordGarden/simulation/wordGardenRules.test.js`

Expected: FAIL because Word Garden does not exist.

- [ ] **Step 3: Implement deterministic daily state and scoring**

Use a curated local puzzle catalog keyed by deterministic date hash. Every puzzle defines seven unique letters, one center letter, an accepted-word set, and Full Bloom words. Do not depend on a live dictionary service in Phase 1.

```js
export function scoreGardenWord(word, puzzle) {
  const letters = new Set(word);
  const isFullBloom = puzzle.letters.split("").every((letter) => letters.has(letter));
  return { score: word.length + (isFullBloom ? 7 : 0), isFullBloom };
}
```

- [ ] **Step 4: Build the flower and garden UI**

Use seven focusable petal buttons, a required center petal, physical keyboard input, Enter, Backspace, shuffle icon, found-word list, personal bloom meter, spoiler-safe community meter placeholder, and result sheet. Do not reveal accepted words before reset.

- [ ] **Step 5: Replace the route safely**

Add `/word-garden` to `App.jsx`. Keep `/community-wordle` as `<Navigate replace to="/word-garden" />` for saved links. Remove Community Wordle from the hub catalog and navigation labels.

- [ ] **Step 6: Verify and commit**

Run: `node --test src/games/wordGarden/simulation/wordGardenRules.test.js src/lib/gameHubCatalog.test.js`

Browser checks: type letters, click petals, invalid center-letter feedback, Full Bloom, shuffle invariants, local persistence, Blooming Ink reward, redirect, and mobile fit.

```bash
git add src/App.jsx src/pages/WordGarden.jsx src/games/wordGarden src/lib/gameHubCatalog.js
git commit -m "Replace Community Wordle with Word Garden"
```

---

### Task 12: Route-Wide Integration, Accessibility, And Visual Verification

**Files:**
- Create: `scripts/e2e-game-hub.mjs`
- Modify: `package.json`
- Modify: affected game and hub files only when a verified failure requires correction.

**Interfaces:**
- Consumes: all prior routes and shared contracts.
- Produces: repeatable `npm run test:e2e:games` verification.

- [ ] **Step 1: Add the E2E command**

```json
{
  "scripts": {
    "test:e2e:games": "node scripts/e2e-game-hub.mjs"
  }
}
```

- [ ] **Step 2: Implement route and input smoke checks**

The script launches Chromium against the existing dev server and checks:

```js
const routes = [
  "/quarters",
  "/starfishing",
  "/match-merge",
  "/boba-cafe",
  "/find-vezmir",
  "/time-runner",
  "/word-garden",
];

for (const route of routes) {
  await page.goto(`${baseUrl}${route}`);
  await page.waitForLoadState("networkidle");
  if (await page.locator("body").evaluate((body) => body.scrollWidth > body.clientWidth + 1)) {
    throw new Error(`${route} has horizontal overflow`);
  }
  await page.screenshot({ path: `artifacts/game-hub${route.replaceAll("/", "-")}.png`, fullPage: true });
}
```

Add keyboard Tab traversal, Escape behavior, Return to Quarters checks, and canvas nonblank sampling for Phaser routes.

- [ ] **Step 3: Run the complete rule suite**

Run:

```bash
node --test \
  src/games/shared/theme/gameTheme.test.js \
  src/games/shared/input/bindings.test.js \
  src/games/shared/familiar/familiarCatalog.test.js \
  src/lib/gameHubCatalog.test.js \
  src/lib/gameRewards.test.js \
  src/games/starfishing/simulation/starfishingRules.test.js \
  src/games/matchMerge/simulation/matchMergeRules.test.js \
  src/games/bobaCafe/simulation/bobaCafeRules.test.js \
  src/games/findVezmir/simulation/findVezmirRules.test.js \
  src/games/timeRunner/simulation/timeRunnerRules.test.js \
  src/games/wordGarden/simulation/wordGardenRules.test.js
```

Expected: all tests PASS with zero failures.

- [ ] **Step 4: Run lint and production build**

Run: `zsh scripts/npm-safe.zsh run lint`

Expected: exit 0.

Run: `zsh scripts/npm-safe.zsh run build`

Expected: exit 0 and Vite production output generated.

- [ ] **Step 5: Run desktop and mobile E2E verification**

Start: `zsh scripts/dev-safe.zsh --host 127.0.0.1 --port 5174`

Run: `GAME_BASE_URL=http://127.0.0.1:5174 npm run test:e2e:games`

Expected: all seven routes pass at 1440×900 and 390×844; screenshots contain no blank scene, overlap, clipped text, or horizontal overflow.

- [ ] **Step 6: Inspect reward integrity**

Run: `rg -n "update.*points|points.*update|grant.*favor|favor.*grant" src/pages src/games`

Expected: no direct game-client mutation of real Favor. Hits must be imports, copy, tests, or local reward previews only.

- [ ] **Step 7: Commit**

```bash
git add scripts/e2e-game-hub.mjs package.json
git commit -m "Add game hub integration verification"
```

---

## Parallel Execution Gate

Tasks 1-5 must complete sequentially because they establish shared interfaces and the hub integration target. After Task 5 passes review, Tasks 6-11 may run in parallel in isolated worktrees, one task per agent. Task 12 begins only after every game lane is merged and its focused tests pass.

Human-facing agent names:

- `Piscatio.Starfishing` → Task 6;
- `Concordia.MatchMerge` → Task 7;
- `Taberna.BobaCafe` → Task 8;
- `Occultus.FindVezmir` → Task 9;
- `Tempus.TimeRunner` → Task 10;
- `Florilegium.WordGarden` → Task 11;
- `Probatio.Playtest` → Task 12 review and evidence.
