import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
const supabaseUrl = process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "http://127.0.0.1:59999";
const outputDir = process.env.E2E_OUTPUT_DIR || "/private/tmp/foxfam-auth-e2e";
const now = new Date().toISOString();
const authUser = {
  id: "user-admin",
  aud: "authenticated",
  role: "authenticated",
  email: "veri@example.test",
  user_metadata: { display_name: "Veri" },
};
const profile = {
  id: authUser.id,
  role: "admin",
  display_name: "Veri",
  avatar_url: "",
  accent_color: "",
  notification_preferences: {},
  onboarded: true,
  created_at: now,
  updated_at: now,
};

const row = (id, data = {}) => ({ id, user_id: authUser.id, created_at: now, updated_at: now, data });
const rows = {
  profiles: [profile],
  scuffox_updates: [row("update-1", { title: "Audit note", message: "Mood: haunted but hydrated.", tone: "mood", status: "active", is_active: true })],
  user_notifications: [row("note-1", { recipient_user_id: authUser.id, title: "Tiny staff omen", message: "Check this and the dot should vanish.", read_at: null })],
  reliquary_entries: [],
  reliquary_comments: [],
  community_threads: [row("thread-1", { title: "General chaos", body: "<p>Welcome home.</p>", category: "general", author_name: "Veri", reply_count: 0 })],
  community_thread_comments: [],
  events: [],
  birthdays: [],
  community_posts: [],
  suggestions: [],
  bug_reports: [],
  codex_entries: [],
  offerings: [],
  prayers: [],
  blessings: [],
  user_levels: [row("level-1", { user_key: authUser.id, points: 42, level: 3 })],
  thoughts: [],
  user_relics: [row("relic-1", { user_id: authUser.id, name: "Audit Relic", base_type: "lantern", theme: "moonlit", effects: ["blue-flame"], lore: "A small light for test spirits with boundaries." })],
  user_relic_charms: [row("charm-1", { user_id: authUser.id, name: "Sleep Debt Charm", rarity: "rare", slot: "aura", equipped: true })],
  staff_availabilities: [],
  shift_planner_assignments: [],
  medications: [],
  medication_doses: [],
  mod_shifts: [],
  bot_commands: [row("command-1", { command: "!rules", action: "Be kind. Listen to mods.", enabled: true, source: "manual" })],
  staff_tasks: [row("task-1", { title: "Review mod manual", status: "in_queue", priority: "normal" })],
  staff_time_entries: [],
  stream_logs: [],
  sync_states: [],
};

