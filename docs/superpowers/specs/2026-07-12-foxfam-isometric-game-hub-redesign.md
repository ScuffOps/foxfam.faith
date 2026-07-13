# Foxfam Isometric Game Hub Redesign

## Status

Approved design for implementation planning.

This specification replaces the presentation and interaction direction of the existing game-hub prototypes while preserving their tested simulation modules, routes, reward-intent boundary, and portal integration constraints.

## Goal

Rework the Personal Quarters, Relic Forge, Priory Courtyard, and all six minigames into one coherent, cute isometric game world. The result must feel like a hand-authored cozy anime-gacha game rather than a collection of portal pages.

The redesign must:

- use a consistent isometric art and UI language;
- feature a customizable animal-familiar player character;
- support mouse and keyboard play on desktop;
- preserve first-class mobile behavior for later touch mapping;
- make each minigame feed Favor, forge materials, charms, trophies, collections, and decor back into the Quarters;
- keep real portal rewards behind validated, server-authoritative boundaries;
- allow one isolated implementation lane per minigame without visual or behavioral drift.

## Approved Visual Reference

Production concept: `docs/superpowers/specs/assets/foxfam-quarters-production-concept.png`.

The concept is a visual north star, not a final source asset. Production scenes should improve its depth sorting, responsive framing, icon consistency, focus states, animation readiness, and text accuracy.

## Product Structure

### Personal Quarters

The Quarters is the player's private home and emotional center of the minigame ecosystem. It is an explorable room, not a dashboard.

Primary stations:

- Relic Forge;
- charm wardrobe and loadout;
- familiar customization;
- decor mode;
- trophy shelf;
- Fishpedia and collection archive;
- forge-material pantry;
- mailbox and guestbook;
- doorway to the Priory Courtyard.

Stations use subtle animation, light, and notification markers when new activity exists. Text-heavy interfaces open only after the player approaches, focuses, or clicks a station.

### Priory Courtyard

The Courtyard is a separate illustrated travel space connecting the Quarters to each minigame world. It remains walkable and spatial rather than becoming a grid of route cards.

World entrances:

- Celestial Pond for Starfishing;
- Reliquary Bench for Match & Merge;
- Moonbrew Counter for Boba Cafe;
- Cloister Dioramas for Find Vezmir;
- Clocktower gate for Time Runner;
- Priory Greenhouse for Word Garden.

### Spatial Model

The approved structure is **Room + Courtyard Map**:

- one polished, customizable Personal Quarters scene;
- one separate Priory Courtyard travel scene;
- focused station panels and game routes opened from those scenes;
- selective painted transitions for arrivals, world unlocks, and mythic moments.

## Art Direction

### Core Style

- cute 2D isometric anime-gacha illustration;
- flat layered vector-like forms with subtle chalk and paper texture;
- smooth color blocking and readable silhouettes;
- gently imperfect hand-drawn edges;
- compact, expressive animal-familiar proportions;
- warm deep-slate internal outlines;
- restrained highlights and purposeful glow;
- tactile wood, linen, parchment, ceramic, painted metal, and woven fabric.

Do not use:

- white sticker outlines or halo edges;
- glassmorphism;
- glossy 3D rendering;
- generic SaaS cards;
- dark monochrome surfaces across the whole experience;
- decorative glow on every element;
- cute faces on relics, charms, or material icons.

### Production Method

Use a **Layered Isometric Kit with Selective Painted Scenes**.

The reusable kit owns:

- floor and wall tiles;
- architectural pieces;
- furniture and station props;
- familiar bodies, species features, clothing, and accessories;
- interactable states;
- lighting overlays;
- particles and charm FX;
- game HUD components;
- depth and collision metadata.

Bespoke painted scenes are reserved for:

- first Courtyard arrival;
- world unlock transitions;
- Fishpedia completion;
- mythic catches;
- major charm evolution;
- seasonal Priory vistas;
- other rare collection milestones.

### Canonical Palette

Foundation surfaces:

- Dream Linen `#FAF3EB`;
- Pink Petals `#F8E6E6`;
- Green Fields `#EAEEE0`;
- Malibu Blue `#D9E6EC`;
- Lavender Chalk `#EEE8E8`.

Playable accents:

- Truly Teal `#80ADBC`;
- Rose Clay `#D5A1A3`;
- Bell Blue `#B4C6DC`;
- Hymn Gold `#DFD8AB`;
- Forge Biscuit `#CAB08B`.

