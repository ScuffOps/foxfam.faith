import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as smoke from "./starfishing-phase2-smoke.mjs";
import {
  KNOWN_LIVE_PROJECT_REF,
  PHASE_2_OWNER_PROJECTIONS,
  assertDisposableProjectAllowlist,
  assertDisposableSentinel,
  assertEarlyClaimMargin,
  assertFreshFixtureState,
  buildClaimParams,
  classifyRpcAvailabilityError,
  getPhase2SmokeConfig,
  millisecondsUntil,
  requireSingleRow,
} from "./starfishing-phase2-smoke.mjs";

function fakeUserToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
      exp: 4102444800,
    }),
  ).toString("base64url");
  return `${header}.${payload}.test-signature`;
}

const disposableEnv = Object.freeze({
  STARFISHING_E2E_DISPOSABLE: "1",
  STARFISHING_E2E_PROJECT_REF: "abcdefghijklmnopqrst",
  STARFISHING_E2E_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_disposable_test",
  STARFISHING_E2E_FIXTURE_MARKER: "0123456789abcdef0123456789abcdef",
  STARFISHING_E2E_TEARDOWN_CONTRACT: "DELETE_DISPOSABLE_PROJECT_AFTER_RUN",
  STARFISHING_E2E_USER_A_STARTING_FAVOR: "50",
  STARFISHING_E2E_USER_B_STARTING_FAVOR: "0",
  STARFISHING_E2E_USER_A_ACCESS_TOKEN: fakeUserToken("00000000-0000-4000-8000-000000000001"),
  STARFISHING_E2E_USER_B_ACCESS_TOKEN: fakeUserToken("00000000-0000-4000-8000-000000000002"),
});

test("smoke config ignores normal VITE Supabase fallback variables", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        VITE_SUPABASE_URL: "https://ordinary-app.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "ordinary-key",
      }),
    /STARFISHING_E2E_DISPOSABLE=1/,
  );
});

test("smoke config rejects dynamic SQL and allowlist paths", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_PROJECT_ALLOWLIST: "/tmp/allowlist.json",
      }),
    /Dynamic allowlist and SQL paths are not accepted/,
  );
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_ENABLE_MIGRATION: "/tmp/enable.sql",
      }),
    /Dynamic allowlist and SQL paths are not accepted/,
  );
});

test("smoke config rejects the known live Foxfam project", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_PROJECT_REF: KNOWN_LIVE_PROJECT_REF,
        STARFISHING_E2E_SUPABASE_URL: `https://${KNOWN_LIVE_PROJECT_REF}.supabase.co`,
      }),
    /Refusing known live Foxfam Supabase project/,
  );
});

test("smoke config accepts only the exact standard Supabase project host", () => {
  for (const url of [
    "https://custom.example.com",
    "https://abcdefghijklmnopqrst.supabase.in",
    "https://other-project-ref.supabase.co",
    "http://abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co/rest/v1",
    "https://user@abcdefghijklmnopqrst.supabase.co",
  ]) {
    assert.throws(
      () => getPhase2SmokeConfig({ ...disposableEnv, STARFISHING_E2E_SUPABASE_URL: url }),
      /exact standard Supabase project host/,
      url,
    );
  }
});

test("smoke config requires fixture identity, teardown, and deterministic Favor balances", () => {
  assert.throws(
    () => getPhase2SmokeConfig({ ...disposableEnv, STARFISHING_E2E_FIXTURE_MARKER: "" }),
    /FIXTURE_MARKER/,
  );
  assert.throws(
    () => getPhase2SmokeConfig({ ...disposableEnv, STARFISHING_E2E_TEARDOWN_CONTRACT: "keep-it" }),
    /DELETE_DISPOSABLE_PROJECT_AFTER_RUN/,
  );
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_USER_A_STARTING_FAVOR: "not-an-integer",
      }),
    /safe non-negative integer/,
  );
});

test("smoke config requires two distinct pre-issued authenticated users", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_USER_B_ACCESS_TOKEN: disposableEnv.STARFISHING_E2E_USER_A_ACCESS_TOKEN,
      }),
    /distinct authenticated users/,
  );
});

