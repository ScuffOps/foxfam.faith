const STORAGE_KEY = "foxfam:shared-game-reward-recovery:v1";
const MAX_RECOVERY_BYTES = 48_000;
const VALID_GAMES = new Set([
  "match-merge",
  "boba-cafe",
  "puzzle-cat",
  "time-runner",
  "word-garden",
]);

export function readGameRewardRecovery(storage, { gameKey, ownerId }) {
  if (!isStorageLike(storage) || !isScopeValid(gameKey, ownerId)) return null;
  try {
    const store = parseStore(storage.getItem(STORAGE_KEY));
    return normalizeRecovery(store[scopeKey(gameKey, ownerId)], gameKey, ownerId);
  } catch {
    return null;
  }
}

export function writeGameRewardRecovery(storage, { gameKey, ownerId, request, session = null }) {
  if (!isStorageLike(storage) || !isScopeValid(gameKey, ownerId)) return false;
  const recovery = normalizeRecovery({
    gameKey,
    ownerId,
    request,
    session,
    savedAt: new Date().toISOString(),
  }, gameKey, ownerId);
  if (!recovery) return false;

  try {
    const store = parseStore(storage.getItem(STORAGE_KEY));
    store[scopeKey(gameKey, ownerId)] = recovery;
    const serialized = JSON.stringify(store);
    if (serialized.length > MAX_RECOVERY_BYTES) return false;
    storage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearGameRewardRecovery(storage, { gameKey, ownerId }) {
  if (!isStorageLike(storage) || !isScopeValid(gameKey, ownerId)) return false;
  try {
    const store = parseStore(storage.getItem(STORAGE_KEY));
    delete store[scopeKey(gameKey, ownerId)];
    if (Object.keys(store).length) storage.setItem(STORAGE_KEY, JSON.stringify(store));
    else storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function updateRewardSessionContext(session, context) {
  if (!session || !isPlainObject(context)) return session;
  return { ...session, context };
}

function normalizeRecovery(value, expectedGameKey, expectedOwnerId) {
  if (!isPlainObject(value)) return null;
  if (value.gameKey !== expectedGameKey || value.ownerId !== expectedOwnerId) return null;
  const request = normalizeRequest(value.request);
  if (!request) return null;
  const session = value.session === null || value.session === undefined
    ? null
    : normalizeSession(value.session, expectedGameKey);
  if (request.kind !== "start" && !session) return null;
  const savedAt = typeof value.savedAt === "string" && Number.isFinite(Date.parse(value.savedAt))
    ? value.savedAt
    : new Date(0).toISOString();
  return { gameKey: expectedGameKey, ownerId: expectedOwnerId, request, session, savedAt };
}

function normalizeRequest(request) {
  if (!isPlainObject(request) || !["start", "action", "claim"].includes(request.kind)) return null;
  if (request.kind === "start") return { kind: "start" };
  if (!isUuid(request.idempotencyKey)) return null;
  if (request.kind === "claim") return { kind: "claim", idempotencyKey: request.idempotencyKey };
  if (!isPlainObject(request.action) || !isSmallJson(request.action, 4_000)) return null;
  return {
    kind: "action",
    idempotencyKey: request.idempotencyKey,
    action: request.action,
    ...(request.clearDraft === true ? { clearDraft: true } : {}),
  };
}

function normalizeSession(session, gameKey) {
  if (!isPlainObject(session) || !isUuid(session.sessionId)) return null;
  if (session.gameKey && session.gameKey !== gameKey) return null;
  if (!isPlainObject(session.context) || !isSmallJson(session.context, 32_000)) return null;
  const normalized = {
    sessionId: session.sessionId,
    gameKey,
    context: session.context,
  };
  for (const key of ["rulesVersion", "seed", "startedAt", "expiresAt"]) {
    if (["string", "number"].includes(typeof session[key])) normalized[key] = session[key];
  }
  if (isPlainObject(session.puzzle) && isSmallJson(session.puzzle, 4_000)) normalized.puzzle = session.puzzle;
  return normalized;
}

function parseStore(value) {
  if (!value || value.length > MAX_RECOVERY_BYTES) return {};
  const parsed = JSON.parse(value);
  return isPlainObject(parsed) ? parsed : {};
}

function scopeKey(gameKey, ownerId) {
  return `${ownerId}:${gameKey}`;
}

function isScopeValid(gameKey, ownerId) {
  return VALID_GAMES.has(gameKey) && typeof ownerId === "string" && ownerId.length >= 1 && ownerId.length <= 128;
}

function isStorageLike(storage) {
  return Boolean(storage?.getItem && storage?.setItem && storage?.removeItem);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSmallJson(value, limit) {
  try {
    return JSON.stringify(value).length <= limit;
  } catch {
    return false;
  }
}

function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
