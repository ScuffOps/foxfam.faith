import { supabase } from "../api/communityClient.js";
import { normalizeFavorActionResult } from "./favorGatewayContract.js";

export const PORTAL_FAVOR_ACTIONS = Object.freeze([
  "submit-post",
  "post-blessing",
  "blessing-comment",
  "reliquary-comment",
  "praise-blessing",
  "praise-idea",
  "vote-poll",
]);

const FAVOR_ACTION_SET = new Set(PORTAL_FAVOR_ACTIONS);
const FAVOR_ACTION_RPC = "perform_portal_favor_action";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeFavorActionError(error) {
  const normalized = new Error(
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : "Favor action could not be completed.",
  );
  normalized.name = "FavorActionError";
  normalized.code = error?.code || "FAVOR_ACTION_FAILED";
  return normalized;
}

function requireActionKey(actionKey) {
  if (!FAVOR_ACTION_SET.has(actionKey)) {
    throw new Error("Unknown Favor action.");
  }
  return actionKey;
}

function requireSourceId(sourceId) {
  const cleanedSourceId = typeof sourceId === "string" ? sourceId.trim() : "";
  if (!UUID_PATTERN.test(cleanedSourceId)) {
    throw new Error("Favor action source must be a valid UUID.");
  }
  return cleanedSourceId;
}

function normalizeOptionKey(optionKey) {
  if (optionKey == null) return null;
  if (typeof optionKey !== "string") {
    throw new Error("Favor poll option must be a string.");
  }
  return optionKey.trim() || null;
}

function validateOptionKey(actionKey, optionKey) {
  if (actionKey === "vote-poll" && !optionKey) {
    throw new Error("Poll option is required.");
  }
  if (actionKey !== "vote-poll" && optionKey !== null) {
    throw new Error("Poll options are only valid for poll actions.");
  }
  return optionKey;
}

export function createFavorService(client = supabase) {
  return {
    async performAction(actionKey, sourceId, optionKey = null) {
      const safeActionKey = requireActionKey(actionKey);
      const safeSourceId = requireSourceId(sourceId);
      const safeOptionKey = validateOptionKey(safeActionKey, normalizeOptionKey(optionKey));

      if (!client || typeof client.rpc !== "function") {
        throw new Error("Favor service is unavailable.");
      }

      const { data, error } = await client.rpc(FAVOR_ACTION_RPC, {
        action_key: safeActionKey,
        source_id: safeSourceId,
        option_key: safeOptionKey,
      });

      if (error) throw normalizeFavorActionError(error);

      try {
        return normalizeFavorActionResult(data);
      } catch (resultError) {
        throw normalizeFavorActionError({
          code: "FAVOR_ACTION_INVALID_RESPONSE",
          message: "Favor action returned an invalid response.",
          cause: resultError,
        });
      }
    },
  };
}

export function getFavorAwardOutcome(result) {
  const delta = result?.favor?.delta || 0;
  const balance = result?.favor?.balance || 0;
  const shouldNotify = !result?.replayed && delta > 0;

  return {
    shouldNotify,
    leveledUp: shouldNotify && Boolean(result?.rank?.leveledUp),
    delta,
    balance,
  };
}

export const favorService = createFavorService();
