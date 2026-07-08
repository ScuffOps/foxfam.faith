import { applyLocalRewardCap, buildRewardIntent, DUPLICATE_POLICIES } from "../../../lib/gameRewards.js";

export const TIME_RUNNER_PHASES = {
  ready: "ready",
  running: "running",
  finished: "finished",
};

export const TIME_RUNNER_POSTURES = {
  run: "run",
  jump: "jump",
  duck: "duck",
  focus: "focus",
};

export const TIME_RUNNER_STORAGE_KEY = "foxfam_time_runner_state_v1";
export const TIME_RUNNER_REWARD_LOG_KEY = "foxfam_time_runner_reward_log_v1";

export const TIME_RUNNER_RUN_MS = 45000;
export const TIME_RUNNER_COLLISION_X = 18;
export const TIME_RUNNER_COLLISION_WINDOW = 4.4;

const HAZARD_CATALOG = {
  handSweep: {
    kind: "hand-sweep",
    label: "Minute Hand Sweep",
    requiredPosture: TIME_RUNNER_POSTURES.jump,
    scoreValue: 90,
    focusValue: 8,
  },
  romanGate: {
    kind: "roman-gate",
    label: "Roman Numeral Gate",
    requiredPosture: TIME_RUNNER_POSTURES.duck,
    scoreValue: 80,
    focusValue: 7,
  },
  clockShard: {
    kind: "clock-shard",
    label: "Clock-Face Shard",
    requiredPosture: null,
    scoreValue: 55,
    focusValue: 5,
  },
};

