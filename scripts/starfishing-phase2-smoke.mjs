import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const KNOWN_LIVE_PROJECT_REF = "wdypokgdqgvqpyabvshq";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const PHASE_2_FIXTURE_RELATIVE_PATHS = Object.freeze({
  bootstrap: "scripts/fixtures/starfishing-phase2/bootstrap.sql",
  enable: "scripts/fixtures/starfishing-phase2/enable.sql",
  allowlist: "scripts/fixtures/starfishing-phase2/allowlist.json",
});
export const PHASE_2_FIXTURE_PATHS = Object.freeze({
  bootstrap: path.join(SCRIPT_DIRECTORY, "fixtures/starfishing-phase2/bootstrap.sql"),
  enable: path.join(SCRIPT_DIRECTORY, "fixtures/starfishing-phase2/enable.sql"),
  allowlist: path.join(SCRIPT_DIRECTORY, "fixtures/starfishing-phase2/allowlist.json"),
});
export const PHASE_2_FIXTURE_DIGESTS = Object.freeze({
  bootstrap: "dceadfcc6e361a23fcca073977f0e87cb19cb72f6a432474b4117e432bac997d",
  enable: "6127467045506aed9d33c2d7c332c55bdd118d0c9142da9b45a980e4394ee123",
});

const REQUIRED_ENV = Object.freeze([
  "STARFISHING_E2E_PROJECT_REF",
  "STARFISHING_E2E_SUPABASE_URL",
  "STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY",
  "STARFISHING_E2E_FIXTURE_MARKER",
  "STARFISHING_E2E_TEARDOWN_CONTRACT",
  "STARFISHING_E2E_USER_A_STARTING_FAVOR",
  "STARFISHING_E2E_USER_B_STARTING_FAVOR",
  "STARFISHING_E2E_USER_A_ACCESS_TOKEN",
  "STARFISHING_E2E_USER_B_ACCESS_TOKEN",
]);

const MAX_FORGE_PAYLOAD = Object.freeze({
  name: "Phase Two Maximum Relic",
  base_type: "mask",
  theme: "celestial",
  lore: "A disposable database relic used to prove atomic Favor rollback and replay behavior.",
  effects: ["star-orbit"],
});

const MIN_FORGE_PAYLOAD = Object.freeze({
  name: "Phase Two Small Relic",
  base_type: "tome",
  theme: "celestial",
  lore: "A disposable database relic used to prove an idempotent Forge save and replay.",
  effects: ["snow-dots"],
});

const MAX_FORGE_COST = 73;
const MIN_FORGE_COST = 43;
const MIN_EARLY_CLAIM_MARGIN_MS = 10000;
const ISOLATION_TROPHY_KEY = "phase2-smoke-isolation";
const TEARDOWN_CONTRACT = "DELETE_DISPOSABLE_PROJECT_AFTER_RUN";
export const PHASE_2_OWNER_PROJECTIONS = Object.freeze({
  game_catches: "id",
  user_fishpedia: "fish_key",
  currency_accounts: "id,balance",
  currency_ledger: "id,source_type",
  user_material_balances: "id",
  material_ledger: "id",
  user_achievements: "id",
  user_trophies: "id,trophy_key,data",
  user_relics: "id",
  user_relic_charms: "id",
});
const PHASE_2_OWNER_TABLES = Object.freeze(Object.keys(PHASE_2_OWNER_PROJECTIONS));
const FRESH_EMPTY_TABLES = Object.freeze(
  PHASE_2_OWNER_TABLES.filter(
    (table) => !["currency_accounts", "currency_ledger", "user_trophies"].includes(table),
  ),
);

