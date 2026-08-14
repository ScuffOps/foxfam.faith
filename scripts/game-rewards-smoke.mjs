import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const KNOWN_LIVE_PROJECT_REF = "wdypokgdqgvqpyabvshq";
export const ENABLED_GAME_KEYS = Object.freeze([
  "word-garden",
  "match-merge",
  "boba-cafe",
  "puzzle-cat",
  "time-runner",
]);
const TEARDOWN_CONTRACT = "DELETE_DISPOSABLE_PROJECT_AFTER_RUN";
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORD_GARDEN_SMOKE_WORDS = Object.freeze({
  "petal-rite": Object.freeze({ normal: "PALE", fullBloom: "PETALERS" }),
  "planter-song": Object.freeze({ normal: "PALE", fullBloom: "PLANTER" }),
  "garden-vow": Object.freeze({ normal: "DARE", fullBloom: "GARDENS" }),
  "violet-hour": Object.freeze({ normal: "VOTE", fullBloom: "VIOLETS" }),
  "thorned-path": Object.freeze({ normal: "HORN", fullBloom: "THORNED" }),
  "pollen-drift": Object.freeze({ normal: "FLOW", fullBloom: "FLOWERS" }),
  "meadow-rest": Object.freeze({ normal: "DAME", fullBloom: "MEADOWS" }),
});

export const GAME_REWARD_FIXTURE_PATHS = Object.freeze({
  bootstrap: path.join(SCRIPT_DIRECTORY, "fixtures/game-rewards/bootstrap.sql"),
  enable: path.join(SCRIPT_DIRECTORY, "fixtures/game-rewards/enable.sql"),
  allowlist: path.join(SCRIPT_DIRECTORY, "fixtures/game-rewards/allowlist.json"),
});

const REQUIRED_ENV = Object.freeze([
  "GAME_REWARDS_E2E_PROJECT_REF",
  "GAME_REWARDS_E2E_SUPABASE_URL",
  "GAME_REWARDS_E2E_SUPABASE_PUBLISHABLE_KEY",
  "GAME_REWARDS_E2E_FIXTURE_MARKER",
  "GAME_REWARDS_E2E_TEARDOWN_CONTRACT",
  "GAME_REWARDS_E2E_USER_A_ACCESS_TOKEN",
  "GAME_REWARDS_E2E_USER_B_ACCESS_TOKEN",
]);

