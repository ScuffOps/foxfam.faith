# Game Hub Production Art Completion Matrix

Date: 2026-08-13

This matrix tracks 38 world-art slots plus 81 atomic collectible-art slots in
the complete `foxfam-asset-art-v1` delivery scope. A slot is complete only
after concept approval, authored render approval, manifest
registration, responsive integration, small-size or viewport QA, and final
system approval. Generated references and local render candidates do not count
as deployable production art.

## Approval States

- `SYSTEM APPROVED`: authored asset is in the manifest and verified in its live
  route.
- `RENDER APPROVAL PENDING`: authored asset exists outside `public/` and has
  passed mechanical art preflight, but stakeholder render approval is pending.
- `DIRECTION APPROVED`: silhouette, composition, and palette language are
  approved, but the exact production export still requires render review.
- `CONCEPT APPROVAL PENDING`: composition reference exists, but no render may be
  integrated.
- `NOT STARTED`: no approved concept or authored candidate exists yet.

## Environment And Hub Surfaces

| World | Slots | Current state | Remaining gate |
| --- | --- | --- | --- |
| Quarters | `quarters.room` composite plus retained legacy layered fallbacks | SYSTEM APPROVED | Compatible authored decor overlays remain a future customization wave |
| Priory Courtyard | `quarters.courtyard` | SYSTEM APPROVED | Final cross-route stakeholder review |
| Starfishing | `starfishing.pond` plus live Phaser rig and interaction layers | SYSTEM APPROVED | Separate near-bank foreground remains optional because the approved composite preserves the active water lane |
| Match & Merge | `match-merge.reliquary` | SYSTEM APPROVED | Final cross-route stakeholder review |
| Moonbrew Cafe | `boba-cafe.room-bg`, `boba-cafe.workstations`, `boba-cafe.counter-fg` | SYSTEM APPROVED | Final cross-route stakeholder review |
| Find Vezmir | `find-vezmir.cloister-background`, `find-vezmir.cloister-room`, `find-vezmir.cloister-foreground` | DIRECTION APPROVED; EXACT EXPORT PENDING | Review the authored three-plane export, then manifest registration and live system approval |
| Time Runner | `time-runner.clocktower` | SYSTEM APPROVED | Final cross-route stakeholder review |
| Word Garden | `word-garden.conservatory` | SYSTEM APPROVED | Final cross-route stakeholder review |

## World Props, Sprites, Collectibles, And Interactions

| World | Required families | Current state |
| --- | --- | --- |
| Quarters | Forge, wardrobe, trophy shelf, collections cabinet, familiar idle | RENDER APPROVAL PENDING; revision 02 has exact 1:1 props, a true 3:1 wall shelf, a 3:4 familiar seed, and verified transparent exports outside `public/` |
| Starfishing | Familiar fisher, Fishpedia fish family, rod/line layer, directional QTE prompts | RENDER APPROVAL PENDING; replacement 3x2 fisher and fish atlases, separate rig, and 2x2 QTE export passed alpha and forbidden-rendering QA outside `public/` |
| Match & Merge | Five offering tiers, merge burst | RENDER APPROVAL PENDING; runtime-shaped 3x2 offering atlas and transparent effect export remain outside `public/` |
| Moonbrew Cafe | Visitor familiar customers, ingredients, five drink assembly states | IN REVISION; review direction exists, but the exact 3x2, 5x4, and 5x1 runtime atlases must be complete before render approval |
| Find Vezmir | Clue family, Vezmir reveal/celebration, depth controls | RENDER APPROVAL PENDING; exact clue, reveal, and depth exports remain outside `public/` |
| Time Runner | Familiar runner strip, clock shards/Clock Brass, action prompts | RENDER APPROVAL PENDING; exact 4x1 state strip and two 2x2 atlases remain outside `public/` |
| Word Garden | Seven-petal interaction flower, bloom/Blooming Ink reward family | RENDER APPROVAL PENDING; exact flower and 4x1 bloom-family exports remain outside `public/` |

### Review-Only Runtime Candidate Evidence

The Match & Merge, Find Vezmir, Time Runner, and Word Garden candidates now have
an exact review-only manifest at
`/private/tmp/foxfam-art-review/runtime-candidate-manifest.json`. It records the
runtime slot, dimensions, SHA-256 checksum, alpha policy, and forbidden-SVG
scan result for all 13 exports. Nothing in that manifest is deployable or
runtime-resolvable; explicit render approval is still required.

- All 13 source SVGs contain no gradients, filters, opacity, patterns, masks,
  embedded images, or style attributes.
- Eleven isolated/atlas PNGs pass the strict real-alpha and transparent-border
  validator.
