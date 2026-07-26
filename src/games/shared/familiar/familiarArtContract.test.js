import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { FAMILIAR_SPECIES } from "./familiarCatalog.js";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260725143000_expand_familiar_species.sql", import.meta.url),
  "utf8",
);

test("the approved six-species familiar art is bundled as transparent PNG assets", () => {
  for (const species of Object.values(FAMILIAR_SPECIES)) {
    const assetUrl = new URL(`../../../../public${species.asset}`, import.meta.url);
    assert.equal(existsSync(fileURLToPath(assetUrl)), true, `${species.asset} is missing`);
  }
});

test("the persistence allowlist expands without changing familiar ownership policies", () => {
  for (const species of ["cloud-poodle", "moss-turtle", "moon-seal"]) {
    assert.match(migration, new RegExp(`'${species}'`));
  }
  assert.doesNotMatch(migration, /policy|row level security|grant|revoke/i);
});
