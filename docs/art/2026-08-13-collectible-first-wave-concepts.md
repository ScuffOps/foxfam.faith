# Collectible Art First-Wave Concept Checkpoint

Date: 2026-08-13

Status: concept direction approved on 2026-08-13. Exact isolated production
exports still require render and live-system approval before manifest use.

Contract: `foxfam-asset-art-v1`

## Shared Production Rules

- Isolated 1:1 asset with true transparency and no white sticker edge.
- One dominant silhouette and one secondary focal detail.
- Dark navy outer line, medium internal line, rounded joins, and crisp edges.
- Solid fills only, with one hard lower-right cel-shadow shape and optional
  small top-left highlight shape.
- No faces, gradients, filters, opacity, texture, grain, glow, bloom, haze, or
  generative micro-detail.
- Maximum 12 meaningful fills. Verify every collectible at 48, 64, and 128
  pixels before render approval.
- Rarity belongs in the inventory frame and small material accents. It must not
  bury the collectible beneath orbiting decoration or repeated symbols.

## Relic Bases

| Key | Working title | Dominant silhouette | Focal motif | Production palette |
| --- | --- | --- | --- | --- |
| `lantern` | Votive Lantern | Broad tapered shrine lantern with a quiet pagoda cap | One tall blue votive flame behind clear rectangular panes | Charcoal navy, muted bronze, moon-cream, cyan-blue, pale gold |
| `tome` | Covenant Tome | Thick closed book with a gently arched spine and one clasp | Diamond vow seal crossed by a single bookmark ribbon | Deep navy, mulberry, parchment, dusty blue, antique gold |
| `mask` | Veiled Crest | Faceless ceremonial crest with a pointed upper veil and two swept side fins | One blank inset diamond; no eyes, mouth, nose, or animal face cues | Charcoal, bone-cream, muted rose, dusky violet, pale gold |
| `crystal` | Moonwater Monolith | Stable cut monolith on a low stone collar, wider at its base | One suspended crescent-shaped inclusion | Navy, mineral blue, pale cyan, sage, moon-cream |
| `instrument` | Vesper Lyre | Compact crescent lyre with a strong open center | Three straight strings meeting one small vow gem | Dark walnut, navy, dusty teal, cream, antique gold |

Relic evolution adds one controlled structural cue per tier: a stronger base
collar, a single material inlay, or one crest extension. It does not add
free-floating ornament. Equipped charms are represented by a compact socket
rail outside the base silhouette, never pasted around the relic body.

## Representative Game Charms

| Key | Source | Silhouette and motif | Effect language |
| --- | --- | --- | --- |
| `starlit-bobber` | First Starfishing achievement | Teardrop bobber capped by a four-point star and one short line loop | Uncommon cyan water band; supports `+5% Favor` |
| `shapers-knot` | Tier-four Match & Merge refinement | Symmetrical braided knot enclosing one square sigil | Epic violet-gold inlay; emits the flat `shaper-sigil` profile accent |
| `spotless-tea-bell` | Flawless Boba Cafe shift | Small counter bell with a tea-leaf striker and pearl-shaped base studs | Epic rose-teal enamel; emits sparse `boba-bubbles` profile accents |
| `vezmir-trail-pin` | Find Vezmir clear | Bent cloister trail marker with one tiny paw notch and pin stem | Uncommon sage-blue enamel; emits a restrained `paw-trail` accent |
| `clockface-shard` | Time Runner clear | One broken Roman-numeral dial wedge hanging from a small ring | Uncommon gold-blue enamel; emits sparse `clock-sparks` accents |
| `full-bloom-quill` | Completed Word Garden bloom | Broad quill whose nib opens into one seven-petal flower | Epic ink-violet and leaf-green; unlocks the `full-bloom` profile frame |

## Trophy Archetypes

The 21 authoritative trophy keys share three construction archetypes while
retaining a unique central achievement emblem.

| Archetype | Intended keys | Silhouette | Provenance treatment |
| --- | --- | --- | --- |
| First Mark | first-clear and first-action milestones | Low round medal on a short folded ribbon | One game emblem stamped into the medal |
| Flawless Crest | perfect, untouched, and chain milestones | Tall pointed crest with two restrained side tabs | One centered perfection mark plus a small game-colored base inset |
| Archive Spire | collection and mastery milestones | Compact stepped shrine-spire | A book, constellation, bloom, or forge emblem occupies the central window |

Trophy titles and unlock dates stay UI text. They are not baked into the art.

## Profile Frames

Each frame is a transparent 1:1 overlay with at least 72% unobstructed center
area. Ornament is limited to corners and the outer perimeter.

| Key | Perimeter language | Corner motif | Clear-center requirement |
| --- | --- | --- | --- |
| `fishpedia-frame` | Thin celestial archive binding with two offset page tabs | Tiny glassfin and open-book marks at opposite corners | 72% minimum |
| `full-bloom` | Slender climbing stem that resolves into seven petals across two corners | Quill nib and ink-petal pair | 72% minimum |
| `ascendant-forge` | Restrained dark-metal bevel with one gold inlay line | Small anvil diamond and forge seal | 72% minimum |

`lantern-eyed` and `unfractured-loop` remain in the authoritative manifest but
are held for wave two so the first profile-frame system can be reviewed without
five simultaneous visual languages.

## Approval Boundary

Concept approval covers only the silhouettes, motifs, proportions, and palette
families above. The first exact render checkpoints now exist outside `public/`
as isolated relic-base and charm/trophy review assets. No generated or authored
render may enter `public/` or resolve from the collectible manifest before
separate approval of those exact exports and subsequent live-system approval.

### 2026-08-14 Votive Lantern Render Candidate

An authored `Votive Lantern` SVG and transparent PNG render candidate is staged
outside `public/` at
`/private/tmp/foxfam-art-review/collectibles-wave-1/votive-lantern/`.
It uses nine flat fills plus the dark-navy line color, one hard lower-right
shadow tone per material, and no filters, gradients, opacity, texture, or
embedded raster. True-alpha exports passed transparent-border QA at 48, 64,
128, and 512 pixels. Its concept direction remains approved; exact render and
live-system approval are still pending.

### 2026-08-14 Wave 1 Exact Render Review Packet

The exact Votive Lantern, six achievement-charm candidates, and three trophy
archetype candidates are collected in the review-only board at
`/private/tmp/foxfam-art-review/collectibles-wave-1-review.png`. The matching
checksum and provenance record is
`/private/tmp/foxfam-art-review/collectibles-wave-1-review-manifest.json`.
All ten 512px RGBA candidates passed transparent-border and source checksum
verification. The manifest remains fail-closed with `runtimeIntegration=false`
and `productionTouched=false`; exact render and live-system approval remain
pending for every item shown.

## Integration Safety

The staging preflight now validates fully approved collectible files alongside
world art, including their manifest SHA-256. Relic bases, effects, and current
theme/evolution treatments also compose independently, so a base-first render
wave cannot erase still-pending effect or evolution presentation.
