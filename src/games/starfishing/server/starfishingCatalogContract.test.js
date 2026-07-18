import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  STARFISHING_ACHIEVEMENT_KEYS,
  STARFISHING_SERVER_CATALOG_VERSION,
} from "./starfishingCatalogContract.js";

test("server catalog exposes stable Phase 2 keys", () => {
  assert.equal(STARFISHING_SERVER_CATALOG_VERSION, 1);
  assert.deepEqual(STARFISHING_ACHIEVEMENT_KEYS, [
    "first-light",
    "gentle-return",
    "pocket-constellation",
    "myth-in-moonwater",
    "celestial-archivist",
    "hundred-lights",
  ]);
});

test("migration enforces ticket and achievement-charm trust boundaries", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /check \(expires_at = created_at \+ interval '10 minutes'\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.user_relic_charms from authenticated;/);
  assert.match(migration, /drop policy if exists "Users create own relic charms" on public\.user_relic_charms;/);
  assert.match(migration, /drop policy if exists "Users update own relic charms" on public\.user_relic_charms;/);
  assert.match(migration, /drop policy if exists "Users delete own relic charms" on public\.user_relic_charms;/);
  assert.match(migration, /grant select on table public\.user_relic_charms to authenticated;/);
  assert.match(migration, /create unique index user_relic_charms_one_starfishing_achievement_per_user/);
  assert.match(migration, /\(user_id, \(data #>> '\{source,key\}'\)\)/);
  assert.match(migration, /data #>> '\{source,type\}' = 'achievement'/);
});