function requiredValue(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing explicit ${key}.`);
  return value;
}

function isPrivilegedSupabaseKey(key) {
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

function safeNonNegativeInteger(value, key) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${key} must be a JavaScript-safe non-negative integer.`);
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${key} must be a JavaScript-safe non-negative integer.`);
  }
  return result;
}

function authenticatedUserFromToken(token, label, supabaseUrl, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error(`${label} access token must be a JWT.`);
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error(`${label} access token has an invalid JWT payload.`);
  }
  if (claims.role !== "authenticated") {
    throw new Error(`${label} access token must carry the authenticated role.`);
  }
  if (claims.iss !== `${supabaseUrl}/auth/v1`) {
    throw new Error(`${label} access token issuer does not match the disposable project.`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub || "")) {
    throw new Error(`${label} access token is missing a valid user id.`);
  }
  if (!Number.isSafeInteger(claims.exp) || claims.exp * 1000 < now + 5 * 60 * 1000) {
    throw new Error(`${label} access token must remain valid for at least five minutes.`);
  }
  return { id: claims.sub, accessToken: token };
}

export function getPhase2SmokeConfig(env = process.env) {
  if (env.STARFISHING_E2E_DISPOSABLE !== "1") {
    throw new Error(
      "Set STARFISHING_E2E_DISPOSABLE=1 only for an isolated disposable Supabase database. Normal VITE_* settings are never used.",
    );
  }
  if (env.STARFISHING_E2E_PROJECT_ALLOWLIST || env.STARFISHING_E2E_ENABLE_MIGRATION) {
    throw new Error(
      "Dynamic allowlist and SQL paths are not accepted. Use the fixed tracked Phase 2 fixture files.",
    );
  }

  for (const key of REQUIRED_ENV) requiredValue(env, key);

  const projectRef = requiredValue(env, "STARFISHING_E2E_PROJECT_REF").toLowerCase();
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("STARFISHING_E2E_PROJECT_REF must be the exact 20-character Supabase project ref.");
  }
  if (projectRef === KNOWN_LIVE_PROJECT_REF) {
    throw new Error(`Refusing known live Foxfam Supabase project ${KNOWN_LIVE_PROJECT_REF}.`);
  }

  const supabaseUrl = requiredValue(env, "STARFISHING_E2E_SUPABASE_URL");
  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("STARFISHING_E2E_SUPABASE_URL must be an absolute URL.");
  }
  const exactHost = `${projectRef}.supabase.co`;
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== exactHost ||
    parsedUrl.host !== exactHost ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      `STARFISHING_E2E_SUPABASE_URL must be the exact standard Supabase project host https://${exactHost}.`,
    );
  }

  const fixtureMarker = requiredValue(env, "STARFISHING_E2E_FIXTURE_MARKER").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{7,63}$/.test(fixtureMarker)) {
    throw new Error("STARFISHING_E2E_FIXTURE_MARKER must be a unique lowercase fixture marker.");
  }
  const teardownContract = requiredValue(env, "STARFISHING_E2E_TEARDOWN_CONTRACT");
  if (teardownContract !== TEARDOWN_CONTRACT) {
    throw new Error(`STARFISHING_E2E_TEARDOWN_CONTRACT must equal ${TEARDOWN_CONTRACT}.`);
  }

  const userA = authenticatedUserFromToken(
    requiredValue(env, "STARFISHING_E2E_USER_A_ACCESS_TOKEN"),
    "user A",
    parsedUrl.toString().replace(/\/$/, ""),
  );
  const userB = authenticatedUserFromToken(
    requiredValue(env, "STARFISHING_E2E_USER_B_ACCESS_TOKEN"),
    "user B",
    parsedUrl.toString().replace(/\/$/, ""),
  );
  if (userA.id === userB.id) {
    throw new Error("Phase 2 smoke requires two distinct authenticated users.");
  }
  const publishableKey = requiredValue(env, "STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY");
  if (isPrivilegedSupabaseKey(publishableKey)) {
    throw new Error("Refusing a privileged Supabase key. Use the disposable project's publishable/anon key.");
  }

  return {
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    publishableKey,
    userA,
    userB,
    projectRef,
    fixtureMarker,
    teardownContract,
    expectedStartingFavor: {
      userA: safeNonNegativeInteger(
        requiredValue(env, "STARFISHING_E2E_USER_A_STARTING_FAVOR"),
        "STARFISHING_E2E_USER_A_STARTING_FAVOR",
      ),
      userB: safeNonNegativeInteger(
        requiredValue(env, "STARFISHING_E2E_USER_B_STARTING_FAVOR"),
        "STARFISHING_E2E_USER_B_STARTING_FAVOR",
      ),
    },
  };
}

export function assertFixtureDigest(label, contents, expectedDigest) {
  const actualDigest = createHash("sha256").update(contents).digest("hex");
  if (actualDigest !== expectedDigest) {
    throw new Error(`${label} digest mismatch: expected ${expectedDigest}, received ${actualDigest}.`);
  }
}

export function assertRepositoryFixtureGitState({ trackedPaths, statusOutput }) {
  const expectedPaths = Object.values(PHASE_2_FIXTURE_RELATIVE_PATHS);
  const tracked = new Set(trackedPaths);
  const missingPaths = expectedPaths.filter((fixturePath) => !tracked.has(fixturePath));
  if (missingPaths.length > 0) {
    throw new Error(`Fixed fixture files must be tracked in git: ${missingPaths.join(", ")}.`);
  }
  if (statusOutput.trim()) {
    throw new Error(
      `Fixed fixture files must be committed and clean at runtime:\n${statusOutput.trim()}`,
    );
  }
}

