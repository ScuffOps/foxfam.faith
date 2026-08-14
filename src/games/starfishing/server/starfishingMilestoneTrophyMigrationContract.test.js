import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260813170000_add_starfishing_milestone_trophies.sql", import.meta.url),
  "utf8",
);

test("Starfishing milestone trophies are canonical and backfilled idempotently", () => {
  assert.match(migration, /\('first-light', 'first-light'\)/);
  assert.match(migration, /\('pocket-constellation', 'pocket-constellation'\)/);
  assert.match(migration, /reward \|\| pg_catalog\.jsonb_build_object\('trophy_key', trophy\.trophy_key\)/);
  assert.match(migration, /from public\.user_achievements as unlocked/);
  assert.match(migration, /unlocked\.unlocked_at/);
  assert.match(migration, /'type', 'achievement'/);
  assert.match(migration, /on conflict \(user_id, trophy_key\) do nothing/);
});

test("the backfill is limited to the two previously omitted milestones", () => {
  const backfill = migration.slice(migration.indexOf("insert into public.user_trophies"));
  assert.match(backfill, /achievement\.achievement_key in \('first-light', 'pocket-constellation'\)/);
  assert.doesNotMatch(backfill, /'gentle-return'|'myth-in-moonwater'|'hundred-lights'/);
});
