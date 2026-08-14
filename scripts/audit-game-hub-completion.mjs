import { pathToFileURL } from "node:url";

import { GAME_ART_APPROVAL, GAME_ART_SLOTS } from "../src/games/shared/art/gameArtManifest.js";
import {
  COLLECTIBLE_ART_SLOTS,
  isApprovedCollectibleArtSlot,
} from "../src/components/relics/collectibleArtManifest.js";
import { GAME_WORLD_ORDER, HUB_UNLOCK_STATES } from "../src/lib/gameHubCatalog.js";
import {
  GAME_HUB_DELIVERY_EVIDENCE,
  isVerifiedGameHubEvidence,
} from "../src/lib/gameHubDeliveryEvidence.js";
import { SANCTUARY_NAV_ITEMS } from "../src/lib/sanctuaryNavigation.js";

export function buildGameHubCompletionAudit({
  worlds = GAME_WORLD_ORDER,
  navItems = SANCTUARY_NAV_ITEMS,
  worldArtSlots = GAME_ART_SLOTS,
  collectibleArtSlots = COLLECTIBLE_ART_SLOTS,
  deliveryEvidence = GAME_HUB_DELIVERY_EVIDENCE,
} = {}) {
  const navRoutes = new Set(navItems.map(({ path }) => path));
  const worldRows = worlds.map((world) => {
    const artSlots = worldArtSlots.filter((slot) => slot.worldKey === world.key);
    const approvedArt = artSlots.filter((slot) => slot.approval === GAME_ART_APPROVAL.approved);
    const pendingArt = artSlots.filter((slot) => slot.approval !== GAME_ART_APPROVAL.approved);
    return Object.freeze({
      key: world.key,
      label: world.shortLabel || world.label,
      route: world.route,
      isOpen: world.status === HUB_UNLOCK_STATES.open,
      hasSanctuaryRoute: navRoutes.has(world.route),
      art: Object.freeze({
        total: artSlots.length,
        approved: approvedArt.length,
        pending: pendingArt.length,
        pendingIds: Object.freeze(pendingArt.map(({ id }) => id)),
      }),
    });
  });

  const approvedWorldArt = worldArtSlots.filter((slot) => slot.approval === GAME_ART_APPROVAL.approved);
  const pendingWorldArt = worldArtSlots.filter((slot) => slot.approval !== GAME_ART_APPROVAL.approved);
  const approvedCollectibles = collectibleArtSlots.filter(isApprovedCollectibleArtSlot);
  const pendingCollectibles = collectibleArtSlots.filter((slot) => !isApprovedCollectibleArtSlot(slot));
  const pendingCollectiblesByKind = Object.freeze(Object.fromEntries(
    [...new Set(pendingCollectibles.map(({ kind }) => kind))]
      .sort()
      .map((kind) => [kind, pendingCollectibles.filter((slot) => slot.kind === kind).length]),
  ));
  const verifiedDeliveryEvidence = deliveryEvidence.filter(isVerifiedGameHubEvidence);
  const pendingDeliveryEvidence = deliveryEvidence.filter((entry) => !isVerifiedGameHubEvidence(entry));

  const requirements = Object.freeze({
    allWorldsOpen: worldRows.every(({ isOpen }) => isOpen),
    allWorldsInSanctuaryNavigation: worldRows.every(({ hasSanctuaryRoute }) => hasSanctuaryRoute),
    allWorldArtApproved: pendingWorldArt.length === 0,
    allCollectibleArtApproved: pendingCollectibles.length === 0,
    allDeliveryEvidenceVerified: deliveryEvidence.length > 0 && pendingDeliveryEvidence.length === 0,
  });

  return Object.freeze({
    complete: Object.values(requirements).every(Boolean),
    requirements,
    worlds: Object.freeze(worldRows),
    worldArt: Object.freeze({
      total: worldArtSlots.length,
      approved: approvedWorldArt.length,
      pending: pendingWorldArt.length,
      pendingIds: Object.freeze(pendingWorldArt.map(({ id }) => id)),
    }),
    collectibleArt: Object.freeze({
      total: collectibleArtSlots.length,
      approved: approvedCollectibles.length,
      pending: pendingCollectibles.length,
      pendingByKind: pendingCollectiblesByKind,
    }),
    deliveryEvidence: Object.freeze({
      total: deliveryEvidence.length,
      verified: verifiedDeliveryEvidence.length,
      pending: pendingDeliveryEvidence.length,
      pendingIds: Object.freeze(pendingDeliveryEvidence.map(({ id }) => id)),
      gates: Object.freeze(deliveryEvidence),
    }),
  });
}

export function formatGameHubCompletionAudit(audit) {
  const lines = [
    `Foxfam game-hub delivery audit: ${audit.complete ? "COMPLETE" : "INCOMPLETE"}`,
    `World routes: ${audit.worlds.filter(({ hasSanctuaryRoute }) => hasSanctuaryRoute).length}/${audit.worlds.length}`,
    `World art: ${audit.worldArt.approved}/${audit.worldArt.total} approved (${audit.worldArt.pending} pending)`,
    `Collectible art: ${audit.collectibleArt.approved}/${audit.collectibleArt.total} approved (${audit.collectibleArt.pending} pending)`,
    `Delivery evidence: ${audit.deliveryEvidence.verified}/${audit.deliveryEvidence.total} verified (${audit.deliveryEvidence.pending} pending)`,
  ];
  for (const world of audit.worlds) {
    lines.push(
      `- ${world.label}: ${world.hasSanctuaryRoute && world.isOpen ? "route ready" : "route gap"}; ${world.art.approved}/${world.art.total} art approved`,
    );
  }
  for (const gateEntry of audit.deliveryEvidence.gates) {
    lines.push(`- ${gateEntry.id}: ${isVerifiedGameHubEvidence(gateEntry) ? "verified" : "needs proof"}`);
  }
  return lines.join("\n");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const audit = buildGameHubCompletionAudit();
  if (process.argv.includes("--json")) console.log(JSON.stringify(audit, null, 2));
  else console.log(formatGameHubCompletionAudit(audit));
  if (process.argv.includes("--require-complete") && !audit.complete) process.exitCode = 1;
}
