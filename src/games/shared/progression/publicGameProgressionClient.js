import { supabase } from "../../../api/communityClient.js";

const PUBLIC_PROGRESSION_RPC = "load_public_game_progression";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const RARITIES = new Set(["common", "uncommon", "rare", "epic", "mythic"]);
const TIERS = new Set(["dormant", "awakened", "exalted", "ascendant"]);
const ROOT_KEYS = new Set([
  "profile_user_id",
  "fishpedia",
  "equipped_charms",
  "trophies",
  "cosmetics",
]);

function publicProgressionError(message) {
  const error = new Error(message);
  error.name = "PublicGameProgressionError";
  return error;
}

function requireUuid(value, message = "Player collection could not be displayed.") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw publicProgressionError(message);
  }
  return value;
}

function requireObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return value;
}

function requireKeys(value, allowedKeys) {
  const object = requireObject(value);
  if (Object.keys(object).some((key) => !allowedKeys.has(key))) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return object;
}

function requireInteger(value, min, max = Number.MAX_SAFE_INTEGER) {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return parsed;
}

function requireDisplayText(value, maxLength = 80) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return value;
}

function requireSlug(value, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !SLUG_PATTERN.test(value)) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return value;
}

function requireTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return value;
}

function normalizeFishpedia(value) {
  const fishpedia = requireKeys(value, new Set([
    "discovered_count",
    "catalog_count",
    "completion_percent",
    "total_catches",
  ]));
  const discoveredCount = requireInteger(fishpedia.discovered_count, 0);
  const catalogCount = requireInteger(fishpedia.catalog_count, 0);
  if (discoveredCount > catalogCount) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return {
    discoveredCount,
    catalogCount,
    completionPercent: requireInteger(fishpedia.completion_percent, 0, 100),
    totalCatches: requireInteger(fishpedia.total_catches, 0),
  };
}

function normalizeCharm(value) {
  const charm = requireKeys(value, new Set([
    "id",
    "charm_key",
    "label",
    "rarity",
    "slot",
    "star",
    "tier",
    "source",
  ]));
  const source = requireKeys(charm.source, new Set(["type", "key"]));
  if (!RARITIES.has(charm.rarity) || !TIERS.has(charm.tier)) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return {
    id: requireUuid(charm.id),
    charmKey: requireSlug(charm.charm_key),
    label: requireDisplayText(charm.label),
    rarity: charm.rarity,
    slot: requireSlug(charm.slot),
    star: requireInteger(charm.star, 0, 3),
    tier: charm.tier,
    source: {
      type: requireSlug(source.type),
      key: requireSlug(source.key, { nullable: true }),
    },
  };
}

function normalizeTrophy(value) {
  const trophy = requireKeys(value, new Set([
    "trophy_key",
    "title",
    "source_achievement_key",
    "acquired_at",
  ]));
  return {
    trophyKey: requireSlug(trophy.trophy_key),
    title: requireDisplayText(trophy.title),
    sourceAchievementKey: requireSlug(trophy.source_achievement_key, { nullable: true }),
    acquiredAt: requireTimestamp(trophy.acquired_at),
  };
}

function normalizeCosmetics(value) {
  const cosmetics = requireKeys(value, new Set(["profile_frame", "profile_particle"]));
  return {
    profileFrame: requireSlug(cosmetics.profile_frame, { nullable: true }),
    profileParticle: requireSlug(cosmetics.profile_particle, { nullable: true }),
  };
}

function normalizeProjection(value) {
  const projection = requireKeys(value, ROOT_KEYS);
  if (!Array.isArray(projection.equipped_charms) || !Array.isArray(projection.trophies)) {
    throw publicProgressionError("Player collection could not be displayed.");
  }
  return {
    profileUserId: requireUuid(projection.profile_user_id),
    fishpedia: normalizeFishpedia(projection.fishpedia),
    equippedCharms: projection.equipped_charms.map(normalizeCharm),
    trophies: projection.trophies.map(normalizeTrophy),
    cosmetics: normalizeCosmetics(projection.cosmetics),
  };
}

async function requireViewer(client) {
  if (!client?.auth || typeof client.auth.getUser !== "function") {
    throw publicProgressionError("Player collections are resting for a moment.");
  }
  let result;
  try {
    result = await client.auth.getUser();
  } catch {
    throw publicProgressionError("Player collections are resting for a moment.");
  }
  if (result?.error) {
    throw publicProgressionError("Player collections are resting for a moment.");
  }
  if (!result?.data?.user?.id) {
    throw publicProgressionError("Sign in to view player collections.");
  }
}

export function createPublicGameProgressionClient(client = supabase) {
  return {
    async loadPublicGameProgression(profileUserId) {
      const targetId = requireUuid(
        profileUserId,
        "Player profile could not be identified.",
      );
      await requireViewer(client);
      if (!client || typeof client.rpc !== "function") {
        throw publicProgressionError("Player collections are resting for a moment.");
      }

      let result;
      try {
        result = await client.rpc(PUBLIC_PROGRESSION_RPC, {
          profile_user_id: targetId,
        });
      } catch {
        throw publicProgressionError("Player collections are resting for a moment.");
      }
      if (result?.error) {
        throw publicProgressionError("Player collections are resting for a moment.");
      }
      return normalizeProjection(result?.data);
    },
  };
}

export const publicGameProgressionClient = createPublicGameProgressionClient();

export const loadPublicGameProgression = (...args) => (
  publicGameProgressionClient.loadPublicGameProgression(...args)
);