- Find Vezmir's `1600x900` far-background is intentionally an opaque base
  plane. Its room plane has a verified transparent border, while its foreground
  frame intentionally meets the lower canvas edge and therefore uses a
  scene-plane policy rather than the isolated-icon border policy.
- The original geometric Find Vezmir review composite is superseded by the
  authored v3 three-plane candidate. The v3 pass adds a moon-door landmark,
  reading alcove, hanging lanterns, flowering vine, ceramic planters, and shrine
  boxes while retaining hard flat fills and the shared isometric axes.
- Exact review boards remain
  `/private/tmp/foxfam-art-review/match-merge-small-size-review.png`,
  `/private/tmp/foxfam-art-review/find-vezmir-composite-v3.png`,
  `/private/tmp/foxfam-art-review/time-word/png/A-time-runner-review-board.png`,
  and
  `/private/tmp/foxfam-art-review/time-word/png/B-word-garden-review-board.png`.

## Shared Collectible System

| Family | Required production behavior | Current state |
| --- | --- | --- |
| Relic bases | 5 atomic slots: lantern, tome, faceless crest, crystal, instrument; clear theme and tier evolution | DIRECTION APPROVED; authored Votive Lantern render candidate passed alpha and 48/64/128 QA outside `public/`; exact render approval and the remaining four exports are pending |
| Relic effects | 6 atomic restrained effect slots | MANIFEST BOUNDARY COMPLETE; concept art not started |
| Charms | 34 key-specific slots with achievement provenance, game exclusives, passive/cosmetic distinction, and 48px readability | FIRST-WAVE DIRECTION APPROVED for 6 representative game charms; exact export pending; 28 concepts remain |
| Trophies | 21 key-specific slots using provenance-first silhouettes and shared archetype language | THREE ARCHETYPE DIRECTIONS APPROVED; exact export and key-specific variants pending |
| Profile frames | 5 key-specific slots with fixed avatar-safe bounds and rarity language | FIRST-WAVE CONCEPT APPROVAL PENDING for Fishpedia, Full Bloom, and Ascendant Forge; 2 remain |
| Profile particles | 9 key-specific sparse flat-accent slots | MANIFEST BOUNDARY COMPLETE; concept art not started |
| Catch effects | 1 key-specific hard-edged fishing effect slot | MANIFEST BOUNDARY COMPLETE; concept art not started |

All 81 collectible slots fail closed until concept, render, and system approval
contain complete provenance and a canonical key-specific asset path. The first
wave is specified in `2026-08-13-collectible-first-wave-concepts.md`.

The first-wave exact render checkpoint is review-only at
`/private/tmp/foxfam-art-review/collectibles-wave-1-review.png`, with exact
candidate paths and SHA-256 values in
`/private/tmp/foxfam-art-review/collectibles-wave-1-review-manifest.json`.
It covers one relic base, six achievement charms, and three trophy archetypes;
all retain their pending render/system approval states and are absent from the
runtime collectible manifest.

## Approval Infrastructure

- Approved world and collectible assets share the deployable art preflight.
- Collectible system approval requires complete concept, render, and system
  provenance plus a matching SHA-256 checksum before an asset can resolve.
- Approved collectible PNGs must be non-interlaced 8-bit alpha exports with
  genuinely transparent pixels and a fully transparent outer border. Baked
  checkerboards, opaque mattes, and edge-clipped exports fail closed.
- Relic bases, evolution treatments, and effects compose independently. An
  approved base therefore retains the current flat theme/evolution/effect
  fallback until each corresponding authored layer earns approval.
- Profile particle cosmetics render as four restrained perimeter accents rather
  than a labeled badge or full-surface overlay. They remain decorative,
  pointer-inert, and screen-reader-described.
- Current count: 12 approved world assets, 26 pending world-art slots, and 81
  pending collectible-art slots.

Run `npm run audit:game-hub` for the manifest-derived delivery snapshot. The
audit deliberately remains incomplete until every route is present and every
required world and collectible slot has full approval provenance.

## Required Verification Per Approved Wave

1. Run `foxfam-asset-art` visual review before export.
2. Validate solid fills, palette ceiling, aspect, and forbidden SVG features.
3. Keep unapproved files outside `public/assets/game-hub/`.
4. Register only explicit approvals in `gameArtManifest.js`.
5. Preserve live controls and dynamic state above decorative scene planes.
6. Verify desktop, compact desktop, and mobile framing.
7. Verify keyboard, pointer, and touch behavior after integration.
8. Verify collectible silhouettes at 48, 64, and 128 pixels where applicable.
9. Obtain final system approval in the live staged route.

Production remains untouched until every row is system approved and the final
release audit receives explicit stakeholder authorization.
