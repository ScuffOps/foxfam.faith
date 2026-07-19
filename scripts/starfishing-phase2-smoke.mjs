import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const KNOWN_LIVE_PROJECT_REF = "wdypokgdqgvqpyabvshq";

const ENABLE_MIGRATION_ENV = "STARFISHING_E2E_ENABLE_MIGRATION";
const REQUIRED_ENV = Object.freeze([
  "STARFISHING_E2E_SUPABASE_URL",
  "STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY",
  "STARFISHING_E2E_USER_A_EMAIL",
  "STARFISHING_E2E_USER_A_PASSWORD",
  "STARFISHING_E2E_USER_B_EMAIL",
  "STARFISHING_E2E_USER_B_PASSWORD",
]);

const MAX_FORGE_PAYLOAD = Object.freeze({
  name: "Phase Two Maximum Relic",
  base_type: "mask",
  theme: "celestial",
  lore: "A disposable database relic used to prove atomic Favor rollback and replay behavior.",
  effects: ["blue-flame", "star-orbit", "petal-drift", "sigil-glow", "snow-dots", "lore-script"],
});

const MIN_FORGE_PAYLOAD = Object.freeze({
  name: "Phase Two Small Relic",
  base_type: "tome",
  theme: "celestial",
  lore: "A disposable database relic used to prove an idempotent Forge save and replay.",
  effects: ["snow-dots"],
});

const MAX_FORGE_COST = 133;
const MIN_FORGE_COST = 43;

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

export function getPhase2SmokeConfig(env = process.env) {
  if (env.STARFISHING_E2E_DISPOSABLE !== "1") {
    throw new Error(
      "Set STARFISHING_E2E_DISPOSABLE=1 only for an isolated disposable Supabase database. Normal VITE_* settings are never used.",
    );
  }

  for (const key of REQUIRED_ENV) requiredValue(env, key);

  const supabaseUrl = requiredValue(env, "STARFISHING_E2E_SUPABASE_URL");
  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("STARFISHING_E2E_SUPABASE_URL must be an absolute URL.");
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error("STARFISHING_E2E_SUPABASE_URL must use http or https.");
  }
  if (`${parsedUrl.hostname}${parsedUrl.pathname}`.includes(KNOWN_LIVE_PROJECT_REF)) {
    throw new Error(`Refusing known live Foxfam Supabase project ${KNOWN_LIVE_PROJECT_REF}.`);
  }

  const userA = {
    email: requiredValue(env, "STARFISHING_E2E_USER_A_EMAIL"),
    password: requiredValue(env, "STARFISHING_E2E_USER_A_PASSWORD"),
  };
  const userB = {
    email: requiredValue(env, "STARFISHING_E2E_USER_B_EMAIL"),
    password: requiredValue(env, "STARFISHING_E2E_USER_B_PASSWORD"),
  };
  if (userA.email.toLowerCase() === userB.email.toLowerCase()) {
    throw new Error("Phase 2 smoke requires two distinct test accounts.");
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
  };
}

