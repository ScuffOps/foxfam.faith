import { communityClient, supabase } from "../api/communityClient.js";
import { normalizeCharm, normalizeRelic } from "./relicCharms.js";

export const RELIC_ROLL_GATE_KEY = "relic_roll_gate";
export const RELIC_ROLL_LOCK_REASON = "Relic charms are locked until Veri opens the forge.";

const DEFAULT_RELIC_ROLL_GATE = {
  key: RELIC_ROLL_GATE_KEY,
  enabled: false,
  status: "closed",
  reason: RELIC_ROLL_LOCK_REASON,
  source: "admin-toggle",
};

function normalizeRelicRollGate(row = {}) {
  return {
    id: row.id || "",
    ...DEFAULT_RELIC_ROLL_GATE,
    ...(row || {}),
    enabled: Boolean(row?.enabled),
    status: row?.enabled ? "open" : "closed",
    reason: row?.reason || (row?.enabled ? "The relic forge is open." : RELIC_ROLL_LOCK_REASON),
  };
}

function isRelicRollGate(row) {
  return [row?.key, row?.name, row?.type].includes(RELIC_ROLL_GATE_KEY);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELIC_PAYLOAD_KEYS = ["name", "base_type", "theme", "lore", "effects"];

function requireRpcClient(client) {
  if (!client || typeof client.rpc !== "function") {
    throw new Error("Relic service is unavailable.");
  }
  return client;
}

function requireUuid(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
  return normalized;
}

function normalizeRpcError(error, fallbackMessage) {
  const normalized = new Error(
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : fallbackMessage,
  );
  normalized.name = "RelicServiceError";
  normalized.code = error?.code || "RELIC_ACTION_FAILED";
  return normalized;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} returned an invalid response.`);
  }
  return value;
}

function makeRelicPayload(relic) {
  const source = requireObject(relic, "Relic");
  return Object.fromEntries(RELIC_PAYLOAD_KEYS.map((key) => [key, source[key]]));
}

export function createRelicService(client = supabase) {
  const rpcClient = () => requireRpcClient(client);

  return {
    async ensureRelic() {
      const { data, error } = await rpcClient().rpc("ensure_user_relic");
      if (error) throw normalizeRpcError(error, "Relic could not be created.");
      return normalizeRelic(requireObject(data, "Relic"));
    },

    async saveRelic(relic, requestId) {
      const { data, error } = await rpcClient().rpc("save_user_relic_with_favor", {
        relic_payload: makeRelicPayload(relic),
        request_id: requireUuid(requestId, "Relic request"),
      });
      if (error) throw normalizeRpcError(error, "Relic could not be saved.");
      const result = requireObject(data, "Relic save");
      const favor = requireObject(result.favor, "Relic Favor");
      if (!Number.isSafeInteger(favor.delta) || !Number.isSafeInteger(favor.balance) || favor.balance < 0) {
        throw new Error("Relic save returned an invalid Favor response.");
      }
      return {
        replayed: Boolean(result.replayed),
        relic: normalizeRelic(requireObject(result.relic, "Relic")),
        favor: {
          delta: favor.delta,
          balance: favor.balance,
        },
      };
    },

    async rollCharm(requestId) {
      const { data, error } = await rpcClient().rpc("roll_user_relic_charm", {
        request_id: requireUuid(requestId, "Charm roll request"),
      });
      if (error) throw normalizeRpcError(error, "Charm roll failed.");
      return normalizeCharm(requireObject(data, "Charm roll"));
    },

    async setCharmEquipped(charmId, equipped) {
      const { data, error } = await rpcClient().rpc("equip_user_relic_charm", {
        charm_id: requireUuid(charmId, "Charm"),
        equipped: Boolean(equipped),
      });
      if (error) throw normalizeRpcError(error, "Charm could not be equipped.");
      if (!Array.isArray(data)) throw new Error("Charm equip returned an invalid response.");
      return data.map(normalizeCharm);
    },

    async setFavored(levelId, favored, title) {
      const { data, error } = await rpcClient().rpc("set_user_level_favored", {
        level_id: requireUuid(levelId, "Favor level"),
        favored: Boolean(favored),
        title: typeof title === "string" ? title.trim() : "",
      });
      if (error) throw normalizeRpcError(error, "Favored metadata could not be saved.");
      return requireObject(data, "Favored metadata");
    },
  };
}

export const relicService = createRelicService();

export async function loadRelicRollGate() {
  const rows = await communityClient.entities.SyncState.list("-updated_date", 100).catch(() => []);
  return normalizeRelicRollGate(rows.find(isRelicRollGate));
}

export async function setRelicRollGate({ enabled, reason = "" } = {}) {
  await communityClient.auth.me();
  const currentGate = await loadRelicRollGate();
  const payload = {
    key: RELIC_ROLL_GATE_KEY,
    enabled: Boolean(enabled),
    status: enabled ? "open" : "closed",
    reason: String(reason || "").trim() || (enabled ? "The relic forge is open." : RELIC_ROLL_LOCK_REASON),
    source: "admin-toggle",
    updated_at: new Date().toISOString(),
  };

  const saved = currentGate.id
    ? await communityClient.entities.SyncState.update(currentGate.id, payload)
    : await communityClient.entities.SyncState.create(payload);

  return normalizeRelicRollGate(saved);
}

export async function getOrCreateUserRelic() {
  await communityClient.auth.me();
  return relicService.ensureRelic();
}

export async function saveUserRelic(relic, requestId = crypto.randomUUID()) {
  return relicService.saveRelic(relic, requestId);
}

export async function loadUserRelicInventory() {
  const [relic, charmRows] = await Promise.all([
    getOrCreateUserRelic(),
    communityClient.entities.UserRelicCharm.list("-created_date", 300).catch(() => []),
  ]);

  return {
    relic,
    charms: charmRows.map(normalizeCharm),
  };
}

export async function loadCharmRollEligibility() {
  const gate = await loadRelicRollGate();
  if (gate.enabled) {
    return {
      canRoll: true,
      reason: gate.reason,
      streamState: null,
      gate,
    };
  }

  return {
    canRoll: false,
    reason: gate.reason || RELIC_ROLL_LOCK_REASON,
    streamState: null,
    gate,
  };
}

export async function rollUserRelicCharm() {
  return relicService.rollCharm(crypto.randomUUID());
}

export async function setEquippedCharm(charm, _charms, equipped) {
  return relicService.setCharmEquipped(charm.id, equipped);
}

export async function setUserLevelFavored(levelId, favored, title) {
  return relicService.setFavored(levelId, favored, title);
}
