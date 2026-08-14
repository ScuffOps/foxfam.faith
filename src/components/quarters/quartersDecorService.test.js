import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_QUARTERS_DECOR } from "./quartersDecorCatalog.js";
import { loadQuartersDecor, saveQuartersDecor } from "./quartersDecorService.js";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const VISITED_ID = "22222222-2222-4222-8222-222222222222";

function row(userId = OWNER_ID) {
  return {
    user_id: userId,
    rug_key: "moonweave-rug",
    wall_key: "crescent-banner",
    shelf_key: "star-lantern",
    nook_key: "moon-cushion",
  };
}

function clientWithResult(result) {
  const calls = { from: [], upsert: null, eq: null };
  const builder = {
    select() { return this; },
    eq(column, value) { calls.eq = [column, value]; return this; },
    async maybeSingle() { return result; },
    upsert(payload, options) { calls.upsert = { payload, options }; return this; },
    async single() { return result; },
  };
  return {
    auth: { async getUser() { return { data: { user: { id: OWNER_ID } }, error: null }; } },
    from(table) { calls.from.push(table); return builder; },
    calls,
  };
}

test("quarters decor loads an authenticated visitor's public decor by owner id", async () => {
  const client = clientWithResult({ data: row(VISITED_ID), error: null });
  assert.deepEqual(await loadQuartersDecor(VISITED_ID, client), DEFAULT_QUARTERS_DECOR);
  assert.deepEqual(client.calls.from, ["user_quarters_decor"]);
  assert.deepEqual(client.calls.eq, ["user_id", VISITED_ID]);
});

test("quarters decor returns defaults when an owner has not saved a layout", async () => {
  const client = clientWithResult({ data: null, error: null });
  assert.deepEqual(await loadQuartersDecor("", client), DEFAULT_QUARTERS_DECOR);
});

test("quarters decor upserts validated fields without client-authored ownership", async () => {
  const client = clientWithResult({ data: row(), error: null });
  assert.deepEqual(await saveQuartersDecor(DEFAULT_QUARTERS_DECOR, client), DEFAULT_QUARTERS_DECOR);
  assert.deepEqual(client.calls.upsert, {
    payload: {
      rug_key: "moonweave-rug",
      wall_key: "crescent-banner",
      shelf_key: "star-lantern",
      nook_key: "moon-cushion",
    },
    options: { onConflict: "user_id" },
  });
  assert.equal("user_id" in client.calls.upsert.payload, false);
});

test("quarters decor rejects invalid item keys before writing", async () => {
  const client = clientWithResult({ data: row(), error: null });
  await assert.rejects(() => saveQuartersDecor({ ...DEFAULT_QUARTERS_DECOR, rug: "hacked" }, client));
  assert.equal(client.calls.upsert, null);
});
