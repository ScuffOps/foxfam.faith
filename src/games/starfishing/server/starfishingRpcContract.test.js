import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeCastTicket,
  normalizeCatchClaimResult,
} from "./starfishingRpcContract.js";

test("normalizes a cast ticket without accepting client reward fields", () => {
  assert.deepEqual(normalizeCastTicket({
    ticket_id: "11111111-1111-4111-8111-111111111111",
    fish_key: "ember-mote",
    qte_length: 1,
    expires_at: "2026-07-18T20:10:00.000Z",
  }), {
    ticketId: "11111111-1111-4111-8111-111111111111",
    fishKey: "ember-mote",
    qteLength: 1,
    expiresAt: "2026-07-18T20:10:00.000Z",
  });
});

test("rejects a claim response without an authoritative balance", () => {
  assert.throws(() => normalizeCatchClaimResult({
    catch: {},
    favor: { delta: 3 },
  }), /authoritative Favor balance/i);
});

test("normalizes complete cast metadata and allow-listed passive effects", () => {
  assert.deepEqual(normalizeCastTicket({
    ticket_id: "11111111-1111-4111-8111-111111111111",
    fish_key: "comet-koi",
    qte_length: 3,
    applied_effects: [{
      key: "rare_bite_bonus_bps",
      value: 300,
      label: "+3% rare bite chance",
    }],
    not_before: "2026-07-18T20:00:02.100Z",
    expires_at: "2026-07-18T20:10:00.000Z",
    base_favor: 999999,
  }), {
    ticketId: "11111111-1111-4111-8111-111111111111",
    fishKey: "comet-koi",
    qteLength: 3,
    appliedEffects: [{
      key: "rare_bite_bonus_bps",
      value: 300,
      label: "+3% rare bite chance",
    }],
    notBefore: "2026-07-18T20:00:02.100Z",
    expiresAt: "2026-07-18T20:10:00.000Z",
  });
});

test("rejects missing ticket IDs and unknown fish or passive-effect keys", () => {
  const validTicket = {
    ticket_id: "11111111-1111-4111-8111-111111111111",
    fish_key: "ember-mote",
    qte_length: 1,
    expires_at: "2026-07-18T20:10:00.000Z",
  };

  assert.throws(
    () => normalizeCastTicket({ ...validTicket, ticket_id: undefined }),
    /ticket ID/i,
  );
  assert.throws(
    () => normalizeCastTicket({ ...validTicket, fish_key: "client-invented-fish" }),
    /unknown fish key/i,
  );
  assert.throws(
    () => normalizeCastTicket({
      ...validTicket,
      applied_effects: [{ key: "mint_favor", value: 500, label: "Nope" }],
    }),
    /unknown passive effect key/i,
  );
});

test("normalizes a complete authoritative claim result", () => {
  assert.deepEqual(normalizeCatchClaimResult({
    catch: {
      id: "22222222-2222-4222-8222-222222222222",
      fish_key: "comet-koi",
      label: "Comet Koi",
      rarity: "rare",
      size: 18.25,
      duplicate: true,
      duplicate_policy: "release",
      caught_at: "2026-07-18T20:00:05.000Z",
    },
    fishpedia: {
      fish_key: "comet-koi",
      caught_count: 2,
      smallest_size: 15.5,
      largest_size: 18.25,
      first_caught_at: "2026-07-17T20:00:05.000Z",
      last_caught_at: "2026-07-18T20:00:05.000Z",
      discovered_count: 3,
      catalog_count: 6,
      completion_percent: 50,
    },
    favor: { delta: 7, balance: 42 },
    materials: [{
      key: "star-glass",
      label: "Star Glass",
      delta: 0,
      balance: 12,
    }],
    achievements: [{
      achievement_key: "gentle-return",
      title: "Gentle Return",
      description: "Release your first duplicate catch for Favor.",
    }],
    charms: [],
    applied_effects: [{
      key: "favor_multiplier_bps",
      value: 500,
      label: "+5% catch Favor",
    }],
    replayed: false,
  }), {
    catch: {
      id: "22222222-2222-4222-8222-222222222222",
      fishKey: "comet-koi",
      label: "Comet Koi",
      rarity: "rare",
      size: 18.25,
      duplicate: true,
      duplicatePolicy: "release",
      caughtAt: "2026-07-18T20:00:05.000Z",
    },
    fishpedia: {
      fishKey: "comet-koi",
      caughtCount: 2,
      smallestSize: 15.5,
      largestSize: 18.25,
      firstCaughtAt: "2026-07-17T20:00:05.000Z",
      lastCaughtAt: "2026-07-18T20:00:05.000Z",
      discoveredCount: 3,
      catalogCount: 6,
      completionPercent: 50,
    },
    favor: { delta: 7, balance: 42 },
    materials: [{
      key: "star-glass",
      label: "Star Glass",
      delta: 0,
      balance: 12,
    }],
    achievements: [{
      achievementKey: "gentle-return",
      title: "Gentle Return",
      description: "Release your first duplicate catch for Favor.",
    }],
    charms: [],
    appliedEffects: [{
      key: "favor_multiplier_bps",
      value: 500,
      label: "+5% catch Favor",
    }],
    replayed: false,
  });
});

