import { supabase } from "../../../api/communityClient.js";
import {
  normalizeCastTicket,
  normalizeCatchClaimResult,
} from "../server/starfishingRpcContract.js";

const START_CAST_RPC = "start_starfishing_cast";
const CLAIM_CATCH_RPC = "claim_starfishing_catch";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DUPLICATE_POLICIES = new Set(["keep", "release", "convert"]);
const RARITIES = new Set(["common", "uncommon", "rare", "epic", "mythic"]);
const CATCH_POLICIES = new Set(["none", ...DUPLICATE_POLICIES]);
const RETRYABLE_ERROR_CODES = new Set([
  "53300",
  "57014",
  "57P01",
  "57P02",
  "57P03",
  "PGRST000",
  "PGRST001",
  "PGRST002",
  "PGRST003",
]);

const ERROR_DEFINITIONS = {
  STARFISHING_AUTH_REQUIRED: {
    message: "Sign in to sync Starfishing progress.",
    retryable: false,
  },
  STARFISHING_INVALID_INPUT: {
    message: "That Starfishing request is invalid.",
    retryable: false,
  },
  STARFISHING_INVALID_RESPONSE: {
    message: "Starfishing returned an invalid response.",
    retryable: false,
  },
  STARFISHING_REQUEST_REJECTED: {
    message: "That Starfishing action could not be accepted.",
    retryable: false,
  },
  STARFISHING_TEMPORARILY_UNAVAILABLE: {
    message: "Starfishing is resting for a moment. Please try again.",
    retryable: true,
  },
  STARFISHING_REQUEST_FAILED: {
    message: "Starfishing progress could not be synced.",
    retryable: false,
  },
};

export class StarfishingProgressionError extends Error {
  constructor(code) {
    const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.STARFISHING_REQUEST_FAILED;
    super(definition.message);
    this.name = "StarfishingProgressionError";
    this.code = code in ERROR_DEFINITIONS ? code : "STARFISHING_REQUEST_FAILED";
    this.retryable = definition.retryable;
  }
}

function progressionError(code) {
  return new StarfishingProgressionError(code);
}

function isRetryableTransportError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  return RETRYABLE_ERROR_CODES.has(code) || code.startsWith("08") || !code;
}

function normalizeTransportError(error, { authenticated = false } = {}) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "PGRST301") {
    return progressionError("STARFISHING_AUTH_REQUIRED");
  }
  if (code === "42501") {
    return progressionError(
      authenticated ? "STARFISHING_REQUEST_REJECTED" : "STARFISHING_AUTH_REQUIRED",
    );
  }
  if (code === "22023" || code === "23514") {
    return progressionError("STARFISHING_REQUEST_REJECTED");
  }
  if (isRetryableTransportError(error)) {
    return progressionError("STARFISHING_TEMPORARILY_UNAVAILABLE");
  }
  return progressionError("STARFISHING_REQUEST_FAILED");
}

function requireReadClient(client) {
  if (!client || typeof client.from !== "function") {
    throw progressionError("STARFISHING_REQUEST_FAILED");
  }
  return client;
}

function requireRpcClient(client) {
  if (!client || typeof client.rpc !== "function") {
    throw progressionError("STARFISHING_REQUEST_FAILED");
  }
  return client;
}

function requireUuid(value) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw progressionError("STARFISHING_INVALID_INPUT");
  }
  return value;
}

function requireBoundedInteger(value, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw progressionError("STARFISHING_INVALID_INPUT");
  }
  return value;
}

function requireNonEmptyString(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return value;
}

function requireTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return value;
}

