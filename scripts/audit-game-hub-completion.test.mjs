import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TROPHY_CATALOG } from "../src/components/relics/trophyPresentation.js";

import {
  buildGameHubCompletionAudit,
  formatGameHubCompletionAudit,
} from "./audit-game-hub-completion.mjs";

test("the current staging audit reports exact approval debt without claiming completion", () => {
  const audit = buildGameHubCompletionAudit();

  assert.equal(audit.worlds.length, 7);
  assert.equal(audit.requirements.allWorldsOpen, true);
  assert.equal(audit.requirements.allWorldsInSanctuaryNavigation, true);
  assert.deepEqual(
    { total: audit.worldArt.total, approved: audit.worldArt.approved, pending: audit.worldArt.pending },
    { total: 38, approved: 12, pending: 26 },
  );
  assert.deepEqual(
    { total: audit.collectibleArt.total, approved: audit.collectibleArt.approved, pending: audit.collectibleArt.pending },
    { total: 81, approved: 0, pending: 81 },
  );
  assert.deepEqual(
    { total: audit.deliveryEvidence.total, verified: audit.deliveryEvidence.verified, pending: audit.deliveryEvidence.pending },
    { total: 10, verified: 9, pending: 1 },
  );
  assert.deepEqual(audit.deliveryEvidence.pendingIds, [
    "final-stakeholder-release",
  ]);
  assert.equal(audit.complete, false);
  assert.match(formatGameHubCompletionAudit(audit), /INCOMPLETE/);
});

test("collectible art planning documents track the authoritative trophy count", () => {
  const firstWave = readFileSync(new URL("../docs/art/2026-08-13-collectible-first-wave-concepts.md", import.meta.url), "utf8");
  const completionMatrix = readFileSync(new URL("../docs/art/game-hub-production-art-completion-matrix.md", import.meta.url), "utf8");

  assert.match(firstWave, new RegExp(`The ${TROPHY_CATALOG.length} authoritative trophy keys`));
  assert.match(completionMatrix, new RegExp(`\\| Trophies \\| ${TROPHY_CATALOG.length} key-specific slots`));
});

test("a missing Sanctuary destination fails the route requirement", () => {
  const audit = buildGameHubCompletionAudit({
    worlds: [{ key: "quarters", label: "Quarters", route: "/quarters", status: "open" }],
    navItems: [],
    worldArtSlots: [],
    collectibleArtSlots: [],
    deliveryEvidence: [{ id: "test", status: "verified", evidence: "test evidence" }],
  });

  assert.equal(audit.requirements.allWorldsInSanctuaryNavigation, false);
  assert.equal(audit.complete, false);
});

test("completion requires open routes and fully approved world and collectible art", () => {
  const approval = {
    concept: { state: "approved", by: "scuffox", at: "2026-08-13", evidence: "concept" },
    render: { state: "approved", by: "scuffox", at: "2026-08-13", evidence: "render" },
    system: { state: "approved", by: "scuffox", at: "2026-08-13", evidence: "system" },
  };
  const audit = buildGameHubCompletionAudit({
    worlds: [{ key: "quarters", label: "Quarters", route: "/quarters", status: "open" }],
    navItems: [{ path: "/quarters" }],
    worldArtSlots: [{ id: "quarters.room", worldKey: "quarters", approval: "approved" }],
    collectibleArtSlots: [{
      artContract: "foxfam-asset-art-v1",
      kind: "charm",
      key: "test-charm",
      assetPath: "/assets/game-hub/collectibles/charms/test-charm.svg",
      sha256: "a".repeat(64),
      approval,
    }],
    deliveryEvidence: [{ id: "release", status: "verified", evidence: "verified release" }],
  });

  assert.equal(audit.complete, true);
  assert.match(formatGameHubCompletionAudit(audit), /COMPLETE/);
});

test("completion fails closed when any functional delivery gate lacks proof", () => {
  const audit = buildGameHubCompletionAudit({
    worlds: [{ key: "quarters", label: "Quarters", route: "/quarters", status: "open" }],
    navItems: [{ path: "/quarters" }],
    worldArtSlots: [],
    collectibleArtSlots: [],
    deliveryEvidence: [{ id: "authenticated-preview", status: "needs-proof", evidence: "Email confirmation remains enabled." }],
  });

  assert.equal(audit.requirements.allDeliveryEvidenceVerified, false);
  assert.deepEqual(audit.deliveryEvidence.pendingIds, ["authenticated-preview"]);
  assert.equal(audit.complete, false);
});