Accessibility ink:

- primary text `#364152`;
- outlines and strong borders `#485365`.

Pale colors are surfaces, never low-contrast body text. Individual games may add richer local accents while returning to the same chalk neutrals and slate linework.

### UI Language

- illustrated parchment, chalk-painted wood, and fabric panels;
- 6-8px corner radii;
- shallow pressed depth and clear selected states;
- icon-led commands with tooltips and accessible labels;
- compact edge HUDs that preserve the playfield;
- illustrated tabs for inventories and collections;
- visible hover outlines, focus rings, and interaction cues;
- no cards nested inside cards;
- no oversized explanatory text inside the game.

## Player Familiar

The player character is a customizable animal familiar.

Initial customization dimensions:

- species;
- coat palette;
- markings;
- eye treatment;
- ear and tail variants where species permits;
- outfit pieces;
- accessories;
- equipped charm FX.

The same familiar identity appears in the Quarters, Courtyard, game-result sheets, profiles, visitor surfaces, and minigames where the camera permits it. Species-specific rigs may share a common action contract but must not distort clothing or accessories.

## Shared Input And UX Contract

### Desktop Controls

- `WASD` or arrow keys: movement or directional QTE actions;
- mouse click: click-to-walk, select, aim, drag, or primary contextual action;
- `E` or `Enter`: interact or confirm;
- `Space`: primary game action;
- `Escape`: cancel, close one layer, or pause;
- game-specific shortcuts: exposed through the shared action map, not read directly by scenes.

Click-to-walk and keyboard movement must drive the same movement actions. Clicking, `E`, and `Enter` must resolve through the same interaction action.

### Interaction Feedback

- hover and focus outlines for interactables;
- short context prompts near the target;
- anticipation animation before consequential actions;
- color-plus-shape success and failure cues;
- short familiar reactions;
- useful recovery text after a mistake;
- no instruction wall before play.

### Shared Game Screen Anatomy

- back or return control at top left;
- compact world identity near the back control;
- goal, score, or progress at top right;
- settings and pause within immediate reach;
- unobstructed central playfield;
- context actions near the bottom edge;
- result sheet after a completed session;
- explicit restart and Return to Quarters actions.

### Accessibility

- keyboard-only and mouse-only completion paths;
- rebindable controls;
- hold-versus-toggle options;
- QTE timing assistance;
- color-plus-shape cues;
- reduced motion;
- independent music and effects controls;
- text scaling;
- pause-safe timers;
- visible focus states.

Assistance may reduce competitive score multipliers. It must not block collection progress, story access, or achievement eligibility unrelated to timing mastery.

### Responsive Behavior

Desktop preserves the full isometric scene with a compact edge HUD. Mobile uses safe camera framing, larger targets, tap-to-walk, tap-to-interact, and a short station ribbon. Mobile must not replace the world with generic navigation cards.

## Minigame Designs

### 1. Starfishing: Celestial Pond

Core loop:

1. Aim and cast into the isometric constellation pond.
2. Read the bite tell.
3. Complete rarity-scaled directional and timed reel actions.
4. Manage line tension during the finish.
5. Reveal the catch and its size.
6. Keep, release, or convert duplicates.

Controls:

- mouse aims and casts;
- `Space` performs primary reel actions;
- `WASD` or arrows answer QTE directions;
- equivalent clickable directional controls remain available.

Rewards:

- Star Glass;
- Favor previews and capped claims;
- Fishpedia records;
- duplicate conversion;
- constellation charms;
- fishing trophies and profile frames.

The Fishpedia tracks caught status, count, largest size, smallest size, first-catch date, rarity, and silhouettes for undiscovered entries.

### 2. Match & Merge: Reliquary Bench

Core loop:

1. Swap offerings on an isometric tabletop grid.
2. Match three to refine materials.
3. Merge identical refined pieces into higher tiers.
4. Fulfill Forge requests.
5. Trigger shrine combos and limited rerolls.

Controls:

- mouse drag or click-to-swap;
- arrows move selection;
- `Enter` confirms;
- undo and shuffle use explicit icon controls.

Rewards:

- Moonwax;
- Charm Cord;
- Sigil Shards;
- upgrade dust;
- combo charms and reliquary trophies.

### 3. Boba Cafe: Moonbrew Counter