export function assertExplicitEnableMigration(source, migrationPath) {
  const castGrant = /grant\s+execute\s+on\s+function\s+public\.start_starfishing_cast\(\)\s+to\s+authenticated\s*;/i;
  const claimGrant = /grant\s+execute\s+on\s+function\s+public\.claim_starfishing_catch\(\s*uuid\s*,\s*uuid\s*,\s*text\s*,\s*integer\s*,\s*integer\s*,\s*integer\s*\)\s+to\s+authenticated\s*;/i;
  if (!castGrant.test(source) || !claimGrant.test(source)) {
    throw new Error(
      `${migrationPath} must explicitly grant both Starfishing RPCs to authenticated. The smoke harness will never enable them itself.`,
    );
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

export function requireSingleRow(label, rows) {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Expected exactly one ${label} row; received ${Array.isArray(rows) ? rows.length : "non-array"}.`);
  }
  return rows[0];
}

function createSmokeClient(config) {
  return createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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

async function signIn(client, label, credentials) {
  const result = await expectPass(`${label} sign in`, () => client.auth.signInWithPassword(credentials));
  assert.ok(result.data.user?.id, `${label} sign in did not return a user id`);
  return result.data.user;
}

function numeric(value, label) {
  const result = Number(value);
  assert.ok(Number.isSafeInteger(result), `${label} must be a JavaScript-safe integer`);
  return result;
}

function assertUnchanged(before, after, label) {
  assert.deepEqual(after, before, `${label} changed despite a rejected transaction`);
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
  const maximumFavorDue = Math.max(0, MAX_FORGE_COST - investedFavor);
  const maximumRequestId = randomUUID();
  const maximumAttempt = await client.rpc("save_user_relic_with_favor", {
    relic_payload: MAX_FORGE_PAYLOAD,
    request_id: maximumRequestId,
  });

  if (maximumAttempt.error && /relic forge is closed/i.test(errorText(maximumAttempt.error))) {
    console.log("SKIP Forge transaction checks: disposable database relic_roll_gate is closed.");
  } else if (balance < maximumFavorDue) {
    assert.ok(maximumAttempt.error, "Maximum Forge save should reject an insufficient balance");
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

    const repeatedFailure = await client.rpc("save_user_relic_with_favor", {
      relic_payload: MAX_FORGE_PAYLOAD,
      request_id: maximumRequestId,
    });
    assert.ok(repeatedFailure.error, "Rolled-back Forge request should reject again");
    assert.match(errorText(repeatedFailure.error), /insufficient favor balance/i);
    console.log("PASS Forge failed request leaves no replay receipt");

    const minimumFavorDue = Math.max(0, MIN_FORGE_COST - investedFavor);
    if (balance >= minimumFavorDue) {
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
    } else {
      console.log(
        `SKIP successful Forge replay: test account has ${balance} Favor; ${minimumFavorDue} additional Favor required.`,
      );
    }
  } else {
    if (maximumAttempt.error) throw new Error(`Forge maximum save failed: ${errorText(maximumAttempt.error)}`);
    assert.equal(maximumAttempt.data.replayed, false);
    const replayedSave = await expectPass("Forge maximum save replay", () =>
      client.rpc("save_user_relic_with_favor", {
        relic_payload: MAX_FORGE_PAYLOAD,
        request_id: maximumRequestId,
      }),
    );
    assert.equal(replayedSave.data.replayed, true);
    assert.equal(replayedSave.data.relic.id, maximumAttempt.data.relic.id);
    assert.equal(replayedSave.data.favor.balance, maximumAttempt.data.favor.balance);
    console.log(`SKIP Forge insufficient-balance case: test account already has ${balance} Favor.`);
  }

  await expectRejected("owner direct relic update", () =>
    client.from("user_relics").update({ data: beforeRelic.data }).eq("id", relicId),
  );
  await expectRejected("owner direct Favor account update", () =>
    client.from("currency_accounts").update({ balance }).eq("user_id", userId).eq("currency_key", "favor"),
  );
}

function resolveEnableMigration(env, cwd) {
  const configuredPath = requiredValue(env, ENABLE_MIGRATION_ENV);
  const migrationPath = path.resolve(cwd, configuredPath);
  const migrationsRoot = `${path.resolve(cwd, "supabase/migrations")}${path.sep}`;
  if (!migrationPath.startsWith(migrationsRoot) || !migrationPath.endsWith(".sql")) {
    throw new Error(`${ENABLE_MIGRATION_ENV} must point to a SQL file under supabase/migrations.`);
  }
  let source;
  try {
    source = readFileSync(migrationPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${configuredPath}: ${error.message}`);
  }
  assertExplicitEnableMigration(source, configuredPath);
  return configuredPath;
}

