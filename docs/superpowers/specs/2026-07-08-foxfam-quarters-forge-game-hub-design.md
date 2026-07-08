# Foxfam Quarters / Forge Game Hub Design

## Goal

Build the Foxfam HTML5 minigame hub as a coherent portal metagame, not a pile of isolated toys. The first playable surface is the player's Quarters / Forge Hub, with each later minigame feeding Favor, forge materials, charms, trophies, decor, profile cosmetics, and lore progress back into that home base.

## Current Anchors

- Real workspace: `/Users/scuffox/Documents/Codex/FoxfamPortal/foxfam.faith`.
- Active branch: `deploy-login-fixed-c218`.
- App stack: Vite, React, React Router, Tailwind, shadcn/Radix UI, Supabase entity wrapper.
- Existing routes include `/profile`, `/relic-forge`, `/reliquary`, `/codex`, `/shrine`, and Staff Ops.
- Existing economy anchor is Favor through `src/hooks/usePoints.js`.
- Existing relic/charm anchors are `src/lib/relicService.js`, `src/lib/relicCharms.js`, and `src/components/relics/*`.
- Relic rolling is intentionally gated through `loadRelicRollGate()` and must not be bypassed casually.
- `phaser` is not installed yet; Phaser should be added when the first canvas minigame implementation begins.

## Product Shape

﹒▰▰▰﹒Q U A R T E R S ⨯ F O R G E  H U B﹒┆

ꪆ﹒Personal Quarters ··⨯  
The player's private home base for all minigames. It shows the decorated room, active charm loadout, trophy shelf, Fishpedia tank/shelf, forge material storage, guestbook, and visitor affordances.

ꪆ﹒Priory / Cathedral / Shrine Courtyard ··⨯  
The travel hub and world map. It should feel like a cozy isometric courtyard with gates to each game area:

- Quarters / Forge Hub
- Starfishing pier or observatory pond
- Reliquary Match & Merge bench
- Boba Shop Cafe
- Cloister puzzle board for Find Vezmir
- Clocktower gate for the time side-scroller
- Chapel word board for Community Wordle

ꪆ﹒Relic Forge Room ··⨯  
The main progression room. Players level up charms, combine duplicates, convert excess items into Favor or forge dust, craft profile frames, and equip passive or visual effects. Forge actions must be capped and server-authoritative in Phase 2.

## Visual Direction

﹒▰▰▰﹒A R T ⨯ S T Y L E﹒┆

ꪆ﹒Core Look ··⨯  
Cozy isometric, flat anime-style smooth vector, warm tactile UI, soft celestial accents, readable silhouettes, dark/navy internal outlines, and restrained glow. The world can use pastel interiors and garden greens, while Starfishing and cosmic reward states can lean into deeper blues, violets, cyan, and warm gold.

ꪆ﹒Relic / Charm Guardrails ··⨯  
No cute faces on relic or charm icons. No white sticker halo edges around relic/charm art. Use symbol, silhouette, material, glow, and lore shape instead.

ꪆ﹒UI Guardrails ··⨯  
Use DOM for text-heavy surfaces and Phaser canvas for playfields. Keep persistent HUD compact. Menus should feel like cozy game UI, not a SaaS dashboard. Mobile must receive first-class touch targets.

## Reward Economy

﹒▰▰▰﹒R E W A R D ⨯ E C O N O M Y﹒┆

ꪆ﹒Favor ··⨯  
Portal-side currency gained through capped, validated gameplay. Phase 1 may simulate Favor locally. Phase 2 must grant Favor through server-side validation or narrow RPCs, not direct Phaser/client writes.

Sources:

- minigame completion
- duplicate fish release
- daily or weekly puzzle completion
- achievement unlocks
- community Wordle participation
- visitor/social actions with anti-spam caps

ꪆ﹒Forge Materials ··⨯  
Shared material families feed charm upgrades and decor crafting:

- Star Glass
- Moonwax
- Charm Cord
- Sigil Shards
- Pearl Resin
- Hymn Ink
- Clock Brass
- Catnip Silver
- Vezmir Thread

ꪆ﹒Duplicate Conversion ··⨯  
Players choose what happens to duplicates:

- keep for collection statistics
- release/dissolve for Favor
- convert into forge dust
- sacrifice duplicate charms into tier/star progress

ꪆ﹒Bonus Rules ··⨯  
Equipped charms and relics can provide small passive bonuses. Daily cosmic weather can provide transparent random multipliers. Final reward math must be capped and calculated server-side in Phase 2.

## Charm / Trophy Taxonomy

﹒▰▰▰﹒C H A R M S ⨯ T R O P H I E S﹒┆

ꪆ﹒Cosmetic Relic FX ··⨯  
Pure flexing. Examples: animated candles, corrupted crowns, celestial butterflies, floating sigils, candle smoke, soft constellation motes.

Effects:

- profile particles
- hover FX
- glowing borders
- profile aura
- Quarters display ambience

ꪆ﹒Passive Bonus Charms ··⨯  
Small capped bonuses that never invalidate skill. Examples: +2 percent duplicate release Favor, +3 percent forge material drops, +1 reroll per day for Match & Merge, slightly wider QTE timing window for common Starfishing catches.

ꪆ﹒Profile Frame Charms ··⨯  
Achievement-backed visual frames for profile cards, guestbook entries, and later Twitch extension identity surfaces.

ꪆ﹒Game-Only Mythics ··⨯  
Rare trophies from mastery milestones. Examples: complete Fishpedia, catch a mythic constellation fish, perfect a Boba rush, finish a clocktower shard run without falling, solve a full week of Wordles.

## Game Order And MVP Scope

﹒▰▰▰﹒G A M E ⨯ O R D E R﹒┆