function requiredValue(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing explicit ${key}.`);
  return value;
}

function tokenUser(token, label, supabaseUrl, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error(`${label} must be a JWT.`);
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error(`${label} has an invalid JWT payload.`);
  }
  if (claims.role !== "authenticated" || claims.iss !== `${supabaseUrl}/auth/v1`) {
    throw new Error(`${label} must be an authenticated token issued by the disposable project.`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub || "")) {
    throw new Error(`${label} is missing a valid user id.`);
  }
  if (!Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now + 5 * 60 * 1000) {
    throw new Error(`${label} must remain valid for at least five minutes.`);
  }
  return { id: claims.sub, accessToken: token };
}

function isPrivilegedKey(key) {
  if (/^sb_secret_/i.test(key)) return true;
  const [, payload] = key.split(".");
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return ["service_role", "supabase_admin"].includes(claims.role);
  } catch {
    return false;
  }
}

export function getGameRewardSmokeConfig(env = process.env) {
  if (env.GAME_REWARDS_E2E_DISPOSABLE !== "1") {
    throw new Error("Set GAME_REWARDS_E2E_DISPOSABLE=1 only for an isolated disposable Supabase project.");
  }
  for (const key of REQUIRED_ENV) requiredValue(env, key);

  const projectRef = requiredValue(env, "GAME_REWARDS_E2E_PROJECT_REF").toLowerCase();
  if (!/^[a-z0-9]{20}$/.test(projectRef) || projectRef === KNOWN_LIVE_PROJECT_REF) {
    throw new Error("Refusing an invalid or known-live Supabase project ref.");
  }

  const supabaseUrl = requiredValue(env, "GAME_REWARDS_E2E_SUPABASE_URL");
  const parsedUrl = new URL(supabaseUrl);
  const expectedHost = `${projectRef}.supabase.co`;
  if (parsedUrl.protocol !== "https:" || parsedUrl.host !== expectedHost || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    throw new Error(`Supabase URL must exactly equal https://${expectedHost}.`);
  }

  const publishableKey = requiredValue(env, "GAME_REWARDS_E2E_SUPABASE_PUBLISHABLE_KEY");
  if (isPrivilegedKey(publishableKey)) throw new Error("Refusing a privileged Supabase key.");
  if (requiredValue(env, "GAME_REWARDS_E2E_TEARDOWN_CONTRACT") !== TEARDOWN_CONTRACT) {
    throw new Error(`Teardown contract must equal ${TEARDOWN_CONTRACT}.`);
  }

  const fixtureMarker = requiredValue(env, "GAME_REWARDS_E2E_FIXTURE_MARKER");
  if (!/^[a-z0-9][a-z0-9-]{7,63}$/.test(fixtureMarker)) throw new Error("Invalid disposable fixture marker.");

  const exactUrl = parsedUrl.toString().replace(/\/$/, "");
  const userA = tokenUser(requiredValue(env, "GAME_REWARDS_E2E_USER_A_ACCESS_TOKEN"), "user A token", exactUrl);
  const userB = tokenUser(requiredValue(env, "GAME_REWARDS_E2E_USER_B_ACCESS_TOKEN"), "user B token", exactUrl);
  if (userA.id === userB.id) throw new Error("Smoke verification requires two distinct authenticated users.");

  const allowlist = JSON.parse(readFileSync(GAME_REWARD_FIXTURE_PATHS.allowlist, "utf8"));
  if (allowlist.contract !== "game-rewards-disposable-v1") throw new Error("Unexpected game reward fixture contract.");
  if (allowlist.project_ref && allowlist.project_ref !== projectRef) throw new Error("Project ref is not allowed by the fixed fixture.");
  if (allowlist.marker && allowlist.marker !== fixtureMarker) throw new Error("Fixture marker does not match the fixed allowlist.");

  return { projectRef, supabaseUrl: exactUrl, publishableKey, fixtureMarker, userA, userB };
}

function authenticatedClient(config, user) {
  return createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
  });
}

async function expectRejected(label, operation) {
  const result = await operation();
  assert.ok(result.error, `${label} unexpectedly succeeded`);
  return result.error;
}

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, durationMs)));
}

async function progressSession(client, sessionId, action) {
  const { data, error } = await client.rpc("progress_game_reward_session", {
    progress_session_id: sessionId,
    progress_idempotency_key: randomUUID(),
    progress_action: action,
  });
  assert.ifError(error);
  assert.equal(data.session_id, sessionId);
  assert.equal(data.replayed, false);
  return data.state;
}

async function startSession(client, gameKey) {
  const { data, error } = await client.rpc("start_game_reward_session", {
    requested_game_key: gameKey,
  });
  assert.ifError(error);
  assert.equal(data.game_key, gameKey);
  assert.ok(data.session_id, `${gameKey} did not return a session id`);
  return data;
}

async function claimSession(client, session, expectedMaterialKey) {
  const { data, error } = await client.rpc("claim_game_reward", {
    claim_session_id: session.session_id,
    claim_idempotency_key: randomUUID(),
    claim_evidence: {},
  });
  assert.ifError(error);
  assert.equal(data.game_key, session.game_key);
  assert.equal(data.replayed, false);
  assert.ok(data.score > 0, `${session.game_key} returned no score`);
  assert.ok(data.favor.delta > 0, `${session.game_key} returned no Favor`);
  assert.ok(data.materials.some((material) => material.key === expectedMaterialKey), `${session.game_key} omitted ${expectedMaterialKey}`);
  assertCollectibleReceipt(data, session.game_key);
  return data;
}

function assertCollectibleReceipt(claim, label) {
  assert.ok(claim.achievements.length > 0, `${label} unlocked no smoke-test achievement`);
  for (const achievement of claim.achievements) {
    assert.ok(achievement.collectible?.trophy_key, `${label} omitted trophy provenance for ${achievement.key}`);
  }
}

export function findCanonicalMerge(grid) {
  for (let from = 0; from < grid.length; from += 1) {
    for (const to of [from + 1, from + 4]) {
      if (to >= grid.length) continue;
      const sameRow = Math.floor(from / 4) === Math.floor(to / 4);
      if ((to === from + 1 && !sameRow) || grid[from] <= 0 || grid[from] >= 5 || grid[from] !== grid[to]) continue;
      return { op: "merge", from, to };
    }
  }
  throw new Error("Canonical Match and Merge state has no legal merge.");
}