export async function runPhase2Smoke({ env = process.env, cwd = process.cwd() } = {}) {
  const config = getPhase2SmokeConfig(env);
  const enableMigration = resolveEnableMigration(env, cwd);
  console.log(`PREFLIGHT disposable target accepted; RPC enable contract: ${enableMigration}`);
  console.log("PREFLIGHT no users will be created or deleted; no migration will be applied by this harness.");

  const clientA = createSmokeClient(config);
  const clientB = createSmokeClient(config);
  const anonymousClient = createSmokeClient(config);
  const userA = await signIn(clientA, "user A", config.userA);
  const userB = await signIn(clientB, "user B", config.userB);
  assert.notEqual(userA.id, userB.id, "Test credentials resolved to the same authenticated user");

  const castResult = await clientA.rpc("start_starfishing_cast");
  if (castResult.error) {
    const availability = classifyRpcAvailabilityError(castResult.error);
    if (availability === "disabled") {
      throw new Error(
        `Starfishing RPCs are still disabled on the disposable database. Apply ${enableMigration} there explicitly, then rerun. The harness did not change grants.`,
      );
    }
    if (availability === "missing") {
      throw new Error(
        "Starfishing Phase 2 RPCs are missing on the disposable database. Apply the Phase 2 schema and the explicit enable migration there, then rerun.",
      );
    }
    throw new Error(`start_starfishing_cast preflight failed: ${errorText(castResult.error)}`);
  }
  console.log("PASS authenticated Starfishing cast RPC is explicitly enabled");

  await expectRejected("anonymous Starfishing cast", () => anonymousClient.rpc("start_starfishing_cast"));

  const cast = castResult.data;
  assert.ok(cast.ticket_id, "Cast response is missing ticket_id");
  assert.ok(cast.fish_key, "Cast response is missing fish_key");
  const waitMs = millisecondsUntil(cast.not_before);
  assert.ok(waitMs <= 30000, `Cast not_before is unexpectedly far away (${waitMs}ms)`);
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  const claimId = randomUUID();
  const claimParams = buildClaimParams({
    ticketId: cast.ticket_id,
    idempotencyKey: claimId,
    qteLength: cast.qte_length,
    durationMs: waitMs,
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
      .select("id,user_id,fish_key,idempotency_key,result_snapshot")
      .eq("idempotency_key", claimId),
  )).data;
  const catchRow = requireSingleRow("catch", catchRows);
  assert.equal(catchRow.id, firstClaim.catch.id);

  const ledgerRows = (await expectPass("read claim Favor ledger", () =>
    clientA
      .from("currency_ledger")
      .select("id,user_id,amount,balance_after,source_type,source_id,idempotency_key")
      .eq("currency_key", "favor")
      .eq("source_type", "starfishing_catch")
      .eq("idempotency_key", claimId),
  )).data;
  const ledgerRow = requireSingleRow("ledger", ledgerRows);
  assert.equal(ledgerRow.source_id, firstClaim.catch.id);
  assert.equal(numeric(ledgerRow.balance_after, "ledger balance"), numeric(firstClaim.favor.balance, "claim balance"));

  const fishpediaRows = (await expectPass("read matching Fishpedia row", () =>
    clientA
      .from("user_fishpedia")
      .select("user_id,fish_key,caught_count,smallest_size,largest_size")
      .eq("fish_key", firstClaim.catch.fish_key),
  )).data;
  const fishpediaRow = requireSingleRow("Fishpedia", fishpediaRows);
  assert.equal(fishpediaRow.caught_count, firstClaim.fishpedia.caught_count);

  const accountRows = (await expectPass("read authoritative Favor account", () =>
    clientA.from("currency_accounts").select("user_id,balance").eq("currency_key", "favor"),
  )).data;
  const accountRow = requireSingleRow("Favor account", accountRows);
  const mirrorRows = (await expectPass("read Favor compatibility mirror", () =>
    clientA
      .from("user_levels")
      .select("id,user_id,data,created_at")
      .eq("user_id", userA.id)
      .order("created_at", { ascending: true })
      .limit(1),
  )).data;
  const mirrorRow = requireSingleRow("Favor mirror", mirrorRows);
  assert.equal(numeric(accountRow.balance, "account balance"), numeric(mirrorRow.data?.points, "mirror points"));
  assert.equal(numeric(accountRow.balance, "account balance"), numeric(firstClaim.favor.balance, "claim balance"));

  const crossUserCatchRead = await expectPass("cross-user catch read is filtered", () =>
    clientB.from("game_catches").select("id").eq("id", firstClaim.catch.id),
  );
  assert.equal(crossUserCatchRead.data.length, 0);
  const crossUserFishpediaRead = await expectPass("cross-user Fishpedia read is filtered", () =>
    clientB.from("user_fishpedia").select("fish_key").eq("user_id", userA.id),
  );
  assert.equal(crossUserFishpediaRead.data.length, 0);
  await expectRejected("cross-user catch write", () =>
    clientB.from("game_catches").update({ duplicate_policy: "keep" }).eq("id", firstClaim.catch.id),
  );

  await verifyForge(clientA, userA.id);
  console.log(`Phase 2 database/RLS smoke complete for claim ${claimId}.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runPhase2Smoke().catch((error) => {
    console.error(`PREFLIGHT/SMOKE FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
