import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260721_add_relic_charm_progression.sql", import.meta.url),
  "utf8",
);

test("migration documents and enforces the Starfishing Phase 2 dependency", () => {
  assert.match(migration, /Depends on: 20260718200316_starfishing_phase_2_progression\.sql/);
  assert.match(migration, /to_regclass\('public\.material_ledger'\) is null/);
  assert.match(migration, /Phase 2 progression migration must be applied first/);
});

test("catalogs own one-star recipes and salvage yields", () => {
  assert.match(migration, /create table public\.relic_charm_upgrade_catalog/);
  assert.match(migration, /create table public\.relic_charm_salvage_catalog/);
  assert.match(migration, /check \(from_star = 0 and to_star = 1\)/);
  assert.match(migration, /material_costs jsonb not null/);
  assert.match(migration, /material_yields jsonb not null/);
  assert.match(migration, /insert into public\.relic_charm_upgrade_catalog/);
  assert.match(migration, /insert into public\.relic_charm_salvage_catalog/);
});

test("receipt-backed RPCs lock ownership and replay only exact requests", () => {
  assert.match(migration, /create table private\.relic_charm_progression_receipts/);
  assert.match(migration, /unique \(user_id, request_id\)/);
  assert.match(migration, /create or replace function public\.load_relic_forge_state\(\)/);
  assert.match(migration, /create or replace function public\.upgrade_user_relic_charm\([\s\S]*target_charm_id uuid,[\s\S]*request_id uuid/);
  assert.match(migration, /create or replace function public\.convert_duplicate_relic_charm\([\s\S]*target_charm_id uuid,[\s\S]*request_id uuid/);
  assert.match(migration, /where receipt\.user_id = caller_id[\s\S]*and receipt\.request_id = request_id[\s\S]*for update/);
  assert.match(migration, /request id was reused for a different Forge action/);
  assert.match(
    migration,
    /on conflict \(user_id, request_id\) do nothing[\s\S]*if receipt_row\.id is null then[\s\S]*for update/,
  );
  assert.match(migration, /where charm\.id = target_charm_id[\s\S]*and charm\.user_id = caller_id[\s\S]*for update/);
});

test("upgrade and conversion use ledgers and protect irreplaceable charms", () => {
  assert.match(migration, /create or replace function private\.post_material_entry/);
  assert.match(migration, /private\.post_favor_entry\(/);
  assert.match(migration, /private\.post_material_entry\(/);
  assert.match(migration, /Charm is not owned by the caller/);
  assert.match(migration, /Achievement charms cannot be converted/);
  assert.match(migration, /Equipped charms cannot be converted/);
  assert.match(migration, /The final copy of a charm cannot be converted/);
  assert.match(migration, /delete from public\.user_relic_charms/);
  assert.doesNotMatch(migration, /data\s*=\s*[^;]*-\s*'source'/);
  assert.match(migration, /charm\.data \|\| pg_catalog\.jsonb_build_object\([\s\S]*'star'/);
  assert.doesNotMatch(migration, /data ->> 'equipped'\)::boolean/);
});

test("Forge mutations lock the caller before any balance ledger operation", () => {
  for (const functionName of [
    "public.upgrade_user_relic_charm(",
    "public.convert_duplicate_relic_charm(",
  ]) {
    const functionStart = migration.indexOf(`create or replace function ${functionName}`);
    const nextFunction = migration.indexOf("create or replace function ", functionStart + 1);
    const functionSql = migration.slice(
      functionStart,
      nextFunction === -1 ? migration.length : nextFunction,
    );
    const userLock = functionSql.indexOf("from auth.users");
    const materialMutation = functionSql.indexOf("private.post_material_entry(");
    const favorMutation = functionSql.indexOf("private.post_favor_entry(");

    assert.ok(userLock >= 0, `${functionName} must lock the caller`);
    assert.match(
      functionSql,
      /select id\s+into locked_user_id\s+from auth\.users\s+where id = caller_id\s+for update/,
    );
    assert.ok(userLock < materialMutation, `${functionName} must lock before material mutation`);
    assert.ok(userLock < favorMutation, `${functionName} must lock before Favor mutation`);
  }
});

test("direct writes remain revoked and only authenticated callers can execute RPCs", () => {
  assert.match(migration, /revoke insert, update, delete on table public\.user_relic_charms from anon, authenticated/);
  assert.match(migration, /revoke all on table private\.relic_charm_progression_receipts from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.load_relic_forge_state\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.upgrade_user_relic_charm\(uuid, uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.convert_duplicate_relic_charm\(uuid, uuid\) to authenticated/);
});