test("rejects negative balances, malformed achievements, and unknown claim effects", () => {
  const validResult = {
    catch: {
      id: "22222222-2222-4222-8222-222222222222",
      fish_key: "ember-mote",
      label: "Ember Mote",
      rarity: "common",
      size: 3.5,
      duplicate: false,
      duplicate_policy: "none",
      caught_at: "2026-07-18T20:00:05.000Z",
    },
    fishpedia: {
      fish_key: "ember-mote",
      caught_count: 1,
      smallest_size: 3.5,
      largest_size: 3.5,
      first_caught_at: "2026-07-18T20:00:05.000Z",
      last_caught_at: "2026-07-18T20:00:05.000Z",
      discovered_count: 1,
      catalog_count: 6,
      completion_percent: 17,
    },
    favor: { delta: 3, balance: 3 },
    materials: [],
    achievements: [],
    charms: [],
    applied_effects: [],
    replayed: false,
  };

  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      favor: { delta: 3, balance: -1 },
    }),
    /authoritative Favor balance/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({ ...validResult, achievements: {} }),
    /achievements must be an array/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      applied_effects: [{ key: "mint_favor", value: 1, label: "Nope" }],
    }),
    /unknown passive effect key/i,
  );
});

test("migration defines locked security-definer cast and claim transactions", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /create or replace function public\.start_starfishing_cast\(\)/);
  assert.match(
    migration,
    /create or replace function public\.claim_starfishing_catch\(\s*claim_ticket_id uuid,\s*claim_idempotency_key uuid,\s*claim_duplicate_policy text,\s*claim_qte_action_count integer,\s*claim_miss_count integer,\s*claim_duration_ms integer\s*\)/,
  );
  assert.equal((migration.match(/security definer\s+set search_path = ''/g) || []).length, 2);
  assert.equal((migration.match(/if \(select auth\.uid\(\)\) is null then/g) || []).length, 2);
  assert.equal(
    (migration.match(/select id\s+into locked_user_id\s+from auth\.users\s+where id = caller_id\s+for update/g) || []).length,
    2,
  );
  assert.match(migration, /update public\.game_cast_tickets\s+set consumed_at = cast_created_at\s+where user_id = caller_id\s+and consumed_at is null/);
  assert.match(migration, /from public\.user_relic_charms\s+where user_id = caller_id\s+and data ->> 'equipped' = 'true'\s+and data ->> 'slot' = 'fishing'/);
  assert.match(migration, /least\(2500/);
  assert.match(migration, /least\(500/);
  assert.match(migration, /least\(1000/);
  assert.match(migration, /when 'mythic' then 0/);
});

test("claim migration validates inputs, snapshots before insert, and locks execution down", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );
  const snapshotAssignment = migration.indexOf("claim_result_snapshot := pg_catalog.jsonb_build_object(");
  const catchInsert = migration.indexOf("insert into public.game_catches (");

  assert.match(migration, /message = 'Invalid duplicate policy'/);
  assert.match(migration, /message = 'Invalid QTE action count'/);
  assert.match(migration, /message = 'Invalid QTE miss count'/);
  assert.match(migration, /message = 'Invalid claim duration'/);
  assert.match(
    migration,
    /from public\.game_catches as catch_row\s+where catch_row\.user_id = caller_id\s+and catch_row\.idempotency_key = requested_idempotency_key/,
  );
  assert.match(
    migration,
    /from public\.game_cast_tickets as ticket_row\s+where ticket_row\.id = claim_ticket_id\s+for update/,
  );
  assert.ok(snapshotAssignment >= 0, "claim snapshot assignment is missing");
  assert.ok(catchInsert > snapshotAssignment, "catch must not be inserted before the full snapshot exists");
  assert.match(migration, /data #>> '\{source,type\}' = 'achievement'/);
  assert.match(migration, /\(user_id, \(data #>> '\{source,key\}'\)\)/);
  assert.match(
    migration,
    /'source', pg_catalog\.jsonb_build_object\(\s*'type',\s*'achievement',\s*'key',\s*achievement\.achievement_key\s*\)/,
  );
  assert.match(
    migration,
    /owned_charm\.data #>> '\{source,type\}' = 'achievement'\s+and owned_charm\.data #>> '\{source,key\}' = achievement\.achievement_key/,
  );
  assert.match(
    migration,
    /from public\.user_levels as level_row\s+where level_row\.user_id = caller_id\s+order by level_row\.created_at, level_row\.id\s+limit 1\s+for update/,
  );
  assert.match(migration, /pg_catalog\.jsonb_set\(data, '\{points\}'/);
  assert.match(migration, /revoke execute on function public\.start_starfishing_cast\(\) from public, anon;/);
  assert.match(migration, /grant execute on function public\.start_starfishing_cast\(\) to authenticated;/);
  assert.match(migration, /revoke execute on function public\.claim_starfishing_catch\(uuid, uuid, text, integer, integer, integer\)\s+from public, anon;/);
  assert.match(migration, /grant execute on function public\.claim_starfishing_catch\(uuid, uuid, text, integer, integer, integer\)\s+to authenticated;/);
});
