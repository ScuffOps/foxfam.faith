import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260810130000_fix_load_relic_forge_state_catalog_version.sql",
    import.meta.url,
  ),
  "utf8",
);

test("Forge state repair uses PostgreSQL GREATEST syntax without schema qualification", () => {
  assert.match(migration, /create or replace function public\.load_relic_forge_state\(\)/);
  assert.match(migration, /select greatest\(/);
  assert.doesNotMatch(migration, /pg_catalog\.greatest\(/);
});

test("Forge state repair preserves authenticated-only RPC access", () => {
  assert.match(
    migration,
    /revoke execute on function public\.load_relic_forge_state\(\) from public, anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.load_relic_forge_state\(\) to authenticated/,
  );
});
