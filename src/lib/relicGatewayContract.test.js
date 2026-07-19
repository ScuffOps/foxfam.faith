import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RELIC_BASES, RELIC_EFFECTS } from "./relicCharms.js";
import { createRelicService } from "./relicService.js";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
  "utf8",
);
const forgePage = readFileSync(new URL("../pages/RelicForge.jsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../pages/Profile.jsx", import.meta.url), "utf8");
const adminPage = readFileSync(new URL("../pages/Admin.jsx", import.meta.url), "utf8");

const requestId = "123e4567-e89b-42d3-a456-426614174000";
const charmId = "123e4567-e89b-42d3-a456-426614174001";
const levelId = "123e4567-e89b-42d3-a456-426614174002";

test("relic service sends narrow RPC payloads with no client costs or user targets", async () => {
  const calls = [];
  const service = createRelicService({
    async rpc(name, params) {
      calls.push({ name, params });
      if (name === "save_user_relic_with_favor") {
        return {
          data: {
            replayed: false,
            relic: { id: charmId, name: "Ashen Promise", effects: ["blue-flame"] },
            favor: { delta: -57, balance: 43 },
          },
          error: null,
        };
      }
      if (name === "roll_user_relic_charm") {
        return { data: { id: charmId, charm_key: "ash-thread", slot: "ribbon" }, error: null };
      }
      if (name === "set_equipped_relic_charm") {
        return { data: [{ id: charmId, charm_key: "ash-thread", slot: "ribbon", equipped: true }], error: null };
      }
      return { data: { id: levelId, is_favored: true, favored_title: "Starlit" }, error: null };
    },
  });

  await service.saveRelic({
    name: "Ashen Promise",
    base_type: "lantern",
    theme: "celestial",
    lore: "A careful vow with enough history.",
    effects: ["blue-flame"],
  }, requestId);
  await service.rollCharm(requestId);
  await service.setCharmEquipped(charmId, true);
  await service.setFavored(levelId, true, "Starlit");

  assert.deepEqual(calls, [
    {
      name: "save_user_relic_with_favor",
      params: {
        relic_payload: {
          name: "Ashen Promise",
          base_type: "lantern",
          theme: "celestial",
          lore: "A careful vow with enough history.",
          effects: ["blue-flame"],
        },
        request_id: requestId,
      },
    },
    { name: "roll_user_relic_charm", params: { request_id: requestId } },
    {
      name: "set_equipped_relic_charm",
      params: { target_charm_id: charmId, should_equip: true },
    },
    {
      name: "set_user_level_favored",
      params: { level_id: levelId, favored: true, title: "Starlit" },
    },
  ]);
});

