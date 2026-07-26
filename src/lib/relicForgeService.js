import { supabase } from "../api/communityClient.js";
import {
  parseRelicForgeConversion,
  parseRelicForgeState,
  parseRelicForgeUpgrade,
} from "./relicForgeContract.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
  return normalized;
}

function requireRpcClient(client) {
  if (!client || typeof client.rpc !== "function") {
    throw new Error("Relic Forge service is unavailable.");
  }
  return client;
}

function normalizeRpcError(error, fallbackMessage) {
  const normalized = new Error(
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : fallbackMessage,
  );
  normalized.name = "RelicForgeServiceError";
  normalized.code = error?.code || "RELIC_FORGE_ACTION_FAILED";
  return normalized;
}

export function createRelicForgeService(client = supabase) {
  const rpcClient = () => requireRpcClient(client);

  return {
    async loadState() {
      const { data, error } = await rpcClient().rpc("load_relic_forge_state");
      if (error) throw normalizeRpcError(error, "Relic Forge state could not be loaded.");
      return parseRelicForgeState(data);
    },

    async upgradeCharm(charmId, requestId) {
      const { data, error } = await rpcClient().rpc("upgrade_user_relic_charm", {
        target_charm_id: requireUuid(charmId, "Charm"),
        request_id: requireUuid(requestId, "Forge request"),
      });
      if (error) throw normalizeRpcError(error, "Charm upgrade failed.");
      return parseRelicForgeUpgrade(data);
    },

    async convertDuplicateCharm(charmId, requestId) {
      const { data, error } = await rpcClient().rpc("convert_duplicate_relic_charm", {
        target_charm_id: requireUuid(charmId, "Charm"),
        request_id: requireUuid(requestId, "Forge request"),
      });
      if (error) throw normalizeRpcError(error, "Charm conversion failed.");
      return parseRelicForgeConversion(data);
    },
  };
}

export const relicForgeService = createRelicForgeService();
