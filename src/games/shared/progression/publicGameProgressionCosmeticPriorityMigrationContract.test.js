import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260813150000_fix_public_game_progression_cosmetic_priority.sql",
    import.meta.url,
  ),
  "utf8",
);

function selectorFor(cosmeticKey) {
  const start = migration.indexOf(`select candidate.${cosmeticKey}`);
  const end = migration.indexOf(
    cosmeticKey === "profile_frame"
      ? "select candidate.profile_particle"
      : "return pg_catalog.jsonb_build_object",
    start,
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return migration.slice(start, end);
}

test("public profile cosmetics use owner-visible rarity, star, and key priority", () => {
  for (const cosmeticKey of ["profile_frame", "profile_particle"]) {
    const selector = selectorFor(cosmeticKey);
    assert.match(selector, /when 'mythic' then 5/);
    assert.match(selector, /when 'epic' then 4/);
    assert.match(selector, /charm\.data ->> 'star'[\s\S]*?end desc,/);
    assert.match(selector, /charm\.data ->> 'charm_key' asc/);
    assert.match(selector, /limit 1/);
  }
  assert.doesNotMatch(
    migration,
    /max\(achievement\.reward #>> '\{effects,profile_(?:frame|particle)\}'\)/i,
  );
});

test("public cosmetics remain verified achievement rewards", () => {
  for (const cosmeticKey of ["profile_frame", "profile_particle"]) {
    const selector = selectorFor(cosmeticKey);
    assert.match(selector, /charm\.data ->> 'charm_key' = achievement\.reward ->> 'charm_key'/);
    assert.match(selector, /charm\.data #>> '\{source,type\}' = 'achievement'/);
    assert.match(selector, /achievement\.active/);
  }
});

test("public charm provenance preserves canonical source tokens and RPC grants", () => {
  assert.match(migration, /when charm\.data ->> 'source' = 'relic_roll' then 'relic_roll'/);
  assert.doesNotMatch(migration, /then 'relic-roll'/);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.load_public_game_progression\(uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.load_public_game_progression\(uuid\) to authenticated/i);
});