function verifyRepositoryFixtureGitState(cwd) {
  let repositoryRoot;
  let trackedOutput;
  let statusOutput;
  try {
    repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
    }).trim();
    trackedOutput = execFileSync(
      "git",
      ["ls-files", "--", ...Object.values(PHASE_2_FIXTURE_RELATIVE_PATHS)],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    statusOutput = execFileSync(
      "git",
      [
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--",
        ...Object.values(PHASE_2_FIXTURE_RELATIVE_PATHS),
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
  } catch (error) {
    throw new Error(`Could not verify fixed fixture git state: ${error.message}`);
  }

  for (const [key, relativePath] of Object.entries(PHASE_2_FIXTURE_RELATIVE_PATHS)) {
    const expectedPath = path.resolve(repositoryRoot, relativePath);
    if (path.resolve(PHASE_2_FIXTURE_PATHS[key]) !== expectedPath) {
      throw new Error(`${relativePath} is not the exact fixed repository fixture path.`);
    }
  }

  assertRepositoryFixtureGitState({
    trackedPaths: trackedOutput.split(/\r?\n/).filter(Boolean),
    statusOutput,
  });
  return repositoryRoot;
}

export function assertDisposableProjectAllowlist(
  allowlist,
  projectRef,
  now = Date.now(),
  expectedNonce,
) {
  if (allowlist?.contract !== "starfishing-phase2-disposable-v2") {
    throw new Error("Disposable project allowlist has an unknown contract.");
  }
  const exactKeys = ["contract", "expires_at", "nonce", "project_ref"];
  if (
    !allowlist.project_ref ||
    !allowlist.expires_at ||
    !allowlist.nonce ||
    Object.keys(allowlist).sort().join(",") !== exactKeys.join(",")
  ) {
    throw new Error("Disposable project allowlist is empty, missing fields, or has unexpected fields.");
  }
  if (!/^[a-z0-9]{20}$/.test(allowlist.project_ref)) {
    throw new Error("Disposable project allowlist project ref is invalid.");
  }
  if (allowlist.project_ref === KNOWN_LIVE_PROJECT_REF) {
    throw new Error("Disposable project allowlist contains the known live Foxfam project.");
  }
  if (allowlist.project_ref !== projectRef) {
    throw new Error(`Disposable project allowlist ref does not match ${projectRef}.`);
  }
  if (!/^[0-9a-f]{32,128}$/.test(allowlist.nonce)) {
    throw new Error("Disposable project allowlist nonce is invalid.");
  }
  if (expectedNonce && allowlist.nonce !== expectedNonce) {
    throw new Error("Disposable project allowlist nonce does not match the fixture marker.");
  }
  const expiresAt = Date.parse(allowlist.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error("Disposable project allowlist is expired.");
  }
  if (expiresAt - now > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("Disposable project allowlist may not remain valid for more than seven days.");
  }
}

export function assertDisposableSentinel(sentinel, config, now = Date.now()) {
  if (!sentinel || sentinel.disposable !== true) {
    throw new Error("Disposable sentinel did not affirm a disposable database.");
  }
  if (sentinel.project_ref !== config.projectRef) {
    throw new Error("Disposable sentinel project ref does not match the requested target.");
  }
  if (sentinel.nonce !== config.fixtureMarker) {
    throw new Error("Disposable sentinel nonce does not match the committed allowlist.");
  }
  const expiresAt = Date.parse(sentinel.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error("Disposable sentinel is expired.");
  }
  if (expiresAt !== Date.parse(config.allowlistExpiresAt)) {
    throw new Error("Disposable sentinel expiry does not match the committed allowlist.");
  }
  if (sentinel.user_a_id !== config.userA.id || sentinel.user_b_id !== config.userB.id) {
    throw new Error("Disposable sentinel fixture users do not match the authenticated test users.");
  }
  if (
    numeric(sentinel.user_a_starting_favor, "sentinel user A starting Favor") !==
      config.expectedStartingFavor.userA ||
    numeric(sentinel.user_b_starting_favor, "sentinel user B starting Favor") !==
      config.expectedStartingFavor.userB
  ) {
    throw new Error("Disposable sentinel starting Favor does not match the fixture contract.");
  }
}

export function assertFreshFixtureState(
  label,
  state,
  expectedFavor,
  { fixtureMarker, requireIsolationTrophy = false } = {},
) {
  for (const table of FRESH_EMPTY_TABLES) {
    if (!Array.isArray(state[table]) || state[table].length !== 0) {
      throw new Error(`${label} fresh fixture has prior mutable state in ${table}.`);
    }
  }
  const account = requireSingleRow(`${label} starting Favor account`, state.currency_accounts);
  if (numeric(account.balance, `${label} starting Favor`) !== expectedFavor) {
    throw new Error(
      `${label} expected starting Favor ${expectedFavor}, received ${account.balance}. Recreate the fixture.`,
    );
  }
  const nonOpeningLedger = (state.currency_ledger || []).filter(
    (entry) => entry.source_type !== "legacy_opening_balance",
  );
  if (nonOpeningLedger.length > 0) {
    throw new Error(`${label} fresh fixture has prior mutable state in currency_ledger.`);
  }
  if (requireIsolationTrophy) {
    const trophy = requireSingleRow(`${label} isolation trophy`, state.user_trophies);
    if (
      trophy.trophy_key !== ISOLATION_TROPHY_KEY ||
      trophy.data?.fixture_nonce !== fixtureMarker
    ) {
      throw new Error(`${label} isolation trophy does not match fixture ${fixtureMarker}.`);
    }
  } else if (!Array.isArray(state.user_trophies) || state.user_trophies.length !== 0) {
    throw new Error(`${label} fresh fixture has prior mutable state in user_trophies.`);
  }
}

export function classifyRpcAvailabilityError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  if (code === "PGRST202" || code === "42883" || /function .* does not exist|schema cache/i.test(message)) {
    return "missing";
  }
  if (code === "42501" || /permission denied.*function|not allowed to execute/i.test(message)) {
    return "disabled";
  }
  return "other";
}

