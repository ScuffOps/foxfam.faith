# Foxfam Game Hub Production Art Bible

Status: staging-only art contract. No asset enters `public/assets/game-hub`
without concept, render, and system approval.

## Visual North Star

Foxfam game art is cute anime-gacha illustration built from authored flat
shapes. It should feel warm, collectible, and socially displayable without
looking painted, filtered, generated, or mechanically geometric.

Use confident dark-navy outlines, rounded silhouettes, deliberate solid fills,
and one hard lower-right cel-shadow family. Preserve enough negative space for
characters, controls, and readable interaction targets.

## Non-Negotiable Rendering Rules

- Solid fills only. Never use gradients, texture, grain, noise, blur, bloom,
  haze, overlays, color washes, ambient occlusion, or soft shadows.
- Use `#203659` as the default outline. Outer silhouettes are thick; internal
  lines are medium weight. Ends and joins are rounded.
- Highlights are sparse, flat shapes on top-left edges only.
- Shadows are hard-edged shapes on bottom-right planes only. Use one shadow
  tone by default and never exceed two.
- Environment floors and walls share one stable 2:1 isometric axis system.
  Doors, shelves, counters, piers, signs, and furniture must align to it.
- Forms should be softly curved and hand-shaped. Avoid perfect repeated boxes,
  duplicated micro-props, and equal-detail clutter.
- Isolated sprites and collectibles require true RGBA transparency, transparent
  borders, and no white sticker halo.
- Relics and charms never receive faces. Familiar personality belongs to
  familiar sprites, not collectible objects.

## Shared Palette Roles

| Role | Base | Cel shadow | Use |
| --- | --- | --- | --- |
| Ink | `#203659` | `#172742` | linework and deep openings |
| Linen | `#F7F0E8` | `#DED2C6` | walls, cards, pale fur |
| Dusty rose | `#D9A0A7` | `#B9818C` | soft accents and upholstery |
| Moonwater | `#A9CFDD` | `#78A8B9` | water, cabinetry, glass cues |
| Sage | `#AFC59D` | `#789461` | plants and courtyard fields |
| Butter gold | `#F3CF72` | `#D4A84F` | focus, rarity, celestial marks |
| Warm wood | `#C7906F` | `#9D694F` | furniture and piers |
| Wisteria | `#B7ACDB` | `#8E80BB` | dream and constellation accents |

Each scene may add two local accent colors. A full environment should remain
under 18 meaningful fills; a collectible should remain under 12.

## Composition And Density

- One dominant landmark, one secondary landmark, and no more than five small
  supporting prop groups in a gameplay view.
- Keep the active play lane at least 45% visually quiet.
- Repeat motifs at most three times unless repetition communicates game state.
- Details must survive at the intended viewport. Remove marks that disappear
  at 1280x720 or merge at a 64-pixel icon preview.
- Decorative celestial motifs support navigation and rarity; they do not cover
  every surface.

## World Treatments

### Quarters And Relic Forge

Warm private sanctuary with one readable worktable, one Forge landmark, a
wall-aligned trophy shelf, a collections cabinet, and a familiar wardrobe.
Favor linen, dusty rose, moonwater, warm wood, and restrained sage. The center
floor remains open for the familiar. Furniture shares the room axes.

### Priory Courtyard

Garden-green world-select plaza centered on a constellation pond. Destinations
read from silhouette before labels: pier, boba cart, cloister courtyard, clock
tower, conservatory gate, and reliquary workshop. Paths connect landmarks
without tangling behind labels.

### Starfishing

Moonwater pond and compact wooden pier under a quiet celestial sky. The pond is
the dominant oval; constellation lanes are sparse. Fishing line, bobber, and
QTE prompts occupy their own layers so the environment never competes with
timing feedback.

### Match And Merge

Small reliquary sorting room with an altar-board focal plane. Offering tiers
share one evolving silhouette and gain one motif per tier. Merge feedback uses
hard starburst shapes, never glow or particles with blur.

### Moonbrew Boba Cafe

An L-shaped counter is the dominant form, with one service lane left open for
customer familiars. Limit the room to a window, moon menu emblem, three large
ingredient jars, one lantern, two stools, and up to three plants. The drink and
customer remain larger than background props.

### Find Vezmir

Layered priory cloister with three distinct depth bands. Architectural lines
remain isometric and clues use organic silhouette camouflage rather than visual
noise. Vezmir is expressive, friendly, and visibly different from clue props.

### Time Runner

Side-profile clock tower route with oversized clock hands and Roman numerals as
platforms. Background architecture stays quiet. The runner and hazards use the
highest contrast; shards use butter-gold focus accents.

### Word Garden

Small conservatory with one central seven-petal flower bed. Plant families use
simple distinct leaf silhouettes. Blooming Ink is represented by a flat dark
ink shape plus one bright botanical accent, never a simulated liquid gradient.

## Familiar Production Rules

- Use the approved expressive animal proportions and dark-navy line treatment.
- Preserve recognizable species silhouettes at 48, 64, and 128 pixels.
- Use large eyes and clear poses without white sticker outlines.
- Keep accessories modular and aligned to documented anchor points.
- Sprite strips use fixed frame bounds so tails, ears, wings, and foliage are
  never clipped between frames.

## Relic, Charm, And Trophy System

- Relic bases use one dominant silhouette and one symbolic focal motif.
- Socketed charms appear in a restrained rail or crest, never scattered around
  the relic body.
- Rarity is communicated through frame geometry, a fixed accent color, and
  star count. It is not communicated through glow stacks.
- Evolution adds one readable structural feature per tier.
- Achievement trophies lead with provenance: fish, game action, collection
  milestone, or profile accomplishment.
- Fishing mythics and completion rewards may use unique silhouettes but remain
  compatible with the same outline, palette, and cel-shadow rules.

## Export And Approval Checklist

1. Verify the asset matches its manifest slot, aspect ratio, and perspective.
2. Run `npm run test:game-art` through the repository safe npm wrapper.
3. Inspect environments at desktop and mobile viewports.
4. Inspect sprites and collectibles at 48, 64, and 128 pixels.
5. Verify RGBA alpha and transparent borders for isolated PNG assets.
6. Confirm there are no clipped subjects, unintended mattes, gradients,
   filters, embedded rasters, excess palette colors, or inconsistent axes.
7. Record concept, render, and system approval in the manifest before
   integration.

