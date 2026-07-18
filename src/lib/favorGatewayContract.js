const MAX_SAFE_FAVOR = Number.MAX_SAFE_INTEGER;

const FAVOR_RANKS = [
  { name: "Forsaken", min: 0 },
  { name: "Seeker", min: 10 },
  { name: "Faithful", min: 30 },
  { name: "Purified", min: 75 },
  { name: "Timescorned", min: 150 },
  { name: "Forblessed", min: 300 },
];

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function requireSafeInteger(value, label, { min = -MAX_SAFE_FAVOR } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > MAX_SAFE_FAVOR) {
    throw new Error(`${label} must be a transport-safe integer.`);
  }
  return value;
}

function getFavorRank(balance) {
  let rank = FAVOR_RANKS[0];
  for (const candidate of FAVOR_RANKS) {
    if (balance >= candidate.min) rank = candidate;
  }
  return rank;
}

function normalizeRankSnapshot(value, expectedRank, label) {
  const rank = requireObject(value, label);
  if (rank.name !== expectedRank.name || rank.min !== expectedRank.min) {
    throw new Error(`${label} does not match the authoritative Favor balance.`);
  }
  return { ...expectedRank };
}

export function normalizeFavorActionResult(value) {
  const result = requireObject(value, "Favor action result");
  const favor = requireObject(result.favor, "Favor result");
  const replayed = requireBoolean(result.replayed, "Favor replay state");
  const delta = requireSafeInteger(favor.delta, "Favor delta");
  const balance = requireSafeInteger(favor.balance, "Favor balance", { min: 0 });
  const previousBalance = balance - delta;

  if (!Number.isSafeInteger(previousBalance) || previousBalance < 0) {
    throw new Error("Favor delta is inconsistent with the authoritative balance.");
  }
  if (replayed && delta !== 0) {
    throw new Error("A replayed Favor action cannot include a delta.");
  }

  const rank = requireObject(result.rank, "Favor rank result");
  const previousRank = getFavorRank(previousBalance);
  const currentRank = getFavorRank(balance);
  const previous = normalizeRankSnapshot(
    rank.previous,
    previousRank,
    "Previous Favor rank",
  );
  const current = normalizeRankSnapshot(
    rank.current,
    currentRank,
    "Current Favor rank",
  );
  const leveledUp = requireBoolean(rank.leveled_up, "Favor rank transition");

  if (leveledUp !== (current.min > previous.min)) {
    throw new Error("Favor rank transition contradicts the balances.");
  }

  return {
    replayed,
    favor: {
      delta,
      balance,
    },
    rank: {
      previous,
      current,
      leveledUp,
    },
  };
}