test("smoke config rejects wrong-project and non-authenticated user tokens", () => {
  const wrongProjectToken = disposableEnv.STARFISHING_E2E_USER_A_ACCESS_TOKEN.replace(
    Buffer.from(
      JSON.stringify({
        sub: "00000000-0000-4000-8000-000000000001",
        role: "authenticated",
        aud: "authenticated",
        iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
        exp: 4102444800,
      }),
    ).toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: "00000000-0000-4000-8000-000000000001",
        role: "authenticated",
        aud: "authenticated",
        iss: "https://wrongwrongwrongwrongwr.supabase.co/auth/v1",
        exp: 4102444800,
      }),
    ).toString("base64url"),
  );
  assert.throws(
    () => getPhase2SmokeConfig({ ...disposableEnv, STARFISHING_E2E_USER_A_ACCESS_TOKEN: wrongProjectToken }),
    /issuer/,
  );
  const anonPayload = Buffer.from(
    JSON.stringify({
      sub: "00000000-0000-4000-8000-000000000001",
      role: "anon",
      iss: "https://abcdefghijklmnopqrst.supabase.co/auth/v1",
      exp: 4102444800,
    }),
  ).toString("base64url");
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_USER_A_ACCESS_TOKEN: `e30.${anonPayload}.test-signature`,
      }),
    /authenticated role/,
  );
});

test("smoke config rejects privileged Supabase keys", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never-use-this",
      }),
    /Refusing a privileged Supabase key/,
  );
});

test("smoke config returns explicit disposable credentials", () => {
  assert.deepEqual(getPhase2SmokeConfig(disposableEnv), {
    supabaseUrl: disposableEnv.STARFISHING_E2E_SUPABASE_URL,
    publishableKey: disposableEnv.STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY,
    userA: {
      id: "00000000-0000-4000-8000-000000000001",
      accessToken: disposableEnv.STARFISHING_E2E_USER_A_ACCESS_TOKEN,
    },
    userB: {
      id: "00000000-0000-4000-8000-000000000002",
      accessToken: disposableEnv.STARFISHING_E2E_USER_B_ACCESS_TOKEN,
    },
    projectRef: disposableEnv.STARFISHING_E2E_PROJECT_REF,
    fixtureMarker: disposableEnv.STARFISHING_E2E_FIXTURE_MARKER,
    teardownContract: disposableEnv.STARFISHING_E2E_TEARDOWN_CONTRACT,
    expectedStartingFavor: {
      userA: 50,
      userB: 0,
    },
  });
});

test("disposable fixture forces and verifies a real duplicate release conversion", () => {
  const bootstrap = readFileSync(new URL("./fixtures/starfishing-phase2/bootstrap.sql", import.meta.url), "utf8");
  const enable = readFileSync(new URL("./fixtures/starfishing-phase2/enable.sql", import.meta.url), "utf8");
  const smokeSource = readFileSync(new URL("./starfishing-phase2-smoke.mjs", import.meta.url), "utf8");

  assert.match(bootstrap, /create or replace function public\.start_starfishing_duplicate_test\(\)/i);
  assert.match(bootstrap, /private\.phase2_disposable_smoke_sentinel/);
  assert.match(bootstrap, /from public\.user_fishpedia/);
  assert.match(bootstrap, /revoke all on function public\.start_starfishing_duplicate_test\(\)/i);
  assert.match(enable, /grant execute on function public\.start_starfishing_duplicate_test\(\)\s+to authenticated/i);
  assert.match(smokeSource, /duplicateClaim\.catch\.duplicate, true/);
  assert.match(smokeSource, /duplicateClaim\.catch\.duplicate_policy, "release"/);
  assert.match(smokeSource, /duplicate release Favor ledger/);
});

