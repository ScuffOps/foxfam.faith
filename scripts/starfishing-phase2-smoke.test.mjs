import assert from "node:assert/strict";
import test from "node:test";

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
  assertExplicitEnableMigration,
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
  STARFISHING_E2E_PROJECT_ALLOWLIST: "/tmp/starfishing-phase2-disposable-projects.json",
  STARFISHING_E2E_FIXTURE_MARKER: "phase2-20260718-a1",
  STARFISHING_E2E_TEARDOWN_CONTRACT: "DELETE_DISPOSABLE_PROJECT_AFTER_RUN",
  STARFISHING_E2E_USER_A_STARTING_FAVOR: "50",
  STARFISHING_E2E_USER_B_STARTING_FAVOR: "0",
  STARFISHING_E2E_USER_A_ACCESS_TOKEN: fakeUserToken("00000000-0000-4000-8000-000000000001"),
  STARFISHING_E2E_USER_B_ACCESS_TOKEN: fakeUserToken("00000000-0000-4000-8000-000000000002"),
});

const temporaryDisposableSql = `
  create table private.phase2_disposable_smoke_sentinel (
    project_ref text primary key,
    fixture_marker text not null,
    disposable boolean not null,
    expires_at timestamptz not null
  );
  insert into private.phase2_disposable_smoke_sentinel
    (project_ref, fixture_marker, disposable, expires_at)
  values ('abcdefghijklmnopqrst', 'phase2-20260718-a1', true, now() + interval '1 day');
  create or replace function public.assert_phase2_disposable_smoke_target(
    expected_project_ref text,
    expected_fixture_marker text
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare sentinel record;
  begin
    select * into sentinel
    from private.phase2_disposable_smoke_sentinel
    where project_ref = expected_project_ref
      and fixture_marker = expected_fixture_marker
      and disposable is true
      and expires_at > clock_timestamp();
    if sentinel.project_ref is null then raise exception 'Disposable sentinel mismatch'; end if;
    return jsonb_build_object(
      'project_ref', sentinel.project_ref,
      'fixture_marker', sentinel.fixture_marker,
      'disposable', sentinel.disposable,
      'expires_at', sentinel.expires_at
    );
  end;
  $$;
  revoke all on function public.assert_phase2_disposable_smoke_target(text, text) from public, anon;
  grant execute on function public.assert_phase2_disposable_smoke_target(text, text) to authenticated;
  grant execute on function public.start_starfishing_cast() to authenticated;
  grant execute on function public.claim_starfishing_catch(uuid, uuid, text, integer, integer, integer)
    to authenticated;
  insert into public.user_trophies (user_id, trophy_key, data)
  values ('00000000-0000-4000-8000-000000000001', 'phase2-smoke-isolation',
    '{"fixture_marker":"phase2-20260718-a1"}'::jsonb);
`;

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
    projectAllowlistPath: disposableEnv.STARFISHING_E2E_PROJECT_ALLOWLIST,
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

test("project allowlist must separately authorize the exact ref and remain short lived", () => {
  const allowlist = {
    contract: "starfishing-phase2-disposable-projects-v1",
    project_refs: ["abcdefghijklmnopqrst"],
    expires_at: "2026-07-20T00:00:00.000Z",
  };
  assert.doesNotThrow(() =>
    assertDisposableProjectAllowlist(allowlist, "abcdefghijklmnopqrst", Date.parse("2026-07-19T00:00:00.000Z")),
  );
  assert.throws(
    () => assertDisposableProjectAllowlist(allowlist, "zyxwvutsrqponmlkjihg", Date.parse("2026-07-19T00:00:00.000Z")),
    /not allowlisted/,
  );
  assert.throws(
    () => assertDisposableProjectAllowlist(allowlist, "abcdefghijklmnopqrst", Date.parse("2026-07-21T00:00:00.000Z")),
    /expired/,
  );
  assert.throws(
    () =>
      assertDisposableProjectAllowlist(
        { ...allowlist, project_refs: [KNOWN_LIVE_PROJECT_REF] },
        KNOWN_LIVE_PROJECT_REF,
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /known live/i,
  );
});

test("database sentinel must match project and fixture and be unexpired", () => {
  const sentinel = {
    project_ref: "abcdefghijklmnopqrst",
    fixture_marker: "phase2-20260718-a1",
    disposable: true,
    expires_at: "2026-07-20T00:00:00.000Z",
  };
  assert.doesNotThrow(() =>
    assertDisposableSentinel(
      sentinel,
      { projectRef: "abcdefghijklmnopqrst", fixtureMarker: "phase2-20260718-a1" },
      Date.parse("2026-07-19T00:00:00.000Z"),
    ),
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, disposable: false },
        { projectRef: "abcdefghijklmnopqrst", fixtureMarker: "phase2-20260718-a1" },
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /disposable sentinel/i,
  );
  assert.throws(
    () =>
      assertDisposableSentinel(
        { ...sentinel, fixture_marker: "wrong-fixture" },
        { projectRef: "abcdefghijklmnopqrst", fixtureMarker: "phase2-20260718-a1" },
        Date.parse("2026-07-19T00:00:00.000Z"),
      ),
    /fixture marker/i,
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

test("temporary SQL preflight requires sentinel, isolation fixture, and only narrow authenticated grants", () => {
  assert.throws(
    () => assertExplicitEnableMigration("revoke execute on function public.start_starfishing_cast();", "disabled.sql"),
    /must contain the disposable sentinel/,
  );

  assert.doesNotThrow(() => assertExplicitEnableMigration(temporaryDisposableSql, "temporary-disposable.sql"));

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
    /must contain the disposable sentinel/,
  );

  assert.throws(
    () =>
      assertExplicitEnableMigration(
        `${temporaryDisposableSql}
         grant select on table public.user_trophies to authenticated;`,
        "overbroad.sql",
      ),
    /unexpected grant/i,
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
  assert.equal(assertEarlyClaimMargin("2026-07-19T00:00:02.000Z", Date.parse("2026-07-19T00:00:00.000Z")), 2000);
  assert.throws(
    () => assertEarlyClaimMargin("2026-07-19T00:00:00.500Z", Date.parse("2026-07-19T00:00:00.000Z")),
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
        data: { fixture_marker: "phase2-20260718-a1" },
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