export function bobaRecipeActions(context) {
  const recipe = context?.active_order?.recipe;
  assert.ok(recipe && typeof recipe === "object", "Boba Cafe omitted its canonical active recipe");
  return ["tea", "milk", "topping", "charm", "sweetness"].map((station) => ({
    op: "select",
    station,
    choice: recipe[station],
  }));
}

export function orderedFindVezmirTargets(context) {
  const targets = Array.isArray(context?.targets) ? context.targets : [];
  const clues = targets.filter((target) => target.role === "clue");
  const finalTarget = targets.find((target) => target.role === "final");
  assert.equal(clues.length, 5, "Find Vezmir did not return five canonical clues");
  assert.ok(finalTarget, "Find Vezmir omitted its final target");
  return [...clues, finalTarget];
}

export function wordGardenSmokeWordsForPuzzle(puzzle) {
  const puzzleKey = puzzle?.key;
  assert.equal(typeof puzzleKey, "string", "Word Garden omitted its canonical puzzle key");
  const rotationKey = Object.keys(WORD_GARDEN_SMOKE_WORDS)
    .find((candidate) => puzzleKey === candidate || puzzleKey.startsWith(`${candidate}-`));
  assert.ok(rotationKey, `No smoke words are registered for Word Garden puzzle ${puzzleKey}`);
  return WORD_GARDEN_SMOKE_WORDS[rotationKey];
}

async function completeMatchMerge(client, session) {
  const state = await progressSession(client, session.session_id, findCanonicalMerge(session.context.grid));
  assert.equal(state.moves, 1);
  return claimSession(client, session, "moonwax");
}

async function completeBobaCafe(client, session) {
  let context = session.context;
  while (context.phase !== "shiftComplete") {
    assert.equal(context.phase, "serving");
    for (const action of bobaRecipeActions(context)) {
      context = await progressSession(client, session.session_id, action);
    }
    context = await progressSession(client, session.session_id, { op: "serve" });
    assert.equal(context.last_result.perfect, true);
    context = await progressSession(client, session.session_id, { op: "next" });
  }
  assert.equal(context.served_count, 8);
  assert.equal(context.perfect_count, 8);
  return claimSession(client, session, "sugar-pearls");
}

async function completeFindVezmir(client, session) {
  let context = session.context;
  for (const target of orderedFindVezmirTargets(context)) {
    context = await progressSession(client, session.session_id, {
      op: "search",
      x: target.x,
      y: target.y,
      layer: target.layer,
    });
  }
  assert.equal(context.phase, "complete");
  assert.equal(context.misses, 0);
  return claimSession(client, session, "catnip-silver");
}

async function completeTimeRunner(client, session) {
  let context = session.context;
  const startedAtMs = Date.parse(session.started_at);
  assert.ok(Number.isFinite(startedAtMs), "Time Runner returned an invalid start time");
  const hazards = [...context.layout].sort((left, right) => left.at_ms - right.at_ms);

  for (const hazard of hazards) {
    if (!hazard.required_op) continue;
    await sleep(startedAtMs + hazard.at_ms + 80 - Date.now());
    context = await progressSession(client, session.session_id, {
      op: hazard.required_op,
      hazard_id: hazard.id,
    });
  }

  await sleep(startedAtMs + 45100 - Date.now());
  context = await progressSession(client, session.session_id, { op: "sync" });
  assert.equal(context.phase, "complete");
  assert.equal(context.elapsed_ms, 45000);
  assert.ok(context.falls < 3);
  return claimSession(client, session, "clock-brass");
}