test("project allowlist must separately authorize the exact ref and remain short lived", () => {
  const allowlist = {
    contract: "starfishing-phase2-disposable-v2",
    project_ref: "abcdefghijklmnopqrst",
    expires_at: "2026-07-20T00:00:00.000Z",
    nonce: "0123456789abcdef0123456789abcdef",
  };
  assert.doesNotThrow(() =>
    assertDisposableProjectAllowlist(allowlist, "abcdefghijklmnopqrst", Date.parse("2026-07-19T00:00:00.000Z")),
  );
  assert.throws(
    () => assertDisposableProjectAllowlist(allowlist, "zyxwvutsrqponmlkjihg", Date.parse("2026-07-19T00:00:00.000Z")),
    /does not match/i,
  );
  assert.throws(
    () => assertDisposableProjectAllowlist(allowlist, "abcdefghijklmnopqrst", Date.parse("2026-07-21T00:00:00.000Z")),
    /expired/,
  );
  assert.throws(
    () =>
      assertDisposableProjectAllowlist(
        { ...allowlist, project_ref: KNOWN_LIVE_PROJECT_REF },
        KNOWN_LIVE_PROJECT_REF,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /known live/i,
  );
  assert.throws(
    () =>
      assertDisposableProjectAllowlist(
        { ...allowlist, project_ref: "", expires_at: "", nonce: "" },
        "abcdefghijklmnopqrst",
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /empty|missing/i,
  );
});

test("database sentinel must exactly match allowlist project, nonce, and expiry", () => {
  const sentinel = {
    project_ref: "abcdefghijklmnopqrst",
    nonce: "0123456789abcdef0123456789abcdef",
    disposable: true,
    expires_at: "2026-07-20T00:00:00.000Z",
    user_a_id: "00000000-0000-4000-8000-000000000001",
    user_b_id: "00000000-0000-4000-8000-000000000002",
    user_a_starting_favor: 50,
    user_b_starting_favor: 0,
  };
  const sentinelConfig = {
    projectRef: "abcdefghijklmnopqrst",
    fixtureMarker: "0123456789abcdef0123456789abcdef",
    allowlistExpiresAt: "2026-07-20T00:00:00.000Z",
    userA: { id: "00000000-0000-4000-8000-000000000001" },
    userB: { id: "00000000-0000-4000-8000-000000000002" },
    expectedStartingFavor: { userA: 50, userB: 0 },
  };
  assert.doesNotThrow(() =>
    assertDisposableSentinel(
      sentinel,
      sentinelConfig,
      Date.parse("2026-07-19T00:00:00.000Z"),
    ),
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, disposable: false },
        sentinelConfig,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /disposable sentinel/i,
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, nonce: "ffffffffffffffffffffffffffffffff" },
        sentinelConfig,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /nonce/i,
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, project_ref: "zyxwvutsrqponmlkjihg" },
        sentinelConfig,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /project ref/i,
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, expires_at: "2026-07-20T01:00:00.000Z" },
        sentinelConfig,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /expiry/i,
  );
});

test("claim params contain only bounded telemetry and server identities", () => {
  assert.deepEqual(
    buildClaimParams({
      ticketId: "ticket-id",
      idempotencyKey: "claim-id",
      qteLength: 4,
      durationMs: 1250.8,
    }),
    {
      claim_ticket_id: "ticket-id",
      claim_idempotency_key: "claim-id",
      claim_duplicate_policy: "release",
      claim_qte_action_count: 4,
      claim_miss_count: 0,
      claim_duration_ms: 1251,
    },
  );
});

test("disabled Starfishing RPC errors receive an actionable classification", () => {
  assert.equal(
    classifyRpcAvailabilityError({
      code: "42501",
      message: "permission denied for function start_starfishing_cast",
    }),
    "disabled",
  );
  assert.equal(classifyRpcAvailabilityError({ code: "PGRST202", message: "not found" }), "missing");
  assert.equal(classifyRpcAvailabilityError({ code: "22023", message: "bad input" }), "other");
});

test("fixed disposable SQL is digest-pinned and altered bytes fail", () => {
  assert.equal(typeof smoke.assertFixtureDigest, "function");
  assert.equal(typeof smoke.PHASE_2_FIXTURE_PATHS?.bootstrap, "string");
  assert.equal(typeof smoke.PHASE_2_FIXTURE_DIGESTS?.bootstrap, "string");
  const bootstrap = readFileSync(smoke.PHASE_2_FIXTURE_PATHS.bootstrap);
  const enable = readFileSync(smoke.PHASE_2_FIXTURE_PATHS.enable);
  assert.doesNotThrow(() =>
    smoke.assertFixtureDigest("bootstrap SQL", bootstrap, smoke.PHASE_2_FIXTURE_DIGESTS.bootstrap),
  );
  assert.doesNotThrow(() =>
    smoke.assertFixtureDigest("enable SQL", enable, smoke.PHASE_2_FIXTURE_DIGESTS.enable),
  );
  assert.throws(
    () =>
      smoke.assertFixtureDigest(
        "bootstrap SQL",
        Buffer.concat([bootstrap, Buffer.from("\n-- altered")]),
        smoke.PHASE_2_FIXTURE_DIGESTS.bootstrap,
      ),
    /digest mismatch/i,
  );
  assert.throws(
    () => smoke.assertFixtureDigest("bootstrap SQL", bootstrap, "0".repeat(64)),
    /digest mismatch/i,
  );
  assert.throws(
    () =>
      smoke.assertFixtureDigest(
        "enable SQL",
        Buffer.concat([enable, Buffer.from("\nrevoke all on schema public from public;")]),
        smoke.PHASE_2_FIXTURE_DIGESTS.enable,
      ),
    /digest mismatch/i,
  );
});

test("committed allowlist is intentionally empty and fails closed until reviewed", () => {
  const allowlist = JSON.parse(readFileSync(smoke.PHASE_2_FIXTURE_PATHS.allowlist, "utf8"));
  assert.throws(
    () => assertDisposableProjectAllowlist(allowlist, "abcdefghijklmnopqrst"),
    /empty|missing/i,
  );
});