function requireBoolean(value) {
  if (typeof value !== "boolean") {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return value;
}

function requireSafeNumber(value, { integer = false, min = 0 } = {}) {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  const valid = typeof parsed === "number"
    && Number.isFinite(parsed)
    && parsed >= min
    && (!integer || Number.isSafeInteger(parsed));
  if (!valid) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return parsed;
}

function requireKnownValue(value, values) {
  if (!values.has(value)) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return value;
}

function normalizeRpcResponse(data, normalizer) {
  try {
    return normalizer(data);
  } catch {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
}

async function getOwnerId(client) {
  if (!client.auth || typeof client.auth.getUser !== "function") {
    throw progressionError("STARFISHING_REQUEST_FAILED");
  }
  let result;
  try {
    result = await client.auth.getUser();
  } catch (error) {
    throw normalizeTransportError(error);
  }
  if (result?.error) throw normalizeTransportError(result.error);
  const ownerId = result?.data?.user?.id;
  if (!ownerId) throw progressionError("STARFISHING_AUTH_REQUIRED");
  return ownerId;
}

async function executeRead(buildQuery) {
  let result;
  try {
    result = await buildQuery();
  } catch (error) {
    throw normalizeTransportError(error, { authenticated: true });
  }
  if (result?.error) {
    throw normalizeTransportError(result.error, { authenticated: true });
  }
  if (!Array.isArray(result?.data)) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return result.data;
}

function normalizeFishpediaRow(row) {
  return {
    fishKey: requireNonEmptyString(row?.fish_key),
    caughtCount: requireSafeNumber(row?.caught_count, { integer: true }),
    smallestSize: requireSafeNumber(row?.smallest_size, { min: Number.MIN_VALUE }),
    largestSize: requireSafeNumber(row?.largest_size, { min: Number.MIN_VALUE }),
    firstCaughtAt: requireTimestamp(row?.first_caught_at),
    lastCaughtAt: requireTimestamp(row?.last_caught_at),
  };
}

function normalizeActiveFishRow(row) {
  return requireNonEmptyString(row?.fish_key);
}

function normalizeCatchRow(row) {
  return {
    id: requireUuidResponse(row?.id),
    fishKey: requireNonEmptyString(row?.fish_key),
    size: requireSafeNumber(row?.size, { min: Number.MIN_VALUE }),
    rarity: requireKnownValue(row?.rarity, RARITIES),
    duplicate: requireBoolean(row?.duplicate),
    duplicatePolicy: requireKnownValue(row?.duplicate_policy, CATCH_POLICIES),
    caughtAt: requireTimestamp(row?.created_at),
  };
}

function requireUuidResponse(value) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return value;
}

function normalizeMaterialRow(row) {
  return {
    materialKey: requireNonEmptyString(row?.material_key),
    balance: requireSafeNumber(row?.balance, { integer: true }),
    updatedAt: requireTimestamp(row?.updated_at),
  };
}

function normalizeAchievementRow(row) {
  return {
    achievementKey: requireNonEmptyString(row?.achievement_key),
    sourceCatchId: row?.source_catch_id ? requireUuidResponse(row.source_catch_id) : null,
    sourceRewardEventId: row?.source_reward_event_id
      ? requireUuidResponse(row.source_reward_event_id)
      : null,
    unlockedAt: requireTimestamp(row?.unlocked_at),
  };
}

function normalizeTrophyRow(row) {
  const data = row?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return {
    id: requireUuidResponse(row?.id),
    trophyKey: requireNonEmptyString(row?.trophy_key),
    sourceAchievementKey: row?.source_achievement_key
      ? requireNonEmptyString(row.source_achievement_key)
      : null,
    data: { ...data },
    acquiredAt: requireTimestamp(row?.acquired_at),
  };
}

function normalizeOwnedCharmRow(row) {
  const data = row?.data;
  const source = data?.source;
  if (!data || typeof data !== "object" || Array.isArray(data)
    || !source || typeof source !== "object" || Array.isArray(source)) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return {
    id: requireUuidResponse(row?.id),
    charmKey: requireNonEmptyString(data.charm_key),
    equipped: requireBoolean(data.equipped),
    source: {
      type: requireNonEmptyString(source.type),
      key: requireNonEmptyString(source.key),
    },
  };
}

function normalizeProgression(rows) {
  const favorRows = rows.favor;
  if (favorRows.length > 1) {
    throw progressionError("STARFISHING_INVALID_RESPONSE");
  }
  return {
    activeFishKeys: rows.catalog.map(normalizeActiveFishRow),
    fishpedia: rows.fishpedia.map(normalizeFishpediaRow),
    recentCatches: rows.catches.map(normalizeCatchRow),
    favorBalance: favorRows.length === 0
      ? 0
      : requireSafeNumber(favorRows[0]?.balance, { integer: true }),
    materials: rows.materials.map(normalizeMaterialRow),
    achievements: rows.achievements.map(normalizeAchievementRow),
    trophies: rows.trophies.map(normalizeTrophyRow),
    charms: rows.charms.map(normalizeOwnedCharmRow),
  };
}

export function createStarfishingProgressionClient(client = supabase) {
  return {
    async startStarfishingCast() {
      const database = requireRpcClient(client);
      await getOwnerId(database);
      let result;
      try {
        result = await database.rpc(START_CAST_RPC);
      } catch (error) {
        if (error instanceof StarfishingProgressionError) throw error;
        throw normalizeTransportError(error, { authenticated: true });
      }
      if (result?.error) {
        throw normalizeTransportError(result.error, { authenticated: true });
      }
      return normalizeRpcResponse(result?.data, normalizeCastTicket);
    },

    async claimStarfishingCatch(input) {
      const telemetry = input?.telemetry;
      const duplicatePolicy = input?.duplicatePolicy;
      if (!DUPLICATE_POLICIES.has(duplicatePolicy)) {
        throw progressionError("STARFISHING_INVALID_INPUT");
      }
      const params = {
        claim_ticket_id: requireUuid(input?.ticketId),
        claim_idempotency_key: requireUuid(input?.idempotencyKey),
        claim_duplicate_policy: duplicatePolicy,
        claim_qte_action_count: requireBoundedInteger(telemetry?.actionCount, 0, 16),
        claim_miss_count: requireBoundedInteger(telemetry?.missCount, 0, 16),
        claim_duration_ms: requireBoundedInteger(telemetry?.durationMs, 0, 600000),
      };

      const database = requireRpcClient(client);
      await getOwnerId(database);
      let result;
      try {
        result = await database.rpc(CLAIM_CATCH_RPC, params);
      } catch (error) {
        if (error instanceof StarfishingProgressionError) throw error;
        throw normalizeTransportError(error, { authenticated: true });
      }
      if (result?.error) {
        throw normalizeTransportError(result.error, { authenticated: true });
      }
      return normalizeRpcResponse(result?.data, normalizeCatchClaimResult);
    },

    async loadStarfishingProgression() {
      const database = requireReadClient(client);
      const ownerId = await getOwnerId(database);
      const catalog = await executeRead(() => database
        .from("game_fish_catalog")
        .select("fish_key")
        .eq("active", true)
        .order("fish_key", { ascending: true }));
      const fishpedia = await executeRead(() => database
        .from("user_fishpedia")
        .select("fish_key,caught_count,smallest_size,largest_size,first_caught_at,last_caught_at")
        .eq("user_id", ownerId)
        .order("first_caught_at", { ascending: true }));
      const catches = await executeRead(() => database
        .from("game_catches")
        .select("id,fish_key,size,rarity,duplicate,duplicate_policy,created_at")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(20));
      const favor = await executeRead(() => database
        .from("currency_accounts")
        .select("currency_key,balance")
        .eq("user_id", ownerId)
        .eq("currency_key", "favor")
        .limit(1));
      const materials = await executeRead(() => database
        .from("user_material_balances")
        .select("material_key,balance,updated_at")
        .eq("user_id", ownerId)
        .order("material_key", { ascending: true }));
      const achievements = await executeRead(() => database
        .from("user_achievements")
        .select("achievement_key,source_catch_id,source_reward_event_id,unlocked_at")
        .eq("user_id", ownerId)
        .order("unlocked_at", { ascending: false }));
      const trophies = await executeRead(() => database
        .from("user_trophies")
        .select("id,trophy_key,source_achievement_key,data,acquired_at")
        .eq("user_id", ownerId)
        .order("acquired_at", { ascending: false }));
      const charms = await executeRead(() => database
        .from("user_relic_charms")
        .select("id,data")
        .eq("user_id", ownerId)
        .eq("data->>charm_key", "merciful-tide")
        .eq("data->>equipped", "true")
        .eq("data->source->>type", "achievement")
        .eq("data->source->>key", "gentle-return")
        .order("created_at", { ascending: true }));

      return normalizeProgression({
        catalog,
        fishpedia,
        catches,
        favor,
        materials,
        achievements,
        trophies,
        charms,
      });
    },
  };
}

export const starfishingProgressionClient = createStarfishingProgressionClient();

export const startStarfishingCast = (...args) => (
  starfishingProgressionClient.startStarfishingCast(...args)
);
export const claimStarfishingCatch = (...args) => (
  starfishingProgressionClient.claimStarfishingCatch(...args)
);
export const loadStarfishingProgression = (...args) => (
  starfishingProgressionClient.loadStarfishingProgression(...args)
);
