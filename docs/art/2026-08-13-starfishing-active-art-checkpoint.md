# Starfishing Active-Art Checkpoint

## Scope

This bounded checkpoint covers the live art still missing from the approved
Starfishing environment:

- six-species customizable familiar fishing-pose atlas
- five distinct constellation-fish rarity silhouettes
- rod, spool, star bobber, and hook rig family
- up, right, down, and left celestial QTE medallions

The approved constellation pond remains unchanged.

## Contract Review

The initial render was rejected for glossy gradients, soft rendering, excessive
color variation, and an over-detailed mythic creature. The flattened redraw
uses bold dark-navy linework, solid fills, simplified silhouettes, and restrained
cel-shaded blocks. The mythic remains recognizably fish-shaped.

The redraw arrived with a baked checkerboard and therefore failed export review.
Adobe background removal produced a true alpha cutout. The Foxfam verifier
confirmed:

- 1672x941 PNG
- real alpha-bearing pixels
- visible and transparent pixels both present
- fully transparent outer border

## Approval Boundary

The red-panda pose approves only the pose language. Production integration
requires matching fishing poses for red panda, moon moth, celestial ermine,
cloud poodle, moss turtle, and moonwater seal in a fixed 3x2 atlas so selecting
a customized familiar never collapses to one generic species.

This is a concept/render checkpoint only. It is deliberately stored outside the
deployable `public/assets/game-hub/` tree and is not referenced by the manifest.
No asset may be split, imported, or marked approved until the user accepts the
family's silhouettes, line language, palette, and detail density.

After approval, each production export must receive transparent padding, be
reviewed at 48px, 64px, and 128px, pass the PNG transparency and border checks,
receive an exact SHA-256, and be integrated as one coherent Starfishing family.
