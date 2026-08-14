import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

import { wordGardenSmokeWordsForPuzzle } from "./game-rewards-smoke.mjs";

const EXPECTED_PROJECT_REF = "drauxhhxlatvylzktuqq";
const STORAGE_KEY = `sb-${EXPECTED_PROJECT_REF}-auth-token`;
const CLEANUP_CONTRACT = "DELETE_EXACT_STAGING_USER_AFTER_RUN";
const PREVIEW_HOST_PATTERN = /^foxfamfaith-[a-z0-9-]+-scuffops\.vercel\.app$/;
const CONFIRMATION_TIMEOUT_MESSAGE = "Timed out waiting for exact staging-user confirmation.";

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

export function getAuthenticatedStagingConfig(env = process.env) {
  assert.equal(env.VITE_GAME_HUB_STAGING, "1", "Staging flag is not enabled.");
  assert.equal(
    env.GAME_HUB_AUTH_E2E_CLEANUP_CONTRACT,
    CLEANUP_CONTRACT,
    `Cleanup contract must equal ${CLEANUP_CONTRACT}.`,
  );

  const supabaseUrl = requiredFrom(env, "VITE_SUPABASE_URL").replace(/\/$/, "");
  assert.equal(
    supabaseUrl,
    `https://${EXPECTED_PROJECT_REF}.supabase.co`,
    "Refusing a non-isolated Supabase target.",
  );
  const publishableKey = requiredFrom(env, "VITE_SUPABASE_PUBLISHABLE_KEY");
  assert.equal(isPrivilegedKey(publishableKey), false, "Refusing a privileged Supabase key.");

  const previewUrl = new URL(requiredFrom(env, "GAME_HUB_AUTH_E2E_PREVIEW_URL"));
  assert.equal(previewUrl.protocol, "https:", "Authenticated browser smoke requires HTTPS.");
  assert.match(previewUrl.hostname, PREVIEW_HOST_PATTERN, "Refusing a non-preview Vercel host.");
  assert.equal(previewUrl.pathname, "/", "Preview URL must not include a route.");
  assert.equal(previewUrl.search, "", "Preview URL must not include a query.");
  assert.equal(previewUrl.hash, "", "Preview URL must not include a hash.");

  const outputDir = env.GAME_HUB_AUTH_E2E_OUTPUT_DIR?.trim()
    || path.join("/private/tmp", `foxfam-authenticated-game-hub-${Date.now()}`);
  const existingUserValues = [
    env.GAME_HUB_AUTH_E2E_USER_ID?.trim(),
    env.GAME_HUB_AUTH_E2E_USER_EMAIL?.trim(),
    env.GAME_HUB_AUTH_E2E_USER_PASSWORD?.trim(),
  ];
  const hasExistingUser = existingUserValues.some(Boolean);
  if (hasExistingUser && !existingUserValues.every(Boolean)) {
    throw new Error("Existing staging-user mode requires id, email, and password together.");
  }

  return {
    existingUser: hasExistingUser ? {
      id: existingUserValues[0],
      email: existingUserValues[1],
      password: existingUserValues[2],
    } : null,
    outputDir,
    previewUrl: previewUrl.toString().replace(/\/$/, ""),
    publishableKey,
    supabaseUrl,
  };
}

function requiredFrom(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}

async function createDisposableUser(config) {
  const client = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (config.existingUser) {
    const result = await client.auth.signInWithPassword({
      email: config.existingUser.email,
      password: config.existingUser.password,
    });
    if (result.error) {
      result.error.cleanupUserId = config.existingUser.id;
      throw result.error;
    }
    assert.equal(result.data.user?.id, config.existingUser.id, "Disposable staging user id did not match.");
    assert.ok(result.data.session?.access_token && result.data.session?.refresh_token, "Disposable staging login returned no session.");
    return { id: config.existingUser.id, session: result.data.session };
  }

  const email = `game-browser-smoke-${randomUUID()}@foxfam.faith`;
  const password = `Ff!${randomBytes(24).toString("base64url")}9`;
  const { data, error } = await client.auth.signUp({ email, password });
  assert.ifError(error);
  assert.ok(data.user?.id, "Disposable browser user returned no user id.");
  if (data.session?.access_token && data.session?.refresh_token) {
    return { id: data.user.id, session: data.session };
  }

  console.log(JSON.stringify({
    status: "awaiting_exact_user_confirmation",
    userId: data.user.id,
    cleanupUserIds: [data.user.id],
  }));
  const timeoutAt = Date.now() + 90_000;
  while (Date.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const result = await client.auth.signInWithPassword({ email, password });
    if (result.data.session?.access_token && result.data.session?.refresh_token) {
      assert.equal(result.data.user?.id, data.user.id, "Confirmed staging user id changed unexpectedly.");
      return { id: data.user.id, session: result.data.session };
    }
  }

  const confirmationError = new Error(CONFIRMATION_TIMEOUT_MESSAGE);
  confirmationError.cleanupUserId = data.user.id;
  throw confirmationError;
}

