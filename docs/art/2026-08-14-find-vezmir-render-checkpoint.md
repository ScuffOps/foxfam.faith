# Find Vezmir Cloister Render Checkpoint

Date: 2026-08-14

Status: render approval pending. Review-only candidate; not integrated.

Concept approval source:

`/Users/scuffox/.codex/generated_images/019f3cb9-9df2-7a93-a050-ed9d5a608730/exec-163d9571-ff1d-44f3-9050-e04bdb0b7d7f.png`

Merged render candidate:

`/Users/scuffox/.codex/generated_images/019f3cb9-9df2-7a93-a050-ed9d5a608730/exec-63d078f3-9283-466c-ae8d-51317cd7034a.png`

Flat-cel correction candidate:

`/Users/scuffox/.codex/generated_images/019f3cb9-9df2-7a93-a050-ed9d5a608730/exec-e710b936-784b-40e7-a823-e28b43e5ad9b.png`

SHA-256:

`981ce8195641d7b9363f83f6d269b5d592af1b985ca9ccca76d56a9ffc131596`

## Review Scope

The approved concept is the upper-right cloister panel from the four-world
board. This checkpoint tests the exact environment rendering language before
the scene is separated into gameplay planes. It preserves the central navy
constellation fountain, gold diamond obelisk, pale priory arches, planted
borders, hanging lanterns, and broad navigation paths.

The candidate is not present in `public/`, is not registered in
`gameArtManifest.js`, and does not change the live Find Vezmir route.

## Planned Three-Plane Export

- **Far background:** priory arches, wall surfaces, upper plants, lanterns, and
  distant architectural framing. This plane remains opaque and visually quiet.
- **Room midground:** floor, paths, fountain, garden beds, doors, and the stable
  interaction coordinate plane. This owns the route's gameplay geometry.
- **Near foreground:** transparent corner foliage and low stone framing only.
  It must preserve the full central lane and never cover clue or depth-control
  hotspots.

The following remain separate runtime assets and will not be baked into the
environment planes:

- clue family
- Vezmir reveal and celebration states
- depth controls and interaction prompts
- familiar companion and route UI

## Art Contract

- Stable 2:1 isometric axes across architecture, paths, beds, and fountain.
- One dominant landmark, one secondary landmark, and no more than five support
  groups.
- At least 45 percent of the active play lane remains visually quiet.
- Solid flat fills with navy `#203659` outlines.
- One hard lower-right cel shadow, with two shadow tones maximum.
- Top-left highlights only.
- No gradients, filters, texture, grain, noise, bloom, soft lighting, or color
  overlays.
- No characters, labels, controls, clues, or fake interface elements baked into
  the environment.
- Transparent scene planes must keep clean alpha and preserve their intended
  edge contact without white halo pixels.

## Approval Questions

1. Is the outline weight clean and consistent with the approved Quarters,
   Courtyard, and Starfishing environments?
2. Does the pale stone, navy water, muted greenery, and gold accent palette feel
   right for the Priory cloister?
3. Is the detail density restrained enough for clues and Vezmir to remain easy
   to spot?
4. Does the fountain-led composition read clearly as the Find Vezmir landmark?

No three-plane export, manifest registration, route integration, or approval
state change should proceed until this merged render receives explicit
stakeholder approval.

## Flat-Cel Correction Review

The correction candidate preserves the approved fountain-led composition while
reducing soft wall transitions, simplifying the beds, clarifying the 2:1 paths,
and reserving a quieter central clue lane. It remains a review-only opaque
environment render. The image has not been copied into the repository or
registered with the runtime.

The foliage still uses slightly more value variation than the strictest
collectible contract. Render approval should therefore explicitly choose one
of two outcomes:

1. approve this environment-level cel treatment and proceed to three-plane
   separation; or
2. request one further foliage-flattening pass before separation.