test("migration owns forge validation, canonical costs, receipts, and balance debit", () => {
  assert.match(migration, /create table if not exists private\.relic_forge_receipts/);
  assert.match(migration, /create table if not exists private\.relic_forge_investments/);
  assert.match(migration, /create or replace function public\.ensure_user_relic\(\)/);
  assert.match(
    migration,
    /create or replace function public\.save_user_relic_with_favor\(\s*relic_payload jsonb,\s*request_id uuid\s*\)/,
  );
  assert.match(migration, /allowed_keys text\[\] := array\['name', 'base_type', 'theme', 'lore', 'effects'\]/);
  assert.match(migration, /when 'lantern' then 45/);
  assert.match(migration, /when 'tome' then 35/);
  assert.match(migration, /when 'mask' then 55/);
  assert.match(migration, /when 'crystal' then 40/);
  assert.match(migration, /when 'instrument' then 50/);
  assert.match(migration, /when 'blue-flame' then 12/);
  assert.match(migration, /when 'star-orbit' then 18/);
  assert.match(migration, /when 'petal-drift' then 10/);
  assert.match(migration, /when 'sigil-glow' then 16/);
  assert.match(migration, /when 'snow-dots' then 8/);
  assert.match(migration, /when 'lore-script' then 14/);
  assert.match(migration, /private\.post_favor_entry\(\s*caller_id,\s*-favor_due/);
  assert.match(migration, /greatest\(prior_favor_spent, canonical_cost\)/);
  assert.match(
    migration,
    /insert into private\.relic_forge_investments \([\s\S]*favor_invested[\s\S]*values \(\s*caller_id,\s*relic_row\.id,\s*0\s*\)/,
  );
  assert.match(
    migration,
    /select investment\.favor_invested\s+into authoritative_favor_spent[\s\S]*jsonb_set\(\s*data,\s*'\{favor_spent\}',\s*pg_catalog\.to_jsonb\(authoritative_favor_spent\)/,
  );
  assert.match(
    migration,
    /from private\.relic_forge_investments as investment[\s\S]*for update/,
  );
  assert.doesNotMatch(
    migration,
    /relic_row\.data ->> 'favor_spent'[\s\S]*prior_favor_spent :=/,
  );
  assert.match(
    migration,
    /update private\.relic_forge_investments[\s\S]*favor_invested = pg_catalog\.greatest\(prior_favor_spent, canonical_cost\)/,
  );
  assert.match(migration, /Relic Forge is closed/);
  assert.match(migration, /caller_role not in \('admin', 'lead_mod'\)/);
  assert.match(migration, /Relic request id was reused with a different payload/);
});

test("completed Forge and charm request replays return before the current gate check", () => {
  const saveFunction = migration.slice(
    migration.indexOf("create or replace function public.save_user_relic_with_favor("),
    migration.indexOf("create or replace function public.roll_user_relic_charm("),
  );
  const rollFunction = migration.slice(
    migration.indexOf("create or replace function public.roll_user_relic_charm("),
    migration.indexOf("create unique index if not exists user_relic_charms_one_roll_instance"),
  );
  const saveGateIndex = saveFunction.indexOf("perform private.assert_relic_forge_open(caller_id);");
  const saveReplayIndex = saveFunction.indexOf(
    "return pg_catalog.jsonb_set(existing_result, '{replayed}', 'true'::jsonb, true);",
  );
  const saveConflictIndex = saveFunction.indexOf(
    "message = 'Relic request id was reused with a different payload'",
  );
  const rollGateIndex = rollFunction.indexOf("perform private.assert_relic_forge_open(caller_id);");
  const rollReplayIndex = rollFunction.indexOf("if existing_charm.id is not null then");

  assert.ok(saveReplayIndex >= 0 && saveReplayIndex < saveGateIndex);
  assert.ok(saveConflictIndex >= 0 && saveConflictIndex < saveGateIndex);
  assert.ok(rollReplayIndex >= 0 && rollReplayIndex < rollGateIndex);
  assert.ok(
    rollGateIndex > rollFunction.indexOf("from public.user_relics as relic"),
    "the serialized existing-roll lookup must finish before a new roll checks the gate",
  );
});

test("displayed relic costs remain in exact parity with the server allow-list", () => {
  for (const base of RELIC_BASES) {
    assert.match(
      migration,
      new RegExp(`when '${base.id}' then ${base.cost}`),
      `${base.id} cost drifted from the server`,
    );
  }
  for (const effect of RELIC_EFFECTS) {
    assert.match(
      migration,
      new RegExp(`when '${effect.id}' then ${effect.cost}`),
      `${effect.id} cost drifted from the server`,
    );
  }
});

test("migration owns charm rolls, achievement-safe slot-exclusive equips, Favored metadata, and final revocation", () => {
  const equipFunction = migration.slice(
    migration.indexOf("create or replace function public.set_equipped_relic_charm("),
    migration.indexOf("create or replace function public.set_user_level_favored("),
  );
  assert.match(migration, /create or replace function public\.roll_user_relic_charm\(\s*request_id uuid\s*\)/);
  assert.match(
    migration,
    /create unique index if not exists user_relic_charms_one_roll_instance/,
  );
  assert.match(
    migration,
    /on conflict \(user_id, \(data ->> 'instance_id'\)\)[\s\S]*do nothing/,
  );
  assert.match(
    equipFunction,
    /create or replace function public\.set_equipped_relic_charm\(\s*target_charm_id uuid,\s*should_equip boolean\s*\)/,
  );
  assert.match(
    equipFunction,
    /select charm\.\*[\s\S]*where charm\.id = target_charm_id[\s\S]*and charm\.user_id = caller_id[\s\S]*for update/,
  );
  assert.match(
    equipFunction,
    /if caller_id is null then[\s\S]*errcode = '42501'[\s\S]*Authentication required/,
  );
  assert.match(
    equipFunction,
    /if owned_charm\.id is null then[\s\S]*Charm is not owned by the caller/,
  );
  assert.match(
    equipFunction,
    /owned_charm\.data #>> '\{source,type\}' = 'achievement'[\s\S]*from public\.user_achievements as unlocked[\s\S]*join public\.achievement_catalog as achievement/,
  );
  assert.match(equipFunction, /data ->> 'slot' = owned_slot/);
  assert.match(
    equipFunction,
    /perform charm\.id[\s\S]*order by charm\.id[\s\S]*for update/,
  );
  assert.match(
    equipFunction,
    /achievement\.reward ->> 'slot' = owned_slot/,
  );
  assert.match(
    equipFunction,
    /where charm\.user_id = caller_id[\s\S]*and charm\.id <> target_charm_id/,
  );
  assert.ok(
    equipFunction.indexOf("perform charm.id") < equipFunction.indexOf("if should_equip then"),
    "all trusted same-slot rows must be locked before slot-exclusive updates",
  );
  assert.match(equipFunction, /return charm_snapshot/);
  assert.match(migration, /create or replace function public\.set_user_level_favored\(\s*level_id uuid,\s*favored boolean,\s*title text\s*\)/);
  assert.match(migration, /caller_role not in \('admin', 'lead_mod', 'mod'\)/);
  assert.match(migration, /\{favored_badge\}/);
  assert.match(migration, /'"crown"'::jsonb/);
  assert.match(migration, /create table if not exists private\.favor_reconciliation_audit/);
  assert.match(migration, /audit_kind in \('mirror_mismatch', 'duplicate_level'\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.user_levels from anon, authenticated/);
  assert.match(migration, /revoke insert, update, delete on table public\.user_relics from anon, authenticated/);
  assert.match(migration, /revoke insert, update, delete on table public\.user_relic_charms from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.save_user_relic_with_favor\(jsonb, uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.roll_user_relic_charm\(uuid\) to authenticated/);
  assert.match(migration, /revoke execute on function public\.set_equipped_relic_charm\(uuid, boolean\) from public, anon/);
  assert.match(migration, /grant execute on function public\.set_equipped_relic_charm\(uuid, boolean\) to authenticated/);
  assert.match(migration, /drop function if exists public\.equip_user_relic_charm\(uuid, boolean\)/);
  assert.match(migration, /grant execute on function public\.set_user_level_favored\(uuid, boolean, text\) to authenticated/);
});

test("cutover locks and revokes legacy mutations before auditing or repairing mirrors", () => {
  const lockIndex = migration.indexOf("lock table public.user_levels");
  const revokeIndex = migration.indexOf(
    "revoke insert, update, delete on table public.user_levels from anon, authenticated",
  );
  const reconcileIndex = migration.indexOf("do $$\ndeclare\n  account_user record;");

  assert.ok(lockIndex >= 0, "legacy tables must be locked for cutover");
  assert.ok(revokeIndex > lockIndex, "revocation must happen while the cutover lock is held");
  assert.ok(reconcileIndex > revokeIndex, "reconciliation must run after revocation");
  assert.match(
    migration,
    /left join lateral \([\s\S]*from public\.user_levels as level_row[\s\S]*\) as mirror on true/,
  );
  assert.match(migration, /'missing_mirror', mirror\.id is null/);
  assert.match(migration, /mirror\.id is null\s+or mirror\.balance is distinct from account\.balance/);
});

test("Starfishing transaction RPCs remain disabled until a post-smoke enable migration", () => {
  assert.match(
    migration,
    /revoke execute on function public\.start_starfishing_cast\(\) from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /revoke execute on function public\.claim_starfishing_catch\(uuid, uuid, text, integer, integer, integer\)\s+from public, anon, authenticated;/,
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.(start_starfishing_cast|claim_starfishing_catch)/,
  );
});

test("Forge, Profile, and Admin contain no generic durable relic or Favor writes", () => {
  assert.doesNotMatch(forgePage, /UserLevel\.update|UserRelic\.update|UserRelic\.create|calculateRelicFavorCost/);
  assert.doesNotMatch(profilePage, /UserRelicCharm\.update|UserRelicCharm\.create/);
  assert.doesNotMatch(adminPage, /UserLevel\.update/);
  assert.match(forgePage, /saveUserRelic\(/);
  assert.match(profilePage, /rollUserRelicCharm\(/);
  assert.match(profilePage, /setEquippedCharm\(/);
  assert.match(adminPage, /setUserLevelFavored\(/);
});
