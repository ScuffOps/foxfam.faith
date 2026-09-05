# FoxFam Aether Observatory / Motion Lab

Isolated charm-pull UI and motion study. Based on portal commit `70b116a`, not the
quarters staging work. No root app routes, dependencies, credentials, or database
state are changed. **Do not deploy this branch as the production portal.**

## Run

Node 22+ and pnpm 11 are recommended. All Remotion packages are pinned together.

```sh
cd experiments/charm-gacha-motion
pnpm install --frozen-lockfile
pnpm dev --port 5193
pnpm studio --port 5194
```

The playable preview is `http://127.0.0.1:5193/`. Studio is
`http://localhost:5194/Aether-Five-Star`. Choose preview rarity and simulated
connection behavior in Settings. The preview never spends currency; recent
moments are tab-local. Only sound/motion preferences persist on this device.

## Interaction

- Click, press Enter/Space, or drag the center lever down to 82% of its travel.
- A short/upward/canceled drag does not trigger a pull.
- Pending requests disable the lever and secondary pull button.
- Rewind/forward hands, controlled anticipation, seal projection, central reveal.
- Shared lower-rank treatment (7s), four-star Tenko (8s), five-star Eye Geas (9s).
- Skip presents the same result immediately. Reduced motion bypasses the spin.
- Original synthesized WAV cues; sound off by default, no autoplay on arrival.
- Failed/slow responses retain a request key. Settings and history are keyboard
  dialogs with focus restoration. No browser popup or new-tab surprise.

## Data Boundary

`RollSession.request(provider, signal)` validates an unknown result using Zod.
The demo provider is explicitly in `main.tsx`; it returns the selected preview
rarity and never imports `rollUserRelicCharm` or the old client-side RNG.

Before live integration, provide a server endpoint that:

1. Authenticates the canonical account and enforces the admin/live gate.
2. Uses `requestId` as a durable idempotency key, including retries after timeout.
3. Atomically determines the reward, deducts currency, and persists inventory.
4. Returns a stable roll ID and allowlisted charm presentation data.
5. Exposes reconciliation after a page reload or ambiguous network failure.

The prototype does not implement these backend guarantees. Its displayed retry
copy refers to reusing the request key, not to proven live economy integration.
Never connect the previous client-authoritative roll method to this animation.

## Layers / Timing

Registered canvas: 1500 x 1050. Clock origin `(750, 597)`. The two independent
hand groups rotate in a circular plane before its Y projection of 0.43. The
lever and gear share that origin. Background, hand groups, gear, lever, seal,
reveal rays, and returned charm are separate layers.

Reward emergence begins at frame 102 / 126 / 150 (30fps, ordinary / four / five)
and rises from `(750,597)` to `(750,287)` over 30 frames. `motionAt` is the shared,
deterministic timing function; UI and exports use the same React scene.

## Stream Exports

Three `Aether-Overlay-*` compositions omit the opaque scenery and the sample
charm. Keep those moving foreground layers above the environment plate in OBS;
the actual charm should be composited at the documented reward timing. They are
templates, not a Twitch Extension or MIU integration.

```sh
pnpm exec remotion render src/remotion.tsx Aether-Overlay-Ordinary out/ordinary.webm --codec=vp9 --pixel-format=yuva420p --image-format=png
pnpm exec remotion render src/remotion.tsx Aether-Overlay-Four-Star out/four-star.webm --codec=vp9 --pixel-format=yuva420p --image-format=png
pnpm exec remotion render src/remotion.tsx Aether-Overlay-Five-Star out/five-star.webm --codec=vp9 --pixel-format=yuva420p --image-format=png
```

Remotion Player/Studio must be used according to the applicable Remotion license;
check your organization eligibility before product launch. The preview does not
purchase or alter any license.

## Verification

```sh
pnpm build
pnpm test
# With preview running at 5193:
pnpm test:e2e
```

Browser checks cover desktop/mobile framing, all rarity timelines, canceled/full
drag, keyboard activation, skip, slow/error/retry, and reduced-motion behavior.
Output captures are in ignored `artifacts/`. On this macOS host, Chromium and
Remotion's file watcher require an appropriately permitted process launch.

Verified 2026-09-05: TypeScript and Vite production build passed; six unit tests
and five browser scenarios passed against the updated preview. All three WebM
exports contain VP9 video, Opus audio, and alpha. Browser-decoded frames retained
95-97% transparent pixels with nonblank foreground art. Use
`node scripts/verify-media.mjs` after rendering, with the preview running, to
repeat these media checks. Vite reports a non-blocking 520 kB bundle-size warning;
this lab's Player dependency is isolated from the portal bundle.

## Asset Provenance / Tool Boundaries

- `clock-floor.png`: generated in this task from the prior FoxFam clock concept;
  moving parts removed for registration. Generated image ID
  `exec-919eb328-ec3f-4813-8358-c8f29a260835`.
- `crystal.png`: user-approved generated crystal reference,
  `exec-5f813a95-d1c1-4816-b67c-39d6a77efd0f`.
- `eye-geas.png`, `tenko.png`: user-supplied brand art, preserved exactly.
- WAVs: original deterministic synthesis in `scripts/create-audio.mjs`, no
  third-party music or game samples.
- The three sample keepsakes are presentation fixtures, not a new live catalog.
- Game Studio: low-chrome game UI and playtest workflow used.
- Game Development Studio: skill read; local `game-dev` CLI was unavailable.
  No provider, GPU, or package-receipt claims are made for that tool.
- Higgsfield: preflight only. Seedance 2.5 / 4s / 720p / audio / 16:9 estimated
  26 credits; workspace had 10. No generation submitted and no credits spent.
  Proposed shot: fixed-camera clock, hands wind backward, a held beat, one clear
  golden pulse. Keep UI/reward out of generated footage; preserve deterministic
  compositing and use the approved scene as a reference when budget permits.