test("fixture git-state validation rejects dirty and untracked fixed allowlists", () => {
  assert.equal(typeof smoke.assertRepositoryFixtureGitState, "function");
  assert.doesNotThrow(() =>
    smoke.assertRepositoryFixtureGitState({
      trackedPaths: Object.values(smoke.PHASE_2_FIXTURE_RELATIVE_PATHS),
      statusOutput: "",
    }),
  );
  assert.throws(
    () =>
      smoke.assertRepositoryFixtureGitState({
        trackedPaths: Object.values(smoke.PHASE_2_FIXTURE_RELATIVE_PATHS),
        statusOutput: " M scripts/fixtures/starfishing-phase2/allowlist.json",
      }),
    /committed and clean/i,
  );
  assert.throws(
    () =>
      smoke.assertRepositoryFixtureGitState({
        trackedPaths: Object.values(smoke.PHASE_2_FIXTURE_RELATIVE_PATHS).filter(
          (entry) => !entry.endsWith("allowlist.json"),
        ),
        statusOutput: "?? scripts/fixtures/starfishing-phase2/allowlist.json",
      }),
    /tracked|committed and clean/i,
  );
});

test("owner-table projections use real schema keys", () => {
  assert.deepEqual(PHASE_2_OWNER_PROJECTIONS, {
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
});

test("early-claim margin must be large enough to prove timing deterministically", () => {
  assert.equal(assertEarlyClaimMargin("2026-07-19T00:00:10.000Z", Date.parse("2026-07-19T00:00:00.000Z")), 10000);
  assert.throws(
    () => assertEarlyClaimMargin("2026-07-19T00:00:09.999Z", Date.parse("2026-07-19T00:00:00.000Z")),
    /not_before margin/i,
  );
});

test("millisecondsUntil adds a small transport margin and never returns negative", () => {
  assert.equal(millisecondsUntil("2026-07-18T00:00:01.000Z", Date.parse("2026-07-18T00:00:00.000Z")), 1100);
  assert.equal(millisecondsUntil("2026-07-18T00:00:00.000Z", Date.parse("2026-07-18T00:00:01.000Z")), 0);
});

test("requireSingleRow rejects zero or duplicate result rows", () => {
  assert.deepEqual(requireSingleRow("catch", [{ id: "one" }]), { id: "one" });
  assert.throws(() => requireSingleRow("catch", []), /exactly one catch row; received 0/);
  assert.throws(() => requireSingleRow("ledger", [{}, {}]), /exactly one ledger row; received 2/);
});

test("fresh fixture assertion rejects prior mutable state or an unexpected Favor balance", () => {
  const pristine = {
    game_catches: [],
    user_fishpedia: [],
    user_material_balances: [],
    material_ledger: [],
    user_achievements: [],
    user_trophies: [
      {
        id: "fixture-trophy",
        trophy_key: "phase2-smoke-isolation",
        data: { fixture_nonce: "phase2-20260718-a1" },
      },
    ],
    user_relics: [],
    user_relic_charms: [],
    currency_ledger: [{ source_type: "legacy_opening_balance" }],
    currency_accounts: [{ balance: 50 }],
  };

  assert.doesNotThrow(() =>
    assertFreshFixtureState("user A", pristine, 50, {
      fixtureMarker: "phase2-20260718-a1",
      requireIsolationTrophy: true,
    }),
  );
  assert.throws(
    () =>
      assertFreshFixtureState("user A", { ...pristine, game_catches: [{ id: "old" }] }, 50, {
        fixtureMarker: "phase2-20260718-a1",
        requireIsolationTrophy: true,
      }),
    /fresh fixture.*game_catches/i,
  );
  assert.throws(
    () =>
      assertFreshFixtureState(
        "user A",
        { ...pristine, currency_ledger: [{ source_type: "starfishing_catch" }] },
        50,
        { fixtureMarker: "phase2-20260718-a1", requireIsolationTrophy: true },
      ),
    /fresh fixture.*currency_ledger/i,
  );
  assert.throws(
    () =>
      assertFreshFixtureState("user A", { ...pristine, currency_accounts: [{ balance: 49 }] }, 50, {
        fixtureMarker: "phase2-20260718-a1",
        requireIsolationTrophy: true,
      }),
    /expected starting Favor/i,
  );
  assert.throws(
    () =>
      assertFreshFixtureState("user A", { ...pristine, user_trophies: [] }, 50, {
        fixtureMarker: "phase2-20260718-a1",
        requireIsolationTrophy: true,
      }),
    /isolation trophy/i,
  );
});
