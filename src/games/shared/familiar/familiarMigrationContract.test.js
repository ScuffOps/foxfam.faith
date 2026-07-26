import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/202607210001_add_user_familiars.sql", import.meta.url),
  "utf8",
);

test("familiar rows derive ownership from auth.uid and enforce owner-only RLS", () => {
  assert.match(migration, /user_id uuid primary key default auth\.uid\(\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(migration, /revoke all on table public\.user_familiars from public, anon/i);
});

test("database constraints cover every selection dimension and cross-species choices", () => {
  for (const column of ["species", "coat", "markings", "outfit", "accessory", "charm_fx"]) {
    assert.match(migration, new RegExp(`check \\(${column}`, "i"));
  }
  assert.match(migration, /species = 'moon-rabbit'.*coat in/s);
  assert.match(migration, /species = 'shrine-cat'.*markings in/s);
});
