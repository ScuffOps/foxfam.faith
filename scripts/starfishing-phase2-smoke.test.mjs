import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWN_LIVE_PROJECT_REF,
  assertFreshFixtureState,
  buildClaimParams,
  classifyRpcAvailabilityError,
  getPhase2SmokeConfig,
  assertExplicitEnableMigration,
  millisecondsUntil,
  requireSingleRow,
} from "./starfishing-phase2-smoke.mjs";

const disposableEnv = Object.freeze({
  STARFISHING_E2E_DISPOSABLE: "1",
  STARFISHING_E2E_PROJECT_REF: "abcdefghijklmnopqrst",
  STARFISHING_E2E_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  STARFISHING_E2E_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_disposable_test",
  STARFISHING_E2E_FIXTURE_MARKER: "phase2-20260718-a1",
  STARFISHING_E2E_TEARDOWN_CONTRACT: "DELETE_DISPOSABLE_PROJECT_AFTER_RUN",
  STARFISHING_E2E_USER_A_STARTING_FAVOR: "50",
  STARFISHING_E2E_USER_B_STARTING_FAVOR: "0",
  STARFISHING_E2E_USER_A_EMAIL: "phase2-20260718-a1-a@example.test",
  STARFISHING_E2E_USER_A_PASSWORD: "test-password-a",
  STARFISHING_E2E_USER_B_EMAIL: "phase2-20260718-a1-b@example.test",
  STARFISHING_E2E_USER_B_PASSWORD: "test-password-b",
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
        STARFISHING_E2E_USER_A_EMAIL: "unmarked-a@example.test",
      }),
    /must contain the fixture marker/,
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

test("smoke config requires two distinct pre-created test accounts", () => {
  assert.throws(
    () =>
      getPhase2SmokeConfig({
        ...disposableEnv,
        STARFISHING_E2E_USER_B_EMAIL: disposableEnv.STARFISHING_E2E_USER_A_EMAIL,
      }),
    /distinct test accounts/,
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
      email: disposableEnv.STARFISHING_E2E_USER_A_EMAIL,
      password: disposableEnv.STARFISHING_E2E_USER_A_PASSWORD,
    },
    userB: {
      email: disposableEnv.STARFISHING_E2E_USER_B_EMAIL,
      password: disposableEnv.STARFISHING_E2E_USER_B_PASSWORD,
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

test("enable migration preflight requires explicit authenticated grants for both RPCs", () => {
  assert.throws(
    () => assertExplicitEnableMigration("revoke execute on function public.start_starfishing_cast();", "disabled.sql"),
    /must explicitly grant both Starfishing RPCs/,
  );

  assert.doesNotThrow(() =>
    assertExplicitEnableMigration(
      `
        grant execute on function public.start_starfishing_cast() to authenticated;
        grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
          to authenticated;
      `,
      "20260719000000_enable_starfishing_phase2.sql",
    ),
  );

  assert.throws(
    () =>
      assertExplicitEnableMigration(
        `
          -- grant execute on function public.start_starfishing_cast() to authenticated;
          /* grant execute on function public.claim_starfishing_catch(
            uuid, uuid, text, integer, integer, integer
          ) to authenticated; */
        `,
        "commented.sql",
      ),
    /must explicitly grant both Starfishing RPCs/,
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
    user_trophies: [],
    user_relics: [],
    user_relic_charms: [],
    currency_ledger: [{ source_type: "legacy_opening_balance" }],
    currency_accounts: [{ balance: 50 }],
  };

  assert.doesNotThrow(() => assertFreshFixtureState("user A", pristine, 50));
  assert.throws(
    () => assertFreshFixtureState("user A", { ...pristine, game_catches: [{ id: "old" }] }, 50),
    /fresh fixture.*game_catches/i,
  );
  assert.throws(
    () =>
      assertFreshFixtureState(
        "user A",
        { ...pristine, currency_ledger: [{ source_type: "starfishing_catch" }] },
        50,
      ),
    /fresh fixture.*currency_ledger/i,
  );
  assert.throws(
    () => assertFreshFixtureState("user A", { ...pristine, currency_accounts: [{ balance: 49 }] }, 50),
    /expected starting Favor/i,
  );
});
