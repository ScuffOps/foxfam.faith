import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260813160000_add_public_familiar_projection.sql", import.meta.url),
  "utf8",
);

test("public familiar projection preserves owner-only table RLS and exposes only render fields", () => {
  assert.match(migration, /private\.load_public_game_progression_without_familiar\(uuid\)/);
  assert.match(migration, /from public\.user_familiars as familiar/);
  for (const key of ["species", "coat", "markings", "outfit", "accessory", "charm_fx"]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.doesNotMatch(migration, /'created_at'|'updated_at'|'catalog_version'|'user_id'/);
  assert.doesNotMatch(migration, /alter table public\.user_familiars|create policy/i);
});

test("public familiar projection remains authenticated-only", () => {
  assert.match(
    migration,
    /revoke all on function public\.load_public_game_progression\(uuid\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.load_public_game_progression\(uuid\)[\s\S]*to authenticated/,
  );
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
});
