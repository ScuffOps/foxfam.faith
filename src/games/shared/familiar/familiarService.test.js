import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FAMILIAR } from "./familiarCatalog.js";
import {
  GUEST_FAMILIAR_STORAGE_KEY,
  loadFamiliar,
  loadGuestFamiliar,
  saveFamiliar,
  saveGuestFamiliar,
} from "./familiarService.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function makeClient({ row = null, authId = USER_ID, queryError = null } = {}) {
  const calls = { upsert: null, eq: null };
  const builder = {
    select() { return this; },
    eq(column, value) { calls.eq = [column, value]; return this; },
    async maybeSingle() { return { data: row, error: queryError }; },
    upsert(payload, options) { calls.upsert = { payload, options }; return this; },
    async single() { return { data: row, error: queryError }; },
  };
  return {
    calls,
    client: {
      auth: { async getUser() { return { data: { user: authId ? { id: authId } : null }, error: null }; } },
      from(table) { assert.equal(table, "user_familiars"); return builder; },
    },
  };
}

function persistedRow(overrides = {}) {
  return {
    user_id: USER_ID,
    ...DEFAULT_FAMILIAR,
    charm_fx: DEFAULT_FAMILIAR.charmFx,
    catalog_version: 1,
    created_at: "2026-07-21T12:00:00.000Z",
    updated_at: "2026-07-21T12:00:00.000Z",
    ...overrides,
  };
}

test("loads and validates the authenticated owner's familiar", async () => {
  const { client, calls } = makeClient({ row: persistedRow() });
  assert.deepEqual(await loadFamiliar(client), DEFAULT_FAMILIAR);
  assert.deepEqual(calls.eq, ["user_id", USER_ID]);
});

test("rejects a returned row owned by another account", async () => {
  const { client } = makeClient({ row: persistedRow({ user_id: "22222222-2222-4222-8222-222222222222" }) });
  await assert.rejects(() => loadFamiliar(client), /ownership/i);
});

test("rejects invalid inbound rows before exposing them to the provider", async () => {
  const { client } = makeClient({ row: persistedRow({ coat: "not-allowed" }) });
  await assert.rejects(() => loadFamiliar(client), /invalid/i);
});

test("saves only allowlisted appearance fields and never sends user_id", async () => {
  const { client, calls } = makeClient({ row: persistedRow() });
  assert.deepEqual(await saveFamiliar(DEFAULT_FAMILIAR, client), DEFAULT_FAMILIAR);
  assert.equal("user_id" in calls.upsert.payload, false);
  assert.equal(calls.upsert.options.onConflict, "user_id");
});

test("rejects invalid outbound selections before writing", async () => {
  const { client, calls } = makeClient({ row: persistedRow() });
  await assert.rejects(() => saveFamiliar({ ...DEFAULT_FAMILIAR, accessory: "not-allowed" }, client));
  assert.equal(calls.upsert, null);
});

test("requires an authenticated owner for remote persistence", async () => {
  const { client } = makeClient({ authId: null });
  await assert.rejects(() => loadFamiliar(client), /sign in/i);
});

test("keeps guest preview in a namespaced local store", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); },
  };
  saveGuestFamiliar(DEFAULT_FAMILIAR, storage);
  assert.ok(values.has(GUEST_FAMILIAR_STORAGE_KEY));
  assert.deepEqual(loadGuestFamiliar(storage), DEFAULT_FAMILIAR);
});