export function buildClaimParams({ ticketId, idempotencyKey, qteLength, durationMs }) {
  return {
    claim_ticket_id: ticketId,
    claim_idempotency_key: idempotencyKey,
    claim_duplicate_policy: "release",
    claim_qte_action_count: Math.max(0, Math.min(16, Math.round(Number(qteLength) || 0))),
    claim_miss_count: 0,
    claim_duration_ms: Math.max(0, Math.min(600000, Math.round(Number(durationMs) || 0))),
  };
}

export function millisecondsUntil(timestamp, now = Date.now()) {
  const target = Date.parse(timestamp);
  if (!Number.isFinite(target)) throw new Error(`Invalid server timestamp: ${timestamp}`);
  return Math.max(0, target - now + 100);
}

export function assertEarlyClaimMargin(timestamp, now = Date.now()) {
  const target = Date.parse(timestamp);
  if (!Number.isFinite(target)) throw new Error(`Invalid server timestamp: ${timestamp}`);
  const margin = target - now;
  if (margin < MIN_EARLY_CLAIM_MARGIN_MS) {
    throw new Error(
      `Starfishing not_before margin ${margin}ms is below the deterministic ${MIN_EARLY_CLAIM_MARGIN_MS}ms minimum.`,
    );
  }
  return margin;
}