Core loop:

1. Read an animal-familiar customer's order.
2. Select cup, base, flavor, and topping.
3. Perform short preparation actions at isometric stations.
4. Serve before patience expires.
5. Resolve satisfaction, tips, recipe progress, and streaks.

Controls:

- mouse click and drag for ingredients;
- number shortcuts for station choices;
- `Space` completes the active station action;
- keyboard focus order covers the full preparation path.

Rewards:

- Pearl Resin;
- Favor;
- recipes;
- cafe decor;
- service charms and trophies.

### 4. Find Vezmir: Cloister Dioramas

Core loop:

1. Inspect a layered isometric cloister scene.
2. Follow visual and environmental clues.
3. Shift or cycle depth layers where allowed.
4. Find Vezmir.
5. Discover optional lore objects and no-hint mastery goals.

Controls:

- mouse pans and selects;
- `WASD` pans;
- `Q` and `E` cycle depth layers;
- an explicit hint control remains available.

Rewards:

- Voidthread;
- Catnip Silver;
- lore scraps;
- discovery frames;
- cloister trophies.

### 5. Time Runner: Clocktower Traverse

Time Runner remains a platformer but uses a 2.5D isometric lane and the shared familiar art kit.

Core loop:

1. Run through the clocktower lane.
2. Jump across clock hands, numerals, and moving mechanisms.
3. Collect face shards.
4. Avoid pendulums and bell-cycle hazards.
5. Reach the exit before the cycle resets.

Controls:

- `A` and `D` or left and right arrows move;
- `Space` jumps;
- mouse click jumps toward a marked valid landing;
- `Escape` pauses safely.

Rewards:

- Clock Brass;
- restored clockface pieces;
- time-trial and no-fall charms;
- clocktower trophies and profile frames.

### 6. Word Garden: Priory Greenhouse

Word Garden replaces Community Wordle.

Daily rules:

- seven letters appear in a flower;
- the center letter is required in every word;
- words contain at least four letters;
- letters may repeat;
- one shared puzzle rotates daily;
- outer petals may be shuffled without changing the puzzle.

Scoring:

- longer words score more;
- using all seven letters creates a Full Bloom;
- repeated word families receive diminishing bonus value;
- daily ranks unlock personal garden growth;
- aggregate participation waters a spoiler-safe community plant.

Controls:

- physical keyboard input;
- `Enter` submits;
- `Backspace` removes a letter;
- mouse or touch selects petals;
- keyboard focus navigation covers all controls.

Rewards:

- Blooming Ink;
- greenhouse decor;
- botanical profile frames;
- Full Bloom charms;
- seven-day garden trophies;
- capped Favor for first daily rank thresholds.

The Twitch extension uses the same daily seed and validation contract, a compact flower wheel, personal submission, community bloom meter, and spoiler-safe result rank.

## Reward And Forge System

### Reward Flow

1. A game simulation completes a session or milestone.
2. The game creates a schema-validated reward intent.
3. The shared result sheet displays records, reward previews, and duplicate choices.
4. Phase 1 stores the preview and local progress.
5. Phase 2 submits an idempotent claim to the server ledger.
6. The Quarters reflects updated materials, collections, trophies, and charms.

### Canonical Materials

- Star Glass;
- Moonwax;
- Charm Cord;
- Sigil Shards;
- Pearl Resin;
- Catnip Silver;
- Voidthread;
- Clock Brass;
- Blooming Ink.

### Duplicate Choices

The result sheet shows exact outcomes before confirmation:

- keep for collection statistics;
- release for capped Favor;
- convert into game-appropriate forge material or dust;
- use duplicate charms toward star-tier progression.

### Charm Taxonomy

- passive bonus charms;
- cosmetic relic FX;
- profile frame charms;
- familiar companion effects;
- game-only mythics;
- collection-completion charms.

Charm effects must remain small and capped. Cosmetic rarity may be dramatic. Power rarity must not erase skill. Achievement charms and trophies cannot require spending.

### Trophies

Trophies are permanent Quarters display objects. They record milestone, source game, and unlock date. They do not consume equipment slots and may unlock coordinated decor.

### Forge Safety

- preview all costs and resulting effects before confirmation;
- do not mutate materials or Favor on a failed transaction;
- use idempotency keys for confirmed actions;
- keep upgrade rules outside JSX and Phaser scenes;
- Phase 2 performs authoritative spending and grants through narrow Supabase RPCs;
- RLS restricts users to their own inventories, records, loadouts, and Quarters state.

