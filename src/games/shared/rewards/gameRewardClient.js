import { ZodError } from "zod";

import {
  normalizeGameRewardClaim,
  normalizeGameRewardEvidence,
  normalizeGameRewardProgress,
  normalizeGameRewardSession,
  normalizeGameRewardAction,
} from "./gameRewardRpcContract.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GAME_KEY_PATTERN = /^[a-z0-9-]+$/;
const RETRYABLE_CODES = new Set(["53300", "57014", "57P01", "57P02", "57P03", "PGRST000", "PGRST001", "PGRST002", "PGRST003"]);

const ERROR_DEFINITIONS = Object.freeze({
  GAME_REWARD_AUTH_REQUIRED: { message: "Sign in to sync game rewards.", retryable: false },
  GAME_REWARD_INVALID_INPUT: { message: "That game reward request is invalid.", retryable: false },
  GAME_REWARD_INVALID_RESPONSE: { message: "The reward service returned an invalid response.", retryable: false },
  GAME_REWARD_REQUEST_REJECTED: { message: "That reward claim could not be accepted.", retryable: false },
  GAME_REWARD_TEMPORARILY_UNAVAILABLE: { message: "Rewards are resting for a moment. Please try again.", retryable: true },
  GAME_REWARD_REQUEST_FAILED: { message: "The reward service could not be reached.", retryable: false },
});

export class GameRewardClientError extends Error {
  constructor(code) {
    const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.GAME_REWARD_REQUEST_FAILED;
    super(definition.message);
    this.name = "GameRewardClientError";
    this.code = code in ERROR_DEFINITIONS ? code : "GAME_REWARD_REQUEST_FAILED";
    this.retryable = definition.retryable;
  }
}

function fail(code) {
  return new GameRewardClientError(code);
}

function requireRpcClient(client) {
  if (!client || typeof client.rpc !== "function") throw fail("GAME_REWARD_REQUEST_FAILED");
  return client;
}

function normalizeTransportError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "PGRST301" || code === "42501") return fail("GAME_REWARD_AUTH_REQUIRED");
  if (["22023", "23505", "23514", "55000"].includes(code)) return fail("GAME_REWARD_REQUEST_REJECTED");
  if (!code || code.startsWith("08") || RETRYABLE_CODES.has(code)) {
    return fail("GAME_REWARD_TEMPORARILY_UNAVAILABLE");
  }
  return fail("GAME_REWARD_REQUEST_FAILED");
}

function requireUuid(value) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw fail("GAME_REWARD_INVALID_INPUT");
  return value;
}

function normalizeResponse(data, normalizer) {
  try {
    return normalizer(data);
  } catch (error) {
    if (error instanceof ZodError) throw fail("GAME_REWARD_INVALID_RESPONSE");
    throw error;
  }
}

export async function startGameRewardSession(client, gameKey) {
  if (typeof gameKey !== "string" || !GAME_KEY_PATTERN.test(gameKey)) {
    throw fail("GAME_REWARD_INVALID_INPUT");
  }
  const { data, error } = await requireRpcClient(client).rpc("start_game_reward_session", {
    requested_game_key: gameKey,
  });
  if (error) throw normalizeTransportError(error);
  return normalizeResponse(data, normalizeGameRewardSession);
}

export async function claimGameReward(client, { sessionId, idempotencyKey, evidence } = {}) {
  let normalizedEvidence;
  try {
    normalizedEvidence = normalizeGameRewardEvidence(evidence);
  } catch (error) {
    if (error instanceof ZodError) throw fail("GAME_REWARD_INVALID_INPUT");
    throw error;
  }

  const params = {
    claim_session_id: requireUuid(sessionId),
    claim_idempotency_key: requireUuid(idempotencyKey),
    claim_evidence: normalizedEvidence,
  };
  const { data, error } = await requireRpcClient(client).rpc("claim_game_reward", params);
  if (error) throw normalizeTransportError(error);
  return normalizeResponse(data, normalizeGameRewardClaim);
}

export async function progressGameRewardSession(client, {
  sessionId,
  idempotencyKey,
  action,
} = {}) {
  let normalizedAction;
  try {
    normalizedAction = normalizeGameRewardAction(action);
  } catch (error) {
    if (error instanceof ZodError) throw fail("GAME_REWARD_INVALID_INPUT");
    throw error;
  }

  const params = {
    progress_session_id: requireUuid(sessionId),
    progress_idempotency_key: requireUuid(idempotencyKey),
    progress_action: normalizedAction,
  };
  const { data, error } = await requireRpcClient(client).rpc("progress_game_reward_session", params);
  if (error) throw normalizeTransportError(error);
  return normalizeResponse(data, normalizeGameRewardProgress);
}
