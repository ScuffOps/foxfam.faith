import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260810140000_fix_relic_forge_receipt_conflict_target.sql",
    import.meta.url,
  ),
  "utf8",
);

test("Forge receipt repair targets the named unique constraint", () => {
  assert.match(
    migration,
    /on conflict on constraint relic_charm_progression_receipts_user_id_request_id_key do nothing/,
  );
  assert.match(migration, /pg_catalog\.replace\(/);
});

test("Forge receipt repair covers upgrade and duplicate conversion RPCs", () => {
  assert.match(migration, /public\.upgrade_user_relic_charm\(uuid,uuid\)/);
  assert.match(migration, /public\.convert_duplicate_relic_charm\(uuid,uuid\)/);
  assert.match(migration, /if repaired_definition = original_definition then/);
});

test("Forge receipt repair preserves authenticated-only RPC access", () => {
  for (const functionName of [
    "upgrade_user_relic_charm",
    "convert_duplicate_relic_charm",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke execute on function public\\.${functionName}\\(uuid, uuid\\) from public, anon`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `grant execute on function public\\.${functionName}\\(uuid, uuid\\) to authenticated`,
      ),
    );
  }
});