function getStorageKey() {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

function getTable(url) {
  return url.pathname.match(/\/rest\/v1\/([^/?]+)/)?.[1];
}

function getFilteredRows(tableName, url) {
  let tableRows = [...(rows[tableName] || [])];
  for (const [key, value] of url.searchParams.entries()) {
    if (["select", "order", "limit"].includes(key)) continue;
    if (!value.startsWith("eq.")) continue;
    const expected = value.slice(3);
    tableRows = tableRows.filter((item) => String(item[key] ?? item.data?.[key] ?? "") === expected);
  }
  return tableRows;
}

async function readJson(request) {
  try {
    return await request.postDataJSON();
  } catch {
    return {};
  }
}

async function installSupabaseMocks(page, calls) {
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.includes("/auth/v1/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(authUser) });
    }
    if (url.pathname.includes("/auth/v1/token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "test-token", refresh_token: "refresh-token", token_type: "bearer", expires_in: 3600, user: authUser }),
      });
    }
    if (url.pathname.includes("/auth/v1/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.includes("/storage/v1/object/public")) {
      return route.fulfill({ status: 200, body: "mock-public-file" });
    }
    if (url.pathname.includes("/storage/v1/object")) {
      calls.uploads += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "mock-upload.png" }) });
    }
    if (url.pathname.includes("/rest/v1/rpc/")) {
      const rpc = url.pathname.split("/").pop();
      const payload = await readJson(request);
      if (rpc === "mark_user_notifications_read") {
        calls.markRead += 1;
        for (const id of payload.notification_ids || []) {
          const note = rows.user_notifications.find((item) => item.id === id);
          if (note) note.data.read_at = now;
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: "true" });
      }
      if (rpc === "set_profile_display_name") {
        profile.display_name = payload.new_display_name;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profile) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profile) });
    }

    const tableName = getTable(url);
    if (!tableName) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });

    if (method === "GET") {
      const tableRows = getFilteredRows(tableName, url);
      const wantsSingle = request.headers().accept?.includes("application/vnd.pgrst.object") || (url.searchParams.get("id") || "").startsWith("eq.");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsSingle ? (tableRows[0] || null) : tableRows) });
    }
    if (method === "POST") {
      const payload = await readJson(request);
      const created = { id: `${tableName}-${rows[tableName]?.length || 0}`, created_at: now, updated_at: now, ...payload };
      rows[tableName] ||= [];
      rows[tableName].push(created);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
    }
    if (method === "PATCH") {
      const payload = await readJson(request);
      const target = getFilteredRows(tableName, url)[0] || rows[tableName]?.[0];
      if (target) Object.assign(target, payload, { updated_at: now });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(target || payload) });
    }
    if (method === "DELETE") {
      return route.fulfill({ status: 204, body: "" });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

async function seedAuthenticatedSession(page) {
  const storageKey = getStorageKey();
  await page.addInitScript(
    ({ authUser, storageKey }) => {
      sessionStorage.setItem("splash_seen", "1");
      localStorage.setItem("commhub_guest_onboarding_seen", "1");
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: "test-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: authUser,
        }),
      );
    },
    { authUser, storageKey },
  );
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const calls = { uploads: 0, markRead: 0 };

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await seedAuthenticatedSession(page);
    await installSupabaseMocks(page, calls);

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: /^Cards$/ }).click();
    await page.getByRole("button", { name: "Quick Stats", exact: true }).click();
    const dashboardPrefs = await page.evaluate(() => JSON.parse(localStorage.getItem("foxfam.dashboard.cards.v1") || "{}"));
    if (!dashboardPrefs.hidden?.includes("quick-stats")) failures.push("Dashboard card visibility did not persist.");

    await page.getByRole("button", { name: /Veri\s+Admin/i }).first().click();
    await page.waitForTimeout(400);
    if (calls.markRead < 1) failures.push("Opening alerts did not mark notifications read.");

    await page.goto(`${baseUrl}/reliquary`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /New Post/i }).click();
    await page.getByPlaceholder("Poem title").fill("Persistent Audit Poem");
    await page.getByPlaceholder(/moonlit, tender, haunted/i).fill("soft chaos");
    await page.locator(".ql-editor").fill("This text survived tabbing away because the portal is loved.");
    await page.keyboard.press("Tab");
    await page.goto(`${baseUrl}/forum`, { waitUntil: "domcontentloaded" });
    await page.goto(`${baseUrl}/reliquary`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /New Post/i }).click();
    const title = await page.getByPlaceholder("Poem title").inputValue();
    const body = await page.locator(".ql-editor").innerText();
    if (title !== "Persistent Audit Poem") failures.push("Reliquary title draft did not persist across route changes.");
    if (!body.includes("survived tabbing away")) failures.push("Reliquary body draft did not persist across route changes.");
    await page.getByPlaceholder(/comma, separated, tags/i).fill("audit, persistent");
    const filePath = path.join(outputDir, "tiny.png");
    await writeFile(filePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"));
    await page.locator("input[type=file]").setInputFiles(filePath);
    await page.getByRole("button", { name: /Place in Reliquary/i }).click();
    await page.waitForTimeout(800);
    if (calls.uploads < 1) failures.push("Reliquary image upload was not attempted.");
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("foxfam.draft.reliquary.new.v1") || "{}"));
    if (draft.title) failures.push("Reliquary draft did not clear after save.");

    await page.goto(`${baseUrl}/ops/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const staffText = await page.locator("body").innerText();
    if (!staffText.includes("Availability Management") || !staffText.includes("Shift Planner")) {
      failures.push("Staff Ops schedule did not render availability and shift planner modules.");
    }

    await page.goto(`${baseUrl}/ops/time`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: /Start Timer/i }).click();
    await page.waitForTimeout(1200);
    const activeTimer = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([key]) => key.startsWith("foxfam.staffTime.activeTimer.v1"));
      return entry ? JSON.parse(entry[1]) : null;
    });
    if (!activeTimer?.started_at) failures.push("Staff time tracker did not persist the active timer.");
    await page.getByPlaceholder("Work notes for this timer").fill("Timer e2e entry");
    await page.getByRole("button", { name: /Stop Timer/i }).click();
    await page.waitForTimeout(900);
    const timerEntry = rows.staff_time_entries.find((entry) => entry.data?.timer_source === "start_stop");
    if (!timerEntry?.data?.started_at || !timerEntry?.data?.ended_at) failures.push("Staff timer did not save a completed time entry.");
    if (timerEntry?.data?.status !== "submitted") failures.push("Staff timer did not mark the saved entry as submitted.");

    await page.screenshot({ path: path.join(outputDir, "portal-auth-e2e.png"), fullPage: true });
    await page.close();
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  console.log(`Authenticated portal e2e passed. Screenshot: ${path.join(outputDir, "portal-auth-e2e.png")}`);
}

await main();
