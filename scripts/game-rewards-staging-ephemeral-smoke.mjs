import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

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

function isolatedConfig() {
  const supabaseUrl = requiredValue("VITE_SUPABASE_URL").replace(/\/$/, "");
  assert.equal(process.env.VITE_GAME_HUB_STAGING, "1", "Staging flag is not enabled.");
  assert.equal(
    supabaseUrl,
    `https://${EXPECTED_PROJECT_REF}.supabase.co`,
    "Refusing a non-isolated Supabase target.",
  );
  return {
    supabaseUrl,
    publishableKey: requiredValue("VITE_SUPABASE_PUBLISHABLE_KEY"),
  };
}

async function createEphemeralUser({ supabaseUrl, publishableKey }, label) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `game-smoke-${label}-${randomUUID()}@foxfam.faith`;
  const password = `Ff!${randomBytes(24).toString("base64url")}9`;
  const { data, error } = await client.auth.signUp({ email, password });
  assert.ifError(error);
  assert.ok(data.user?.id, `Ephemeral user ${label} returned no user id.`);
  if (!data.session?.access_token) {
    const confirmationError = new Error(
      "Ephemeral smoke requires preview email confirmation to be disabled.",
    );
    confirmationError.cleanupUserId = data.user.id;
    throw confirmationError;
  }
  return { id: data.user.id, accessToken: data.session.access_token };
}

export async function runEphemeralStagingSmoke() {
  const target = isolatedConfig();
  const cleanupUserIds = [];
  try {
    const userA = await createEphemeralUser(target, "a");
    cleanupUserIds.push(userA.id);
    const userB = await createEphemeralUser(target, "b");
    cleanupUserIds.push(userB.id);
    assert.notEqual(userA.id, userB.id);

    const config = getGameRewardSmokeConfig({
      GAME_REWARDS_E2E_DISPOSABLE: "1",
      GAME_REWARDS_E2E_PROJECT_REF: EXPECTED_PROJECT_REF,
      GAME_REWARDS_E2E_SUPABASE_URL: target.supabaseUrl,
      GAME_REWARDS_E2E_SUPABASE_PUBLISHABLE_KEY: target.publishableKey,
      GAME_REWARDS_E2E_FIXTURE_MARKER: FIXTURE_MARKER,
      GAME_REWARDS_E2E_TEARDOWN_CONTRACT: TEARDOWN_CONTRACT,
      GAME_REWARDS_E2E_USER_A_ACCESS_TOKEN: userA.accessToken,
      GAME_REWARDS_E2E_USER_B_ACCESS_TOKEN: userB.accessToken,
    });
    const result = await runSmoke(config);
    return { ...result, cleanupUserIds };
  } catch (error) {
    if (error?.cleanupUserId) cleanupUserIds.push(error.cleanupUserId);
    error.cleanupUserIds = cleanupUserIds;
    throw error;
  }
}

runEphemeralStagingSmoke()
  .then((result) => {
    console.log(JSON.stringify({
      status: "passed",
      claimedGames: result.claimedGames,
      cleanupUserIds: result.cleanupUserIds,
    }));
  })
  .catch((error) => {
    console.error(JSON.stringify({
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown staging smoke failure",
      cleanupUserIds: error?.cleanupUserIds || [],
    }));
    process.exitCode = 1;
  });