## Architecture

### React Portal Shell

React owns:

- routes;
- Quarters and Courtyard scene shells;
- station panels;
- collections and Fishpedia;
- inventory and charm loadout;
- settings and accessibility;
- result sheets and duplicate choices;
- familiar customization;
- portal navigation and authentication context.

### Phaser Playfields

Phaser owns action-heavy rendering for:

- Starfishing;
- Time Runner;
- any later scene that requires deterministic animation, collision, or timing.

Scenes remain thin. They render simulation state and emit shared actions. They do not grant real rewards directly.

### React-Driven Games

React and plain simulation modules own:

- Match & Merge;
- Boba Cafe;
- Find Vezmir;
- Word Garden.

These games may use canvas or layered images for presentation where useful, but gameplay rules remain in testable plain modules.

### Shared Game Core

Central ownership includes:

- art tokens and asset manifests;
- familiar customization schema;
- input actions and bindings;
- reward-intent schemas;
- result sheets;
- save-state schemas;
- settings and accessibility contracts;
- scene bridge;
- route catalog;
- material and charm catalogs.

Game implementations may consume these contracts. They may not silently fork them.

### Persistence Phases

Phase 1:

- schema-shaped local storage;
- local collection progress;
- local reward previews;
- no direct mutation of real Favor.

Phase 2:

- Supabase tables and narrow RPCs;
- RLS;
- idempotent reward ledger;
- server-side caps and reward math;
- authoritative Favor, material, charm, trophy, and record grants;
- safe visitor reads for public Quarters surfaces.

## Failure And Recovery Behavior

- a scene crash opens a themed recovery panel with restart and Return to Quarters;
- local progress is saved at safe checkpoints;
- invalid reward intents are quarantined and never applied silently;
- network claims retry by stable event ID;
- duplicate claim responses resolve idempotently;
- failed Forge transactions preserve materials and Favor;
- unavailable art assets fall back to explicit placeholders without collapsing layout;
- daily puzzle failures show a retry state without exposing the answer;
- timers pause while the document is hidden or a game is paused where fairness requires it.

## Parallel Agent Plan Boundary

The future implementation plan may dispatch one agent per minigame only after shared contracts are landed.

Main agent ownership:

- Quarters and Courtyard;
- visual tokens and shared UI kit;
- familiar system;
- input and reward contracts;
- Relic Forge integration;
- route-wide integration and verification.

Independent lanes:

- `Piscatio.Starfishing`;
- `Concordia.MatchMerge`;
- `Taberna.BobaCafe`;
- `Occultus.FindVezmir`;
- `Tempus.TimeRunner`;
- `Florilegium.WordGarden`.

Each game lane owns its route, simulation, tutorial, game-specific UI, responsive behavior, mouse and keyboard controls, tests, and visual playtest evidence.

## Verification

Required before completion:

- unit tests for every simulation and reward rule;
- keyboard-only playthrough for every route;
- mouse-only playthrough for every route;
- responsive screenshots at desktop and mobile viewports;
- nonblank Phaser canvas pixel checks;
- pause, restart, recovery, and Return to Quarters checks;
- route smoke tests;
- focus order and visible-focus review;
- contrast review for text and controls;
- text-fit and overlap checks;
- build and lint;
- verification that no game client directly mutates real Favor;
- verification that unrelated portal routes remain intact.

## Out Of Scope For The First Redesign Pass

- production Supabase reward migrations;
- public visitor editing;
- real-money purchases;
- competitive leaderboards;
- a large species catalog beyond the initial reusable rig set;
- seasonal events beyond proving the asset hooks;
- final Twitch publication and review;
- replacing unrelated portal UI.

## Implementation Order

1. Shared art tokens, asset manifests, familiar schema, input actions, reward schemas, result sheet, and game shell.
2. Personal Quarters and Relic Forge station.
3. Priory Courtyard and world entrances.
4. Starfishing.
5. Match & Merge.
6. Boba Cafe.
7. Find Vezmir.
8. Time Runner.
9. Word Garden.
10. Route-wide visual, accessibility, reward, and regression verification.

Implementation may parallelize steps 4-9 after steps 1-3 establish stable contracts and integration fixtures.