export function requireSingleRow(label, rows) {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Expected exactly one ${label} row; received ${Array.isArray(rows) ? rows.length : "non-array"}.`);
  }
  return rows[0];
}

function createSmokeClient(config, accessToken) {
  return createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

function errorText(error) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
}

async function expectPass(label, action) {
  const result = await action();
  if (result?.error) throw new Error(`${label} failed: ${errorText(result.error)}`);
  console.log(`PASS ${label}`);
  return result;
}

async function expectRejected(label, action, pattern = /permission denied|row-level security|authentication required|not allowed/i) {
  const result = await action();
  if (!result?.error) throw new Error(`${label} unexpectedly succeeded.`);
  assert.match(errorText(result.error), pattern, `${label} returned an unexpected error`);
  console.log(`PASS ${label} rejected (${result.error.code || "error"})`);
  return result;
}

function numeric(value, label) {
  const result = Number(value);
  assert.ok(Number.isSafeInteger(result), `${label} must be a JavaScript-safe integer`);
  return result;
}

function assertUnchanged(before, after, label) {
  assert.deepEqual(after, before, `${label} changed despite a rejected transaction`);
}

function assertSameTimestamp(actual, expected, label) {
  const actualTime = Date.parse(actual);
  const expectedTime = Date.parse(expected);
  assert.ok(Number.isFinite(actualTime), `${label} persisted timestamp is invalid`);
  assert.ok(Number.isFinite(expectedTime), `${label} response timestamp is invalid`);
  assert.equal(actualTime, expectedTime, `${label} timestamp differs`);
}

async function readFixtureState(client, userId, label) {
  const state = {};
  for (const table of PHASE_2_OWNER_TABLES) {
    const columns = PHASE_2_OWNER_PROJECTIONS[table];
    const result = await expectPass(`${label} preflight read ${table}`, () =>
      client.from(table).select(columns).eq("user_id", userId),
    );
    state[table] = result.data;
  }
  return state;
}

async function verifyFreshFixture(client, userId, label, expectedFavor, options) {
  const state = await readFixtureState(client, userId, label);
  assertFreshFixtureState(label, state, expectedFavor, options);
  console.log(`PASS ${label} is a fresh deterministic fixture`);
}

async function verifyNonVacuousOwnerIsolation(clientA, clientB, userId) {
  for (const table of PHASE_2_OWNER_TABLES) {
    const projection = PHASE_2_OWNER_PROJECTIONS[table];
    const ownerRows = (
      await expectPass(`owner ${table} isolation fixture exists`, () =>
        clientA.from(table).select(projection).eq("user_id", userId),
      )
    ).data;
    if (!Array.isArray(ownerRows) || ownerRows.length === 0) {
      throw new Error(`Isolation precondition failed: user A has no fixture or created row in ${table}.`);
    }
    const crossUserRead = await expectPass(`cross-user ${table} read is filtered`, () =>
      clientB.from(table).select(projection).eq("user_id", userId),
    );
    assert.equal(crossUserRead.data.length, 0, `user B could read user A rows in ${table}`);
  }
}

async function readFavorMirror(client, userId, label) {
  const result = await expectPass(`${label} read Favor compatibility mirror`, () =>
    client
      .from("user_levels")
      .select("id,user_id,data,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1),
  );
  return requireSingleRow(`${label} Favor mirror`, result.data);
}

async function verifyMaterialRewards(client, userId, claimId, catchId, materials) {
  assert.ok(Array.isArray(materials) && materials.length > 0, "Starfishing claim must award fixture materials");
  const materialKeys = materials.map((material) => material.key);
  assert.equal(new Set(materialKeys).size, materialKeys.length, "Claim material keys must be unique");

  const balanceRows = (
    await expectPass("read claim material balances", () =>
      client.from("user_material_balances").select("user_id,material_key,balance").in("material_key", materialKeys),
    )
  ).data;
  const ledgerRows = (
    await expectPass("read claim material ledger", () =>
      client
        .from("material_ledger")
        .select("user_id,material_key,amount,balance_after,source_type,source_id,idempotency_key")
        .eq("source_type", "starfishing_catch")
        .eq("idempotency_key", claimId),
    )
  ).data;
  assert.equal(balanceRows.length, materials.length, "Material balance row count differs from claim");
  assert.equal(ledgerRows.length, materials.length, "Material ledger row count differs from claim");

  for (const material of materials) {
    const balance = requireSingleRow(
      `${material.key} material balance`,
      balanceRows.filter((row) => row.material_key === material.key),
    );
    const ledger = requireSingleRow(
      `${material.key} material ledger`,
      ledgerRows.filter((row) => row.material_key === material.key),
    );
    assert.equal(numeric(balance.balance, `${material.key} balance`), numeric(material.balance, `${material.key} claim balance`));
    assert.equal(numeric(ledger.amount, `${material.key} ledger amount`), numeric(material.delta, `${material.key} claim delta`));
    assert.equal(
      numeric(ledger.balance_after, `${material.key} ledger balance`),
      numeric(material.balance, `${material.key} claim balance`),
    );
    assert.equal(balance.user_id, userId);
    assert.equal(ledger.user_id, userId);
    assert.equal(ledger.source_id, catchId);
  }
}

async function verifyForge(client, userId) {
  const ensured = await expectPass("Forge ensure relic", () => client.rpc("ensure_user_relic"));
  const relicId = ensured.data.id;
  const beforeRelicResult = await expectPass("Forge read relic before mutation", () =>
    client.from("user_relics").select("id,user_id,data,updated_at").eq("id", relicId),
  );
  const beforeRelic = requireSingleRow("relic", beforeRelicResult.data);
  const beforeAccountResult = await expectPass("Forge read Favor before mutation", () =>
    client.from("currency_accounts").select("balance").eq("currency_key", "favor"),
  );
  const beforeAccount = requireSingleRow("Favor account", beforeAccountResult.data);
  const balance = numeric(beforeAccount.balance, "Forge Favor balance");
  const investedFavor = numeric(beforeRelic.data?.favor_spent ?? 0, "Forge invested Favor");
  if (investedFavor !== 0) {
    throw new Error(`Forge fixture must start with zero invested Favor; received ${investedFavor}.`);
  }
  if (balance < MIN_FORGE_COST || balance >= MAX_FORGE_COST) {
    throw new Error(
      `Forge fixture balance must be between ${MIN_FORGE_COST} and ${MAX_FORGE_COST - 1} Favor after the claim; received ${balance}.`,
    );
  }

  const maximumRequestId = randomUUID();
  const maximumAttempt = await client.rpc("save_user_relic_with_favor", {
    relic_payload: MAX_FORGE_PAYLOAD,
    request_id: maximumRequestId,
  });

  assert.ok(maximumAttempt.error, "Maximum Forge save should reject an insufficient balance");
  if (/relic forge is closed/i.test(errorText(maximumAttempt.error))) {
    throw new Error("Forge fixture gate must be open before running the smoke harness.");
  }
  assert.match(errorText(maximumAttempt.error), /insufficient favor balance/i);
  console.log("PASS Forge insufficient balance rejected");

  const afterRelicResult = await expectPass("Forge read relic after rollback", () =>
    client.from("user_relics").select("id,user_id,data,updated_at").eq("id", relicId),
  );
  const afterAccountResult = await expectPass("Forge read Favor after rollback", () =>
    client.from("currency_accounts").select("balance").eq("currency_key", "favor"),
  );
  assertUnchanged(beforeRelic, requireSingleRow("relic", afterRelicResult.data), "Relic");
  assert.equal(
    numeric(requireSingleRow("Favor account", afterAccountResult.data).balance, "Favor balance after rollback"),
    balance,
  );
  const failedLedger = (
    await expectPass("Forge read failed request ledger", () =>
      client.from("currency_ledger").select("id").eq("idempotency_key", maximumRequestId),
    )
  ).data;
  assert.equal(failedLedger.length, 0, "Rejected Forge request persisted a ledger row");

  const repeatedFailure = await client.rpc("save_user_relic_with_favor", {
    relic_payload: MAX_FORGE_PAYLOAD,
    request_id: maximumRequestId,
  });
  assert.ok(repeatedFailure.error, "Rolled-back Forge request should reject again");
  assert.match(errorText(repeatedFailure.error), /insufficient favor balance/i);
  console.log("PASS Forge failed request leaves no replay receipt");

  const successRequestId = randomUUID();
  const firstSave = await expectPass("Forge affordable save", () =>
    client.rpc("save_user_relic_with_favor", {
      relic_payload: MIN_FORGE_PAYLOAD,
      request_id: successRequestId,
    }),
  );
  const replayedSave = await expectPass("Forge affordable save replay", () =>
    client.rpc("save_user_relic_with_favor", {
      relic_payload: MIN_FORGE_PAYLOAD,
      request_id: successRequestId,
    }),
  );
  assert.equal(firstSave.data.replayed, false);
  assert.equal(replayedSave.data.replayed, true);
  assert.equal(replayedSave.data.relic.id, firstSave.data.relic.id);
  assert.equal(replayedSave.data.favor.balance, firstSave.data.favor.balance);
  assert.equal(numeric(firstSave.data.favor.delta, "Forge Favor delta"), -MIN_FORGE_COST);
  assert.equal(numeric(firstSave.data.favor.balance, "Forge result balance"), balance - MIN_FORGE_COST);

  const persistedRelic = requireSingleRow(
    "persisted Forge relic",
    (
      await expectPass("Forge read persisted relic", () =>
        client.from("user_relics").select("id,user_id,data,updated_at").eq("id", relicId),
      )
    ).data,
  );
  assert.equal(persistedRelic.data.name, MIN_FORGE_PAYLOAD.name);
  assert.equal(persistedRelic.user_id, userId);
  assert.equal(persistedRelic.data.base_type, MIN_FORGE_PAYLOAD.base_type);
  assert.equal(persistedRelic.data.theme, MIN_FORGE_PAYLOAD.theme);
  assert.equal(persistedRelic.data.lore, MIN_FORGE_PAYLOAD.lore);
  assert.deepEqual(persistedRelic.data.effects, MIN_FORGE_PAYLOAD.effects);
  assert.equal(numeric(persistedRelic.data.favor_spent, "persisted invested Favor"), MIN_FORGE_COST);

  const forgeLedger = requireSingleRow(
    "Forge Favor ledger",
    (
      await expectPass("Forge read successful Favor ledger", () =>
        client
          .from("currency_ledger")
          .select("amount,balance_after,source_type,source_id,idempotency_key")
          .eq("currency_key", "favor")
          .eq("idempotency_key", successRequestId),
      )
    ).data,
  );
  assert.equal(forgeLedger.source_type, "relic_forge_save");
  assert.equal(forgeLedger.source_id, successRequestId);
  assert.equal(numeric(forgeLedger.amount, "Forge ledger amount"), -MIN_FORGE_COST);
  assert.equal(
    numeric(forgeLedger.balance_after, "Forge ledger balance"),
    numeric(firstSave.data.favor.balance, "Forge result balance"),
  );

  const finalAccount = requireSingleRow(
    "Forge final Favor account",
    (
      await expectPass("Forge read final Favor account", () =>
        client.from("currency_accounts").select("balance").eq("currency_key", "favor"),
      )
    ).data,
  );
  const finalMirror = await readFavorMirror(client, userId, "Forge");
  assert.equal(numeric(finalAccount.balance, "Forge account balance"), numeric(firstSave.data.favor.balance, "Forge result balance"));
  assert.equal(numeric(finalMirror.data?.points, "Forge mirror points"), numeric(firstSave.data.favor.balance, "Forge result balance"));

  await expectRejected("owner direct relic update", () =>
    client.from("user_relics").update({ data: persistedRelic.data }).eq("id", relicId),
  );
  await expectRejected("owner direct Favor account update", () =>
    client.from("currency_accounts").update({ balance }).eq("user_id", userId).eq("currency_key", "favor"),
  );
}

function loadRepositoryFixtureContract(config, cwd) {
  verifyRepositoryFixtureGitState(cwd);
  let bootstrap;
  let enable;
  let allowlist;
  try {
    bootstrap = readFileSync(PHASE_2_FIXTURE_PATHS.bootstrap);
    enable = readFileSync(PHASE_2_FIXTURE_PATHS.enable);
    allowlist = JSON.parse(readFileSync(PHASE_2_FIXTURE_PATHS.allowlist, "utf8"));
  } catch (error) {
    throw new Error(`Could not read fixed disposable fixture files: ${error.message}`);
  }
  assertFixtureDigest("Phase 2 bootstrap SQL", bootstrap, PHASE_2_FIXTURE_DIGESTS.bootstrap);
  assertFixtureDigest("Phase 2 enable SQL", enable, PHASE_2_FIXTURE_DIGESTS.enable);
  assertDisposableProjectAllowlist(allowlist, config.projectRef, Date.now(), config.fixtureMarker);
  return allowlist;
}

export async function runPhase2Smoke({ env = process.env, cwd = process.cwd() } = {}) {
  const baseConfig = getPhase2SmokeConfig(env);
  const allowlist = loadRepositoryFixtureContract(baseConfig, cwd);
  const config = { ...baseConfig, allowlistExpiresAt: allowlist.expires_at };
  console.log(
    `PREFLIGHT disposable project ${config.projectRef} accepted from ${PHASE_2_FIXTURE_RELATIVE_PATHS.allowlist}.`,
  );
  console.log(
    `PREFLIGHT pinned bootstrap ${PHASE_2_FIXTURE_DIGESTS.bootstrap}; pinned enable ${PHASE_2_FIXTURE_DIGESTS.enable}; teardown ${config.teardownContract}.`,
  );

  const clientA = createSmokeClient(config, config.userA.accessToken);
  const clientB = createSmokeClient(config, config.userB.accessToken);
  const anonymousClient = createSmokeClient(config);
  const userA = config.userA;
  const userB = config.userB;

  const sentinelResult = await expectPass("disposable database sentinel", () =>
    clientA.rpc("assert_phase2_disposable_smoke_target"),
  );
  assertDisposableSentinel(sentinelResult.data, config);

  await verifyFreshFixture(clientA, userA.id, "user A", config.expectedStartingFavor.userA, {
    fixtureMarker: config.fixtureMarker,
    requireIsolationTrophy: true,
  });
  await verifyFreshFixture(clientB, userB.id, "user B", config.expectedStartingFavor.userB, {
    fixtureMarker: config.fixtureMarker,
    requireIsolationTrophy: false,
  });

  const timingCastStartedAt = performance.now();
  const timingCastResult = await clientA.rpc("start_starfishing_timing_test");
  if (timingCastResult.error) {
    const availability = classifyRpcAvailabilityError(timingCastResult.error);
    if (availability === "disabled") {
      throw new Error(
        `Starfishing timing RPC is disabled. Apply ${PHASE_2_FIXTURE_RELATIVE_PATHS.bootstrap} before ${PHASE_2_FIXTURE_RELATIVE_PATHS.enable} on the disposable database, then rerun.`,
      );
    }
    if (availability === "missing") {
      throw new Error(
        `Starfishing timing RPC is missing. Apply ${PHASE_2_FIXTURE_RELATIVE_PATHS.bootstrap} before ${PHASE_2_FIXTURE_RELATIVE_PATHS.enable} on the disposable database.`,
      );
    }
    throw new Error(`start_starfishing_timing_test preflight failed: ${errorText(timingCastResult.error)}`);
  }
  const timingCast = timingCastResult.data;
  assert.ok(timingCast.ticket_id, "Timing-test cast response is missing ticket_id");
  assert.ok(timingCast.fish_key, "Timing-test cast response is missing fish_key");
  assertEarlyClaimMargin(timingCast.not_before);
  const earlyParams = buildClaimParams({
    ticketId: timingCast.ticket_id,
    idempotencyKey: randomUUID(),
    qteLength: timingCast.qte_length,
    durationMs: performance.now() - timingCastStartedAt,
  });
  await expectRejected(
    "too-early Starfishing claim",
    () => clientA.rpc("claim_starfishing_catch", earlyParams),
    /claim is too early/i,
  );

  await expectRejected("anonymous disposable sentinel", () =>
    anonymousClient.rpc("assert_phase2_disposable_smoke_target"),
  );
  await expectRejected("anonymous Starfishing timing cast", () =>
    anonymousClient.rpc("start_starfishing_timing_test"),
  );
  await expectRejected("anonymous Starfishing cast", () => anonymousClient.rpc("start_starfishing_cast"));

  const crossUserParams = buildClaimParams({
    ticketId: timingCast.ticket_id,
    idempotencyKey: randomUUID(),
    qteLength: timingCast.qte_length,
    durationMs: performance.now() - timingCastStartedAt,
  });
  await expectRejected(
    "cross-user Starfishing claim",
    () => clientB.rpc("claim_starfishing_catch", crossUserParams),
    /does not belong to caller/i,
  );

  const castStartedAt = performance.now();
  const castResult = await clientA.rpc("start_starfishing_cast");
  if (castResult.error) {
    const availability = classifyRpcAvailabilityError(castResult.error);
    if (availability === "disabled") {
      throw new Error(
        `Starfishing production RPCs are disabled. Apply ${PHASE_2_FIXTURE_RELATIVE_PATHS.enable} on the disposable database, then rerun.`,
      );
    }
    if (availability === "missing") {
      throw new Error("Starfishing Phase 2 RPCs are missing on the disposable database.");
    }
    throw new Error(`start_starfishing_cast preflight failed: ${errorText(castResult.error)}`);
  }
  console.log("PASS authenticated Starfishing production cast RPC is explicitly enabled");

  const cast = castResult.data;
  assert.ok(cast.ticket_id, "Cast response is missing ticket_id");
  assert.ok(cast.fish_key, "Cast response is missing fish_key");
  const claimId = randomUUID();
  const waitMs = millisecondsUntil(cast.not_before);
  assert.ok(waitMs <= 30000, `Cast not_before is unexpectedly far away (${waitMs}ms)`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const claimParams = buildClaimParams({
    ticketId: cast.ticket_id,
    idempotencyKey: claimId,
    qteLength: cast.qte_length,
    durationMs: performance.now() - castStartedAt,
  });
  const firstClaim = (await expectPass("first Starfishing claim", () =>
    clientA.rpc("claim_starfishing_catch", claimParams),
  )).data;
  const repeatedClaim = (await expectPass("replayed Starfishing claim", () =>
    clientA.rpc("claim_starfishing_catch", claimParams),
  )).data;
  assert.equal(firstClaim.replayed, false);
  assert.equal(repeatedClaim.replayed, true);
  assert.equal(repeatedClaim.catch.id, firstClaim.catch.id);
  assert.equal(repeatedClaim.favor.balance, firstClaim.favor.balance);

  const catchRows = (await expectPass("read claim catch", () =>
    clientA
      .from("game_catches")
      .select("id,user_id,fish_key,size,idempotency_key,play_evidence,result_snapshot,created_at")
      .eq("idempotency_key", claimId),
  )).data;
  const catchRow = requireSingleRow("catch", catchRows);
  assert.equal(catchRow.id, firstClaim.catch.id);
  assert.equal(catchRow.user_id, userA.id);
  assert.deepEqual(catchRow.result_snapshot, firstClaim);
  assert.equal(numeric(catchRow.play_evidence.qte_action_count, "persisted QTE actions"), claimParams.claim_qte_action_count);
  assert.equal(numeric(catchRow.play_evidence.miss_count, "persisted misses"), claimParams.claim_miss_count);
  assert.equal(numeric(catchRow.play_evidence.duration_ms, "persisted duration"), claimParams.claim_duration_ms);
  assert.equal(Number(catchRow.size), Number(firstClaim.catch.size));
  assertSameTimestamp(catchRow.created_at, firstClaim.catch.caught_at, "catch");

  const ledgerRows = (await expectPass("read claim Favor ledger", () =>
    clientA
      .from("currency_ledger")
      .select("id,user_id,amount,balance_after,source_type,source_id,idempotency_key")
      .eq("currency_key", "favor")
      .eq("source_type", "starfishing_catch")
      .eq("idempotency_key", claimId),
  )).data;
  const ledgerRow = requireSingleRow("ledger", ledgerRows);
  assert.equal(ledgerRow.user_id, userA.id);
  assert.equal(ledgerRow.source_id, firstClaim.catch.id);
  assert.equal(numeric(ledgerRow.amount, "ledger amount"), numeric(firstClaim.favor.delta, "claim Favor delta"));
  assert.equal(numeric(ledgerRow.balance_after, "ledger balance"), numeric(firstClaim.favor.balance, "claim balance"));

  const fishpediaRows = (await expectPass("read matching Fishpedia row", () =>
    clientA
      .from("user_fishpedia")
      .select("user_id,fish_key,caught_count,smallest_size,largest_size,first_caught_at,last_caught_at")
      .eq("fish_key", firstClaim.catch.fish_key),
  )).data;
  const fishpediaRow = requireSingleRow("Fishpedia", fishpediaRows);
  assert.equal(fishpediaRow.caught_count, firstClaim.fishpedia.caught_count);
  assert.equal(Number(fishpediaRow.smallest_size), Number(firstClaim.fishpedia.smallest_size));
  assert.equal(Number(fishpediaRow.largest_size), Number(firstClaim.fishpedia.largest_size));
  assertSameTimestamp(fishpediaRow.first_caught_at, firstClaim.fishpedia.first_caught_at, "Fishpedia first catch");
  assertSameTimestamp(fishpediaRow.last_caught_at, firstClaim.fishpedia.last_caught_at, "Fishpedia last catch");

  await verifyMaterialRewards(clientA, userA.id, claimId, firstClaim.catch.id, firstClaim.materials);

  const accountRows = (await expectPass("read authoritative Favor account", () =>
    clientA.from("currency_accounts").select("user_id,balance").eq("currency_key", "favor"),
  )).data;
  const accountRow = requireSingleRow("Favor account", accountRows);
  const mirrorRow = await readFavorMirror(clientA, userA.id, "Starfishing");
  assert.equal(numeric(accountRow.balance, "account balance"), numeric(mirrorRow.data?.points, "mirror points"));
  assert.equal(numeric(accountRow.balance, "account balance"), numeric(firstClaim.favor.balance, "claim balance"));

  await verifyForge(clientA, userA.id);
  await verifyNonVacuousOwnerIsolation(clientA, clientB, userA.id);
  await expectRejected("cross-user catch write", () =>
    clientB.from("game_catches").update({ duplicate_policy: "keep" }).eq("id", firstClaim.catch.id),
  );

  console.log(`Phase 2 database/RLS smoke complete for claim ${claimId}.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runPhase2Smoke().catch((error) => {
    console.error(`PREFLIGHT/SMOKE FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