export async function writeAuthenticatedStagingFailureReport({
  cleanupUserIds,
  error,
  outputDir,
  previewUrl,
}) {
  const isConfirmationTimeout = error instanceof Error
    && error.message === CONFIRMATION_TIMEOUT_MESSAGE;
  const report = {
    status: isConfirmationTimeout ? "blocked_external_prerequisite" : "failed",
    reason: isConfirmationTimeout ? "email_confirmation_required" : "authenticated_smoke_failure",
    projectRef: EXPECTED_PROJECT_REF,
    previewHost: new URL(previewUrl).hostname,
    cleanupContract: CLEANUP_CONTRACT,
    cleanupUserIds: [...new Set(cleanupUserIds.filter(Boolean))],
    message: error instanceof Error ? error.message : "Unknown authenticated staging smoke failure",
  };
  const reportPath = path.join(outputDir, "failure-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function isRpcResponse(response, rpcName) {
  return response.request().method() === "POST"
    && new URL(response.url()).pathname.endsWith(`/rest/v1/rpc/${rpcName}`);
}

async function rpcAction(page, rpcName, operation) {
  const responsePromise = page.waitForResponse((response) => isRpcResponse(response, rpcName));
  try {
    await operation();
  } catch (error) {
    await responsePromise.catch(() => null);
    throw error;
  }
  let response;
  try {
    response = await responsePromise;
  } catch (error) {
    const route = new URL(page.url()).pathname;
    const timeoutError = new Error(
      `${rpcName} produced no matching response on ${route}: ${error instanceof Error ? error.message : "response wait failed"}`,
    );
    timeoutError.cause = error;
    throw timeoutError;
  }
  const body = await response.json();
  assert.ok(response.ok(), `${rpcName} failed with ${response.status()}: ${JSON.stringify(body)}`);
  return body;
}

async function seedAuthenticatedSession(page, session) {
  await page.addInitScript(({ storageKey, storedSession }) => {
    sessionStorage.setItem("splash_seen", "1");
    localStorage.setItem("commhub_guest_onboarding_seen", "1");
    localStorage.setItem(storageKey, JSON.stringify(storedSession));
  }, { storageKey: STORAGE_KEY, storedSession: session });
}

async function collectAuthDiagnostics(page, outputDir, failedResponses) {
  await page.screenshot({ path: path.join(outputDir, "auth-bootstrap-failure.png"), fullPage: true });
  return page.evaluate(({ storageKey, responseFailures }) => {
    let storedUserId = null;
    try {
      storedUserId = JSON.parse(localStorage.getItem(storageKey) || "null")?.user?.id || null;
    } catch {
      storedUserId = "unreadable";
    }
    return {
      path: window.location.pathname,
      title: document.title,
      storedUserId,
      buttonLabels: [...document.querySelectorAll("button")]
        .map((button) => button.textContent?.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 30),
      failedResponses: responseFailures,
    };
  }, { storageKey: STORAGE_KEY, responseFailures: failedResponses.slice(-20) });
}

async function submitWord(page, word) {
  await page.getByRole("button", { name: /^Add [A-Z]$/ }).first().click({ trial: true });
  await page.locator(".word-flower__draft-wrap").click();
  await page.keyboard.type(word.toLowerCase());
  await page.locator(`.word-flower__draft[aria-label="Current word: ${word}"]`)
    .waitFor({ state: "visible" });
  await rpcAction(page, "progress_game_reward_session", () => page.keyboard.press("Enter"));
  await page.getByRole("list", { name: "Latest found word" })
    .locator("li")
    .filter({ hasText: new RegExp(`^${word}`) })
    .waitFor({ state: "visible" });
}

async function dismissOnboarding(page) {
  const skipButton = page.getByRole("button", { name: "Skip onboarding", exact: true });
  try {
    await skipButton.waitFor({ state: "visible", timeout: 5_000 });
    await skipButton.click();
  } catch {
    // Returning users may already be onboarded.
  }
}

async function verifyCollections(page, claim) {
  await page.goto(`${page.url().split("/word-garden")[0]}/collections`, { waitUntil: "domcontentloaded" });
  await dismissOnboarding(page);
  await page.getByRole("heading", { name: "Collections", exact: true }).waitFor();
  await page.getByText(`${claim.favor.balance} Favor`, { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Charm Reliquary", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Achievement Chronicle", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Trophy Shelf", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Materials", exact: true }).waitFor();
  await page.getByText("Blooming Ink", { exact: true }).waitFor();

  const achievementCount = await page.locator("section", { hasText: "Achievement Chronicle" })
    .locator("ol > li").count();
  const trophyCount = await page.locator("section", { hasText: "Trophy Shelf" })
    .locator("ol > li").count();
  const charmCount = await page.locator("section", { hasText: "Charm Reliquary" })
    .locator("ol > li").count();
  assert.ok(achievementCount > 0, "Collections projected no achievement after the claim.");
  assert.ok(trophyCount > 0, "Collections projected no trophy after the claim.");
  assert.ok(charmCount > 0, "Collections projected no charm after the claim.");
  return { achievementCount, charmCount, trophyCount };
}

async function verifyProfile(page, baseUrl, claim) {
  await page.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded" });
  await dismissOnboarding(page);
  await page.getByText("Favor", { exact: true }).first().waitFor();
  await page.getByText(String(claim.favor.balance), { exact: true }).first().waitFor();
  await page.getByText("Owned charms", { exact: true }).waitFor();
}

export async function runAuthenticatedStagingSmoke(env = process.env) {
  const config = getAuthenticatedStagingConfig(env);
  const cleanupUserIds = [];
  await mkdir(config.outputDir, { recursive: true });
  let browser;

  try {
    const disposableUser = await createDisposableUser(config);
    cleanupUserIds.push(disposableUser.id);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failedResponses = [];
    page.on("response", (response) => {
      if (response.status() < 400) return;
      const url = new URL(response.url());
      if (url.hostname !== new URL(config.supabaseUrl).hostname) return;
      failedResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    });
    await seedAuthenticatedSession(page, disposableUser.session);

    await page.goto(`${config.previewUrl}/word-garden`, { waitUntil: "domcontentloaded" });
    await dismissOnboarding(page);
    const startButton = page.getByRole("button", { name: "Start rewarded garden", exact: true });
    try {
      await startButton.waitFor({ timeout: 12_000 });
      await startButton.click({ trial: true, timeout: 15_000 });
    } catch {
      const diagnostics = await collectAuthDiagnostics(page, config.outputDir, failedResponses);
      throw new Error(`Authenticated control was not visible: ${JSON.stringify(diagnostics)}`);
    }
    const started = await rpcAction(page, "start_game_reward_session", () => startButton.click());
    assert.equal(started.game_key, "word-garden");
    const words = wordGardenSmokeWordsForPuzzle(started.puzzle);

    await page.getByText("Rewarded garden", { exact: true }).waitFor();
    await submitWord(page, words.normal);
    await submitWord(page, words.fullBloom);
    await rpcAction(
      page,
      "progress_game_reward_session",
      () => page.getByRole("button", { name: "Rest the garden", exact: true }).click(),
    );

    const claim = await rpcAction(
      page,
      "claim_game_reward",
      () => page.getByRole("button", { name: /Claim portal rewards/ }).click(),
    );
    assert.ok(claim.favor?.delta > 0, "Word Garden claim awarded no Favor.");
    assert.ok(claim.materials?.some((item) => item.key === "blooming-ink"), "Claim omitted Blooming Ink.");
    assert.ok(claim.achievements?.length > 0, "Claim omitted its achievement.");
    await page.getByText("Portal rewards", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(config.outputDir, "word-garden-claimed.png"), fullPage: true });

    const collections = await verifyCollections(page, claim);
    await page.screenshot({ path: path.join(config.outputDir, "collections-projection.png"), fullPage: true });
    await verifyProfile(page, config.previewUrl, claim);
    await page.screenshot({ path: path.join(config.outputDir, "profile-projection.png"), fullPage: true });

    const report = {
      status: "passed",
      projectRef: EXPECTED_PROJECT_REF,
      previewHost: new URL(config.previewUrl).hostname,
      userId: disposableUser.id,
      cleanupContract: CLEANUP_CONTRACT,
      cleanupUserIds,
      claim: {
        gameKey: claim.game_key,
        favorBalance: claim.favor.balance,
        favorDelta: claim.favor.delta,
        materialKeys: claim.materials.map((item) => item.key),
        achievementKeys: claim.achievements.map((item) => item.key),
      },
      collections,
    };
    await writeFile(path.join(config.outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    return { report, outputDir: config.outputDir };
  } catch (error) {
    if (error?.cleanupUserId) cleanupUserIds.push(error.cleanupUserId);
    error.cleanupUserIds = [...new Set(cleanupUserIds)];
    try {
      error.failureReportPath = await writeAuthenticatedStagingFailureReport({
        cleanupUserIds: error.cleanupUserIds,
        error,
        outputDir: config.outputDir,
        previewUrl: config.previewUrl,
      });
      if (error.message === CONFIRMATION_TIMEOUT_MESSAGE) {
        error.status = "blocked_external_prerequisite";
        error.reason = "email_confirmation_required";
      }
    } catch (reportError) {
      error.failureReportWriteError = reportError instanceof Error
        ? reportError.message
        : "Unknown failure-report write error";
    }
    throw error;
  } finally {
    await browser?.close();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runAuthenticatedStagingSmoke()
    .then(({ report, outputDir }) => {
      console.log(JSON.stringify({
        status: report.status,
        userId: report.userId,
        cleanupUserIds: report.cleanupUserIds,
        outputDir,
      }));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: error?.status || "failed",
        reason: error?.reason || "authenticated_smoke_failure",
        message: error instanceof Error ? error.message : "Unknown authenticated staging smoke failure",
        cleanupUserIds: error?.cleanupUserIds || [],
        failureReportPath: error?.failureReportPath || null,
        failureReportWriteError: error?.failureReportWriteError || null,
      }));
      process.exitCode = 1;
    });
}
