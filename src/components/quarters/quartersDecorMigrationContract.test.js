import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const migration = readFileSync(new URL("../../../supabase/migrations/20260810100000_add_user_quarters_decor.sql", import.meta.url), "utf8");

test("quarters decor migration uses constrained item keys instead of arbitrary layout JSON", () => {
  assert.match(migration, /create table if not exists public\.user_quarters_decor/);
  assert.match(migration, /check \(rug_key in \('moonweave-rug', 'petal-rug', 'moss-rug'\)\)/);
  assert.doesNotMatch(migration, /jsonb/);
});

test("quarters decor migration allows authenticated viewing while keeping writes owner scoped", () => {
  assert.match(migration, /for select to authenticated using \(true\)/);
  assert.match(migration, /for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /for update to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /revoke all on table public\.user_quarters_decor from public, anon/);
});

test("quarters decor migration forces the authenticated owner on every write", () => {
  assert.match(migration, /new\.user_id := \(select auth\.uid\(\)\)/);
  assert.match(migration, /alter table public\.user_quarters_decor force row level security/);
});