export function createInitialTimeRunnerState({ seed = "clocktower-v1", now = Date.now() } = {}) {
  return {
    phase: TIME_RUNNER_PHASES.ready,
    seed,
    runStartedAt: 0,
    elapsedMs: 0,
    lastTickAt: now,
    nextHazardAt: 700,
    hazardIndex: 0,
    hazards: [],
    posture: TIME_RUNNER_POSTURES.run,
    postureUntil: 0,
    invulnerableUntil: 0,
    score: 0,
    claimedScore: 0,
    health: 3,
    combo: 0,
    bestCombo: 0,
    clockShards: 0,
    focus: 0,
    finishReason: "",
    completed: false,
    lastMoment: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

export function startTimeRunner(state, now = Date.now()) {
  if (state.phase === TIME_RUNNER_PHASES.running) return state;

  return {
    ...createInitialTimeRunnerState({ seed: state.seed, now }),
    phase: TIME_RUNNER_PHASES.running,
    runStartedAt: now,
    lastTickAt: now,
    updatedAt: new Date(now).toISOString(),
  };
}

export function resetTimeRunner(seed = "clocktower-v1", now = Date.now()) {
  return createInitialTimeRunnerState({ seed, now });
}

export function tickTimeRunner(state, now = Date.now()) {
  if (state.phase !== TIME_RUNNER_PHASES.running) return state;

  const deltaMs = Math.max(0, Math.min(240, now - state.lastTickAt));
  const elapsedMs = Math.min(TIME_RUNNER_RUN_MS, Math.max(0, now - state.runStartedAt));
  const speed = getRunnerSpeed(elapsedMs);
  const posture = state.postureUntil > now ? state.posture : TIME_RUNNER_POSTURES.run;
  const withMovedHazards = state.hazards
    .map((hazard) => ({ ...hazard, x: hazard.x - (speed * deltaMs) / 1000 }))
    .filter((hazard) => hazard.x > -8 && !hazard.resolved);
  const spawned = spawnDueHazards({
    ...state,
    hazards: withMovedHazards,
    elapsedMs,
  });
  const resolved = resolveHazardCollisions({
    ...spawned,
    elapsedMs,
    lastTickAt: now,
    posture,
    updatedAt: new Date(now).toISOString(),
  }, now);
  const runningScore = Math.floor(deltaMs * (0.017 + Math.min(0.018, resolved.combo * 0.0015)));
  const scored = {
    ...resolved,
    score: resolved.score + runningScore,
    focus: Math.min(100, resolved.focus + (deltaMs / 1000) * 1.4),
  };

  if (scored.health <= 0) {
    return finishTimeRunner(scored, "clock-fractured", false, now);
  }

  if (elapsedMs >= TIME_RUNNER_RUN_MS) {
    return finishTimeRunner(scored, "tower-cleared", true, now);
  }

  return scored;
}

export function applyTimeRunnerAction(state, action, now = Date.now()) {
  if (action === "start" || action === "cast" || action === "confirm") {
    return startTimeRunner(state, now);
  }

  if (state.phase !== TIME_RUNNER_PHASES.running) return state;

  if (action === "qte-up") {
    return setPosture(state, TIME_RUNNER_POSTURES.jump, 680, now);
  }

  if (action === "qte-down") {
    return setPosture(state, TIME_RUNNER_POSTURES.duck, 560, now);
  }

  if (action === "qte-right" && state.focus >= 30) {
    return {
      ...setPosture(state, TIME_RUNNER_POSTURES.focus, 420, now),
      focus: Math.max(0, state.focus - 30),
      invulnerableUntil: now + 420,
      combo: state.combo + 1,
      bestCombo: Math.max(state.bestCombo, state.combo + 1),
      lastMoment: {
        type: "focus-skip",
        label: "Tempo skip",
        createdAt: new Date(now).toISOString(),
      },
    };
  }

  return state;
}

export function buildTimeRunnerRewardIntent({ state, durationMs = state?.elapsedMs || 0 }) {
  const unclaimedScore = Math.max(0, (state?.score || 0) - (state?.claimedScore || 0));
  if (unclaimedScore <= 0 && !state?.completed) return null;

  const items = [];
  if ((state?.clockShards || 0) > 0) {
    items.push({
      key: "clock-face-shard",
      label: "Clock-Face Shard",
      quantity: Math.max(1, state.clockShards),
      type: "material",
    });
  }

  if ((state?.bestCombo || 0) >= 8) {
    items.push({
      key: "brass-hour-thread",
      label: "Brass Hour Thread",
      quantity: Math.max(1, Math.floor(state.bestCombo / 8)),
      type: "material",
    });
  }

  const achievementKeys = ["first-time-run"];
  if (state?.completed) achievementKeys.push("clocktower-clear");
  if ((state?.clockShards || 0) >= 6) achievementKeys.push("shard-sprinter");
  if ((state?.health || 0) === 3 && state?.completed) achievementKeys.push("unfractured-loop");

  return applyLocalRewardCap(buildRewardIntent({
    gameKey: "time-runner",
    eventType: state?.completed ? "clocktower-clear" : "clocktower-run",
    score: unclaimedScore,
    durationMs,
    favorPreview: Math.floor(unclaimedScore / 160) + (state?.completed ? 6 : 0),
    items,
    achievementKeys,
    duplicatePolicy: DUPLICATE_POLICIES.none,
  }), 90);
}

export function markTimeRunnerClaimed(state, now = Date.now()) {
  return {
    ...state,
    claimedScore: state.score,
    updatedAt: new Date(now).toISOString(),
  };
}

export function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function setPosture(state, posture, durationMs, now) {
  return {
    ...state,
    posture,
    postureUntil: now + durationMs,
    updatedAt: new Date(now).toISOString(),
  };
}

function finishTimeRunner(state, finishReason, completed, now) {
  return {
    ...state,
    phase: TIME_RUNNER_PHASES.finished,
    finishReason,
    completed,
    hazards: state.hazards.filter((hazard) => hazard.x > TIME_RUNNER_COLLISION_X),
    posture: TIME_RUNNER_POSTURES.run,
    postureUntil: 0,
    updatedAt: new Date(now).toISOString(),
  };
}

function resolveHazardCollisions(state, now) {
  return state.hazards.reduce((nextState, hazard) => {
    if (hazard.resolved || !isInCollisionWindow(hazard.x)) return nextState;

    if (hazard.kind === HAZARD_CATALOG.clockShard.kind) {
      const combo = nextState.combo + 1;
      return resolveHazard(nextState, hazard, {
        score: nextState.score + hazard.scoreValue,
        clockShards: nextState.clockShards + 1,
        combo,
        bestCombo: Math.max(nextState.bestCombo, combo),
        focus: Math.min(100, nextState.focus + hazard.focusValue),
        lastMoment: createMoment("shard", "Clock shard gathered", now),
      });
    }

    const avoided = nextState.invulnerableUntil > now || hazard.requiredPosture === nextState.posture;
    if (avoided) {
      const combo = nextState.combo + 1;
      return resolveHazard(nextState, hazard, {
        score: nextState.score + hazard.scoreValue + Math.min(80, combo * 8),
        combo,
        bestCombo: Math.max(nextState.bestCombo, combo),
        focus: Math.min(100, nextState.focus + hazard.focusValue),
        lastMoment: createMoment("avoid", `${hazard.label} cleared`, now),
      });
    }

    return resolveHazard(nextState, hazard, {
      health: Math.max(0, nextState.health - 1),
      combo: 0,
      lastMoment: createMoment("fracture", `${hazard.label} clipped the loop`, now),
    });
  }, state);
}

function resolveHazard(state, hazard, patch) {
  return {
    ...state,
    ...patch,
    hazards: state.hazards.map((current) => (
      current.id === hazard.id ? { ...current, resolved: true } : current
    )),
  };
}

function spawnDueHazards(state) {
  if (state.elapsedMs < state.nextHazardAt) return state;

  const hazard = createHazard(state.seed, state.hazardIndex, state.elapsedMs);
  const nextGap = getNextHazardGap(state.seed, state.hazardIndex, state.elapsedMs);
  return {
    ...state,
    hazards: [...state.hazards, hazard],
    hazardIndex: state.hazardIndex + 1,
    nextHazardAt: state.elapsedMs + nextGap,
  };
}

function createHazard(seed, index, elapsedMs) {
  const roll = seededUnit(`${seed}:hazard:${index}`);
  const catalogEntry = roll < 0.36
    ? HAZARD_CATALOG.handSweep
    : roll < 0.72
      ? HAZARD_CATALOG.romanGate
      : HAZARD_CATALOG.clockShard;

  return {
    id: `time-${index}`,
    kind: catalogEntry.kind,
    label: catalogEntry.label,
    requiredPosture: catalogEntry.requiredPosture,
    scoreValue: catalogEntry.scoreValue,
    focusValue: catalogEntry.focusValue,
    x: 106,
    resolved: false,
    spawnedAtMs: elapsedMs,
  };
}

function getNextHazardGap(seed, index, elapsedMs) {
  const roll = seededUnit(`${seed}:gap:${index}`);
  const pressure = Math.min(520, Math.floor(elapsedMs / 120));
  return Math.max(760, 1450 + Math.floor(roll * 720) - pressure);
}

function getRunnerSpeed(elapsedMs) {
  return 33 + Math.min(19, elapsedMs / 2400);
}

function isInCollisionWindow(x) {
  return Math.abs(x - TIME_RUNNER_COLLISION_X) <= TIME_RUNNER_COLLISION_WINDOW;
}

function createMoment(type, label, now) {
  return {
    type,
    label,
    createdAt: new Date(now).toISOString(),
  };
}

function seededUnit(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}