ꪆ﹒01 · Quarters / Forge Hub ··⨯  
MVP: route, responsive hub view, Quarters scene panel, forge overview, charm/trophy placeholders backed by local content config, reward ledger mock, world gate list.

ꪆ﹒02 · Starfishing ··⨯  
Phaser playfield with cast, bite, QTE reeling, rarity-scaled timing/combos, catch result modal, fishpedia silhouettes, duplicate keep/release choice, achievement charm unlocks.

ꪆ﹒03 · Match & Merge ··⨯  
Grid puzzle for forge materials. Match three to refine materials, merge identical evolved materials, trigger shrine bonuses, earn forge dust and material families.

ꪆ﹒04 · Boba Shop Cafe ··⨯  
Cozy order-service loop. Assemble drinks, time service windows, satisfy quirky Priory customers, earn Pearl Resin, Moon Syrup, Favor, and cafe trophies.

ꪆ﹒05 · Puzzle Game ··⨯  
Find the cat / Find Vezmir hidden-object or logic puzzle. Reward Catnip Silver, Vezmir Thread, profile frames, and discovery trophies.

ꪆ﹒06 · Time Side-Scroller ··⨯  
Phaser side-scroller through a clocktower. Collect shards of a clock face, platform on clock hands and roman numerals, avoid pendulum/time hazards, earn Clock Brass and time-themed charms.

ꪆ﹒07 · Community Wordle ··⨯  
Daily word puzzle usable inside the portal and later as a Twitch extension. Shared daily seed, spoiler-safe participation, streaks, chapel board cosmetics, and community reward caps.

## Architecture

﹒▰▰▰﹒A R C H I T E C T U R E﹒┆

ꪆ﹒React Shell ··⨯  
React owns routes, Quarters/Forge UI, inventories, Fishpedia, charm equipment, reward choice modals, settings, accessibility, and mobile layout.

ꪆ﹒Phaser Playfields ··⨯  
Phaser owns Starfishing, side-scroller, and any action-heavy playfield rendering. Scenes stay thin: they render simulation state and emit actions.

ꪆ﹒Simulation Modules ··⨯  
Game rules, reward previews, achievement checks, duplicate conversion, QTE definitions, puzzle state, and saveable state live outside Phaser scenes.

ꪆ﹒Reward Boundary ··⨯  
Phase 1 stores game progress locally with schema-shaped mocks. Phase 2 adds Supabase tables/RPCs and server-side idempotency keys for Favor, materials, fish records, charms, and trophies.

## Required Data Contracts

﹒▰▰▰﹒D A T A ⨯ C O N T R A C T S﹒┆

ꪆ﹒PlayerGameProfile ··⨯  
Stores unlocked worlds, active charm loadout, daily caps, tutorial state, and preferred game settings.

ꪆ﹒PlayerQuarters ··⨯  
Stores room theme, placed decor, trophy shelf layout, visitor settings, and featured collection displays.

ꪆ﹒InventoryItem / ForgeMaterial ··⨯  
Stores material counts, item rarity, source game, and conversion rules.

ꪆ﹒AchievementCharm ··⨯  
Extends or complements `user_relic_charms` with source game, achievement key, effect type, rarity, stars, equipped state, and upgrade progress.

ꪆ﹒RewardEvent Ledger ··⨯  
Append-only server-side record of validated game rewards. Must include user, source game, idempotency key, reward payload, cap bucket, and created timestamp.

ꪆ﹒FishpediaRecord ··⨯  
Stores per-fish caught status, count, biggest size, smallest size, rarity, first catch date, and silhouette unlock state.

ꪆ﹒DailyWordPuzzle ··⨯  
Stores daily seed, puzzle date, answer hash or server-only answer, portal result summaries, and Twitch-safe public aggregate state.

## Security And Integrity

﹒▰▰▰﹒S E C U R I T Y ⨯ R L S﹒┆

ꪆ﹒Phase 1 ··⨯  
Prototype local saves and mock rewards are allowed, but the UI must label them as local/prototype state where needed.

ꪆ﹒Phase 2 ··⨯  
Supabase/RPC owns real reward grants, Favor conversion, charm grants, forge upgrades, and daily caps. RLS must restrict users to their own game profile, inventory, records, and Quarters while allowing safe public visitor reads.

ꪆ﹒Anti-Abuse ··⨯  
Use idempotency keys, daily caps, cooldowns, server-side reward math, and source-game validation. Never trust a client-submitted score as a final reward amount.

Recommended RPCs:

- `claim_game_reward(game_key text, event_id text, payload jsonb)`
- `spend_favor(transaction_key text, amount int, sink_type text, payload jsonb)`
- `roll_relic_charm(source_key text, source_event_id text, payload jsonb)`
- `equip_game_charm(charm_id uuid, equipped boolean)`

## Staging

﹒▰▰▰﹒S T A G I N G ⨯ R U L E S﹒┆

ꪆ﹒Phase 1 · Local Prototype ··⨯  
Build Quarters/Forge Hub and Starfishing first with local/mock persistence. Prove the visual language, reward UX, duplicate conversion, achievement charm taxonomy, and mobile/desktop game feel.

ꪆ﹒Phase 2 · Portal Integration ··⨯  
Add Supabase-backed persistence, RLS, server-authoritative Favor/material/charm grants, profile/Fishpedia integration, and shared reward contracts.

ꪆ﹒July 13 Finish Rule ··⨯  
If Phase 2 is not complete by July 13, 2026, resume and finish the Phase 2 approach rather than continuing to expand scope.

## Approval Gate

Implementation should begin only after this design and the linked implementation plan are reviewed. The first implementation lane should be Quarters / Forge Hub foundation, followed by Starfishing.
