import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260722330000_add_public_game_progression_projection.sql", import.meta.url),
  "utf8",
);
const projectionFunction = migration.slice(
  migration.indexOf("create or replace function public.load_public_game_progression("),
  migration.indexOf("revoke all on function public.load_public_game_progression("),
);

test("projection is an authenticated target-scoped security boundary", () => {
  assert.match(
    projectionFunction,
    /create or replace function public\.load_public_game_progression\(\s*profile_user_id uuid\s*\)/,
  );
  assert.match(projectionFunction, /security definer\s+set search_path = ''/);
  assert.match(projectionFunction, /if \(select auth\.uid\(\)\) is null then/);
  assert.match(projectionFunction, /where fishpedia\.user_id = profile_user_id/);
  assert.match(projectionFunction, /where charm\.user_id = profile_user_id/);
  assert.match(projectionFunction, /where trophy\.user_id = profile_user_id/);
  assert.match(
    migration,
    /revoke all on function public\.load_public_game_progression\(uuid\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.load_public_game_progression\(uuid\) to authenticated/,
  );
});

test("projection exposes display milestones but no private economy or catch detail", () => {
  assert.match(projectionFunction, /'discovered_count'/);
  assert.match(projectionFunction, /'catalog_count'/);
  assert.match(projectionFunction, /'completion_percent'/);
  assert.match(projectionFunction, /'total_catches'/);
  assert.match(projectionFunction, /'equipped_charms'/);
  assert.match(projectionFunction, /'trophies'/);
  assert.match(projectionFunction, /'profile_frame'/);
  assert.match(projectionFunction, /'profile_particle'/);
  assert.doesNotMatch(
    projectionFunction,
    /currency_accounts|currency_ledger|material_ledger|user_material_balances/,
  );
  assert.doesNotMatch(
    projectionFunction,
    /smallest_size|largest_size|authoritative_size|play_evidence|result_snapshot/,
  );
});

test("equipped charm output is rebuilt from an explicit display allowlist", () => {
  assert.match(projectionFunction, /charm\.data ->> 'equipped' = 'true'/);
  assert.match(projectionFunction, /'charm_key', left\(charm\.data ->> 'charm_key', 80\)/);
  assert.match(projectionFunction, /'label', left\(coalesce\(charm\.data ->> 'label', charm\.data ->> 'name', charm\.data ->> 'charm_key'\), 80\)/);
  assert.match(projectionFunction, /when charm\.data ->> 'rarity' in \('common', 'uncommon', 'rare', 'epic', 'mythic'\)/);
  assert.doesNotMatch(projectionFunction, /charm\.data \|\|/);
  assert.doesNotMatch(projectionFunction, /'effects', charm\.data/);
});