export async function runSmoke(config) {
  const clientA = authenticatedClient(config, config.userA);
  const clientB = authenticatedClient(config, config.userB);
  const anonymous = createClient(config.supabaseUrl, config.publishableKey, { auth: { persistSession: false } });

  await expectRejected("anonymous session start", () => anonymous.rpc("start_game_reward_session", { requested_game_key: "word-garden" }));
  await expectRejected("unknown game session", () => clientA.rpc("start_game_reward_session", { requested_game_key: "not-a-game" }));
  await expectRejected("direct reward event insert", () => clientA.from("game_reward_events").insert({
    session_id: randomUUID(),
    user_id: config.userA.id,
    game_key: "word-garden",
    rules_version: 1,
    idempotency_key: randomUUID(),
    evidence_hash: "0".repeat(32),
    score: 999,
    favor_awarded: 999,
    result_snapshot: {},
  }));

  const sessionA = await startSession(clientA, "word-garden");
  assert.equal(sessionA.game_key, "word-garden");
  assert.equal(sessionA.puzzle.accepted_words, undefined);
  const wordGardenWords = wordGardenSmokeWordsForPuzzle(sessionA.puzzle);

  for (const action of [
    { op: "submit", word: wordGardenWords.normal },
    { op: "submit", word: wordGardenWords.fullBloom },
    { op: "rest" },
  ]) {
    const { error } = await clientA.rpc("progress_game_reward_session", {
      progress_session_id: sessionA.session_id,
      progress_idempotency_key: randomUUID(),
      progress_action: action,
    });
    assert.ifError(error);
  }

  const idempotencyKey = randomUUID();
  const claimParams = {
    claim_session_id: sessionA.session_id,
    claim_idempotency_key: idempotencyKey,
    claim_evidence: {},
  };
  const { data: firstClaim, error: claimError } = await clientA.rpc("claim_game_reward", claimParams);
  assert.ifError(claimError);
  const expectedWordGardenScore = wordGardenWords.normal.length + wordGardenWords.fullBloom.length + 7;
  assert.equal(firstClaim.replayed, false);
  assert.equal(firstClaim.score, expectedWordGardenScore);
  assert.equal(firstClaim.favor.delta, Math.max(3, Math.floor(expectedWordGardenScore / 4)));
  assert.deepEqual(firstClaim.materials[0].key, "blooming-ink");
  assertCollectibleReceipt(firstClaim, "word-garden");

  const { data: replay, error: replayError } = await clientA.rpc("claim_game_reward", claimParams);
  assert.ifError(replayError);
  assert.equal(replay.replayed, true);
  assert.equal(replay.reward_event_id, firstClaim.reward_event_id);
  assert.equal(replay.favor.balance, firstClaim.favor.balance);

  await expectRejected("cross-user session claim", () => clientB.rpc("claim_game_reward", {
    ...claimParams,
    claim_idempotency_key: randomUUID(),
  }));

  const { data: secondSession, error: secondStartError } = await clientA.rpc("start_game_reward_session", { requested_game_key: "word-garden" });
  assert.ifError(secondStartError);
  const secondSessionWords = wordGardenSmokeWordsForPuzzle(secondSession.puzzle);
  for (const action of [{ op: "submit", word: secondSessionWords.normal }, { op: "rest" }]) {
    const { error } = await clientA.rpc("progress_game_reward_session", {
      progress_session_id: secondSession.session_id,
      progress_idempotency_key: randomUUID(),
      progress_action: action,
    });
    assert.ifError(error);
  }
  await expectRejected("cross-session idempotency reuse", () => clientA.rpc("claim_game_reward", {
    claim_session_id: secondSession.session_id,
    claim_idempotency_key: idempotencyKey,
    claim_evidence: {},
  }));

  await expectRejected("client-authored score", () => clientA.rpc("claim_game_reward", {
    claim_session_id: secondSession.session_id,
    claim_idempotency_key: randomUUID(),
    claim_evidence: { score: 999 },
  }));

  const matchClaim = await completeMatchMerge(clientA, await startSession(clientA, "match-merge"));
  const bobaClaim = await completeBobaCafe(clientA, await startSession(clientA, "boba-cafe"));
  const findClaim = await completeFindVezmir(clientA, await startSession(clientA, "puzzle-cat"));
  const timeClaim = await completeTimeRunner(clientA, await startSession(clientA, "time-runner"));

  return {
    sessionId: sessionA.session_id,
    rewardEventId: firstClaim.reward_event_id,
    claimedGames: [firstClaim, matchClaim, bobaClaim, findClaim, timeClaim].map((claim) => claim.game_key),
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runSmoke(getGameRewardSmokeConfig())
    .then((result) => {
      console.log(`Game reward smoke passed for ${result.claimedGames.join(", ")} (session ${result.sessionId}, event ${result.rewardEventId}).`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
