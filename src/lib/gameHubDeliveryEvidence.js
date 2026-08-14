export const GAME_HUB_EVIDENCE_STATUS = Object.freeze({
  verified: "verified",
  needsProof: "needs-proof",
});

const VERIFIED = GAME_HUB_EVIDENCE_STATUS.verified;
const NEEDS_PROOF = GAME_HUB_EVIDENCE_STATUS.needsProof;

export const GAME_HUB_DELIVERY_EVIDENCE = Object.freeze([
  gate(
    "playable-worlds",
    "All seven hub destinations load and expose a playable primary task.",
    VERIFIED,
    "Deployed 60/60 route and viewport playtest; full 646/646 source contract suite.",
  ),
  gate(
    "responsive-inputs",
    "Keyboard, pointer, and touch controls remain usable on desktop and mobile.",
    VERIFIED,
    "Deployed Playwright desktop-keyboard, desktop-pointer, compact, short-desktop, and mobile-touch profiles.",
  ),
  gate(
    "reward-database-boundary",
    "Favor, materials, achievements, charms, and trophies use owner-scoped server-authoritative persistence.",
    VERIFIED,
    "Isolated two-user reward smoke plus owner-switch, replay, and recovery contracts documented in the Phase 2 verification log.",
  ),
  gate(
    "collections-projection",
    "Fishpedia, Collections, profile cosmetics, achievements, trophies, and materials project authoritative state.",
    VERIFIED,
    "Projection schemas, collection surfaces, and cross-owner privacy contracts pass in the full source suite.",
  ),
  gate(
    "forge-and-equipment",
    "Relic forging, duplicate conversion, charm progression, and equipment are idempotent and achievement-safe.",
    VERIFIED,
    "Forge receipt, repair, recipe, equipment, and protected-collectible contracts pass in the full source suite.",
  ),
  gate(
    "familiar-customization",
    "Familiar selection persists safely and projects into the hub and minigames.",
    VERIFIED,
    "Familiar schema, wardrobe, public projection, clipping, and game-integration contracts pass.",
  ),
  gate(
    "accessibility-playtest",
    "The staged hub passes accessibility, overflow, visibility, and interaction playtests.",
    VERIFIED,
    "Deployed 60/60 Playwright sweep includes Axe, overflow, asset-response, and primary-interaction checks.",
  ),
  gate(
    "preview-isolation",
    "Preview deployment and Supabase boundaries reject production targets.",
    VERIFIED,
    "Preview bundle contains the isolated project ref and excludes the known live ref; deployment wrapper rejects production and alias operations.",
  ),
  gate(
    "authenticated-preview-projection",
    "A signed-in user completes and claims a reward through the current Vercel preview, then sees it in Collections and Profile.",
    VERIFIED,
    "Authenticated browser smoke passed on the current isolated Vercel preview: Word Garden awarded 4 Favor, Blooming Ink, two achievements, two charms, and two trophies, then Collections and Profile projected that state. The exact disposable staging user and all checked user-owned rows were deleted afterward.",
  ),
  gate(
    "final-stakeholder-release",
    "Every art wave and the complete staged experience have final stakeholder approval for release.",
    NEEDS_PROOF,
    "Render approvals, integrated-system art approvals, and final production release authorization remain pending.",
  ),
]);

function gate(id, requirement, status, evidence) {
  return Object.freeze({ id, requirement, status, evidence });
}

export function isVerifiedGameHubEvidence(gateEntry) {
  return gateEntry?.status === GAME_HUB_EVIDENCE_STATUS.verified
    && typeof gateEntry.evidence === "string"
    && gateEntry.evidence.trim().length > 0;
}
