import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

import { getGameRewardSmokeConfig, runSmoke } from "./game-rewards-smoke.mjs";

const EXPECTED_PROJECT_REF = "drauxhhxlatvylzktuqq";
const FIXTURE_MARKER = "codex-game-hub-phase-2";
const TEARDOWN_CONTRACT = "DELETE_DISPOSABLE_PROJECT_AFTER_RUN";

function requiredValue(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}

function assertIsolatedTarget(url) {
  assert.equal(process.env.VITE_GAME_HUB_STAGING, "1", "Staging flag is not enabled.");
  assert.equal(url, `https://${EXPECTED_PROJECT_REF}.supabase.co`, "Refusing a non-isolated Supabase target.");
}

async function accessTokenFor(client, email, password, expectedUserId) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.equal(data.user?.id, expectedUserId, "Authenticated fixture user does not match its expected id.");
  assert.ok(data.session?.access_token, "Fixture sign-in returned no access token.");
  return data.session.access_token;
}

export async function runStagingSmoke() {
  const supabaseUrl = requiredValue("VITE_SUPABASE_URL").replace(/\/$/, "");
  const publishableKey = requiredValue("VITE_SUPABASE_PUBLISHABLE_KEY");
  assertIsolatedTarget(supabaseUrl);

  const userA = {
    id: requiredValue("GAME_REWARDS_STAGING_USER_A_ID"),
    email: requiredValue("GAME_REWARDS_STAGING_USER_A_EMAIL"),
    password: requiredValue("GAME_REWARDS_STAGING_USER_A_PASSWORD"),
  };
  const userB = {
    id: requiredValue("GAME_REWARDS_STAGING_USER_B_ID"),
    email: requiredValue("GAME_REWARDS_STAGING_USER_B_EMAIL"),
    password: requiredValue("GAME_REWARDS_STAGING_USER_B_PASSWORD"),
  };

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenA = await accessTokenFor(authClient, userA.email, userA.password, userA.id);
  await authClient.auth.signOut({ scope: "local" });
  const tokenB = await accessTokenFor(authClient, userB.email, userB.password, userB.id);
  await authClient.auth.signOut({ scope: "local" });

  const config = getGameRewardSmokeConfig({
    GAME_REWARDS_E2E_DISPOSABLE: "1",
    GAME_REWARDS_E2E_PROJECT_REF: EXPECTED_PROJECT_REF,
    GAME_REWARDS_E2E_SUPABASE_URL: supabaseUrl,
    GAME_REWARDS_E2E_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    GAME_REWARDS_E2E_FIXTURE_MARKER: FIXTURE_MARKER,
    GAME_REWARDS_E2E_TEARDOWN_CONTRACT: TEARDOWN_CONTRACT,
    GAME_REWARDS_E2E_USER_A_ACCESS_TOKEN: tokenA,
    GAME_REWARDS_E2E_USER_B_ACCESS_TOKEN: tokenB,
  });

  return runSmoke(config);
}

runStagingSmoke()
  .then((result) => {
    console.log(`Isolated staging reward smoke passed for ${result.claimedGames.join(", ")}.`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
