import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeCastTicket,
  normalizeCatchClaimResult,
} from "./starfishingRpcContract.js";

const MAX_SAFE_INTEGER = 9007199254740991;

function makeValidClaimResult() {
  return {
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
}

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
      label: "3% non-mythic rarity weighting",
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
      label: "3% non-mythic rarity weighting",
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
  const validResult = makeValidClaimResult();

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

test("accepts the full transport-safe reward bound and rejects values above it", () => {
  const validResult = makeValidClaimResult();
  const upperBoundResult = {
    ...validResult,
    favor: {
      delta: MAX_SAFE_INTEGER,
      balance: MAX_SAFE_INTEGER,
    },
    materials: [{
      key: "star-glass",
      label: "Star Glass",
      delta: MAX_SAFE_INTEGER,
      balance: MAX_SAFE_INTEGER,
    }],
  };

  assert.deepEqual(normalizeCatchClaimResult(upperBoundResult).favor, {
    delta: MAX_SAFE_INTEGER,
    balance: MAX_SAFE_INTEGER,
  });
  assert.deepEqual(normalizeCatchClaimResult(upperBoundResult).materials[0], {
    key: "star-glass",
    label: "Star Glass",
    delta: MAX_SAFE_INTEGER,
    balance: MAX_SAFE_INTEGER,
  });
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      favor: { delta: 1, balance: MAX_SAFE_INTEGER + 1 },
    }),
    /authoritative Favor balance/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      materials: [{
        key: "star-glass",
        label: "Star Glass",
        delta: 1,
        balance: MAX_SAFE_INTEGER + 1,
      }],
    }),
    /material balance/i,
  );
});

test("normalizes a zero-count Fishpedia response", () => {
  const validResult = makeValidClaimResult();

  assert.deepEqual(normalizeCatchClaimResult({
    ...validResult,
    fishpedia: {
      ...validResult.fishpedia,
      discovered_count: 0,
      catalog_count: 0,
      completion_percent: 0,
    },
  }).fishpedia, {
    fishKey: "ember-mote",
    caughtCount: 1,
    smallestSize: 3.5,
    largestSize: 3.5,
    firstCaughtAt: "2026-07-18T20:00:05.000Z",
    lastCaughtAt: "2026-07-18T20:00:05.000Z",
    discoveredCount: 0,
    catalogCount: 0,
    completionPercent: 0,
  });
});

test("rejects non-ISO or impossible response timestamps", () => {
  const validTicket = {
    ticket_id: "11111111-1111-4111-8111-111111111111",
    fish_key: "ember-mote",
    qte_length: 1,
    expires_at: "2026-07-18T20:10:00.000Z",
  };
  const validResult = makeValidClaimResult();

  assert.throws(
    () => normalizeCastTicket({ ...validTicket, expires_at: "July 18, 2026 8:10 PM" }),
    /ISO timestamp/i,
  );
  assert.throws(
    () => normalizeCastTicket({ ...validTicket, expires_at: "2026-02-30T20:10:00Z" }),
    /ISO timestamp/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      catch: { ...validResult.catch, caught_at: "2026-07-18 20:00:05" },
    }),
    /ISO timestamp/i,
  );
});

test("rejects contradictory duplicate policies and mismatched Fishpedia state", () => {
  const validResult = makeValidClaimResult();

  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      catch: {
        ...validResult.catch,
        duplicate: false,
        duplicate_policy: "release",
      },
    }),
    /duplicate policy/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      catch: {
        ...validResult.catch,
        duplicate: true,
        duplicate_policy: "none",
      },
    }),
    /duplicate policy/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      fishpedia: { ...validResult.fishpedia, fish_key: "comet-koi" },
    }),
    /fish keys must agree/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      fishpedia: {
        ...validResult.fishpedia,
        smallest_size: 4.5,
        largest_size: 3.5,
      },
    }),
    /size range/i,
  );
});

test("allow-lists achievement and charm reward shapes", () => {
  const validResult = makeValidClaimResult();
  const validCharm = {
    id: "33333333-3333-4333-8333-333333333333",
    charm_key: "starlit-bobber",
    label: "Starlit Bobber",
    rarity: "uncommon",
    slot: "fishing",
    effects: { favor_multiplier_bps: 500 },
    equipped: false,
    acquired_at: "2026-07-18T20:00:05.000Z",
    source: { type: "achievement", key: "first-light" },
  };

  assert.doesNotThrow(() => normalizeCatchClaimResult({
    ...validResult,
    achievements: [{
      achievement_key: "first-light",
      title: "First Light",
      description: "Make your first successful Starfishing catch.",
    }],
    charms: [validCharm],
  }));
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      achievements: [{
        achievement_key: "client-achievement",
        title: "Invented",
        description: "Not canonical.",
      }],
    }),
    /unknown achievement key/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      achievements: [{
        achievement_key: "first-light",
        title: "Invented title",
        description: "Make your first successful Starfishing catch.",
      }],
    }),
    /canonical reward shape/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      achievements: [
        {
          achievement_key: "first-light",
          title: "First Light",
          description: "Make your first successful Starfishing catch.",
        },
        {
          achievement_key: "first-light",
          title: "First Light",
          description: "Make your first successful Starfishing catch.",
        },
      ],
    }),
    /duplicate achievement key/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      charms: [{ ...validCharm, charm_key: "client-charm" }],
    }),
    /unknown achievement charm/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      charms: [{ ...validCharm, effects: { mint_favor: 999 } }],
    }),
    /charm reward shape/i,
  );
  assert.throws(
    () => normalizeCatchClaimResult({
      ...validResult,
      charms: [
        validCharm,
        {
          ...validCharm,
          id: "44444444-4444-4444-8444-444444444444",
        },
      ],
    }),
    /duplicate canonical charm source/i,
  );
});

test("migration defines locked security-definer game and Favor transactions", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /create or replace function public\.start_starfishing_cast\(\)/);
  assert.match(
    migration,
    /create or replace function public\.claim_starfishing_catch\(\s*claim_ticket_id uuid,\s*claim_idempotency_key uuid,\s*claim_duplicate_policy text,\s*claim_qte_action_count integer,\s*claim_miss_count integer,\s*claim_duration_ms integer\s*\)/,
  );
  assert.equal((migration.match(/security definer\s+set search_path = ''/g) || []).length, 9);
  assert.equal((migration.match(/if \(select auth\.uid\(\)\) is null then/g) || []).length, 3);
  assert.equal(
    (migration.match(/select id\s+into locked_user_id\s+from auth\.users\s+where id = caller_id\s+for update/g) || []).length,
    3,
  );
  assert.match(migration, /update public\.game_cast_tickets\s+set consumed_at = cast_created_at\s+where user_id = caller_id\s+and consumed_at is null/);
  assert.match(migration, /from public\.user_relic_charms\s+where user_id = caller_id\s+and data ->> 'equipped' = 'true'\s+and data ->> 'slot' = 'fishing'/);
  assert.match(migration, /least\(2500/);
  assert.match(migration, /least\(500/);
  assert.match(migration, /least\(1000/);
  assert.match(migration, /when 'mythic' then 0/);
});

test("migration captures authoritative clocks after locks and bounds rarity weighting", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );
  const startFunction = migration.slice(
    migration.indexOf("create or replace function public.start_starfishing_cast()"),
    migration.indexOf("create or replace function public.claim_starfishing_catch("),
  );
  const claimFunction = migration.slice(
    migration.indexOf("create or replace function public.claim_starfishing_catch("),
    migration.indexOf("revoke execute on function public.start_starfishing_cast()"),
  );

  assert.ok(
    startFunction.indexOf("cast_created_at := pg_catalog.clock_timestamp();")
      > startFunction.indexOf("from public.game_cast_tickets as prior_ticket"),
    "cast time must be captured after prior ticket locks",
  );
  assert.ok(
    claimFunction.indexOf("claim_created_at := pg_catalog.clock_timestamp();")
      > claimFunction.indexOf("from public.game_cast_tickets as ticket_row"),
    "claim time must be captured after the ticket lock",
  );
  assert.doesNotMatch(startFunction, /rare_bite_bonus_bps \* case fish\.rarity/);
  assert.match(startFunction, /when 'common' then -rare_bite_bonus_bps/);
  assert.match(startFunction, /when 'epic' then rare_bite_bonus_bps/);
  assert.match(startFunction, /when 'mythic' then 0/);
  assert.match(startFunction, /% non-mythic rarity weighting/);
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
  assert.match(migration, /private\.ensure_favor_account\(caller_id\)/);
  assert.match(
    migration,
    /pg_catalog\.jsonb_set\(\s*pg_catalog\.jsonb_set\(\s*coalesce\(data, '\{\}'::jsonb\),\s*'\{user_key\}'/,
  );
  assert.match(migration, /revoke execute on function public\.start_starfishing_cast\(\) from public, anon;/);
  assert.match(migration, /grant execute on function public\.start_starfishing_cast\(\) to authenticated;/);
  assert.match(migration, /revoke execute on function public\.claim_starfishing_catch\(uuid, uuid, text, integer, integer, integer\)\s+from public, anon;/);
  assert.match(migration, /grant execute on function public\.claim_starfishing_catch\(uuid, uuid, text, integer, integer, integer\)\s+to authenticated;/);
});

test("claim migration uses active Fishpedia completion and preserves canonical level ownership", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migration,
    /from public\.user_fishpedia as fishpedia_row\s+join public\.game_fish_catalog as active_fish\s+on active_fish\.fish_key = fishpedia_row\.fish_key\s+and active_fish\.active\s+where fishpedia_row\.user_id = caller_id/,
  );
  assert.match(
    migration,
    /create or replace function private\.sync_favor_mirror\([\s\S]*pg_catalog\.jsonb_set\(\s*pg_catalog\.jsonb_set\(\s*coalesce\(data, '\{\}'::jsonb\),\s*'\{user_key\}',\s*pg_catalog\.to_jsonb\('user:' \|\| mirror_user_id::text\),\s*true\s*\),\s*'\{points\}'/,
  );
  assert.match(migration, /private\.post_favor_entry\(\s*caller_id,\s*favor_delta/);
});

test("claim migration returns actual charm rows and imports one safe legacy opening balance", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );
  const snapshotAssignment = migration.indexOf("claim_result_snapshot := pg_catalog.jsonb_build_object(");
  const charmInsert = migration.indexOf("insert into public.user_relic_charms as inserted_charm");
  const accountCreated = migration.indexOf("returning true into account_created;");
  const openingGuard = migration.indexOf("if coalesce(account_created, false) then");
  const openingLedger = migration.indexOf("insert into public.currency_ledger", openingGuard);
  const catchLedger = migration.indexOf("'starfishing_catch'", openingLedger);

  assert.ok(charmInsert >= 0 && charmInsert < snapshotAssignment);
  assert.match(
    migration,
    /insert into public\.user_relic_charms as inserted_charm[\s\S]*on conflict do nothing\s+returning pg_catalog\.jsonb_build_object\(/,
  );
  assert.match(
    migration,
    /from public\.user_relic_charms as owned_charm\s+where owned_charm\.user_id = caller_id\s+and owned_charm\.data #>> '\{source,type\}' = 'achievement'/,
  );
  assert.match(
    migration,
    /where level_row\.user_id = account_user_id[\s\S]*where level_row\.data ->> 'user_key' = 'user:' \|\| account_user_id::text\s+and \(level_row\.user_id is null or level_row\.user_id = account_user_id\)/,
  );
  assert.match(
    migration,
    /pg_catalog\.md5\(\s*'starfishing:favor:legacy-opening:' \|\| account_user_id::text\s*\)/,
  );
  assert.match(
    migration,
    /if legacy_user_level_data ->> 'points' ~ '\^\[0-9\]\+\$' then\s+if \(legacy_user_level_data ->> 'points'\)::numeric > 9007199254740991 then\s+raise exception using\s+errcode = '22003',\s+message = 'Legacy Favor opening balance exceeds JavaScript safe integer range';\s+end if;\s+legacy_opening_balance := \(legacy_user_level_data ->> 'points'\)::bigint;/,
  );
  assert.match(migration, /'legacy_opening_balance'/);
  assert.match(
    migration,
    /insert into public\.currency_ledger[\s\S]*'legacy_opening_balance'[\s\S]*on conflict \(user_id, currency_key, idempotency_key\) do nothing/,
  );
  assert.ok(
    accountCreated >= 0
      && accountCreated < openingGuard
      && openingGuard < openingLedger,
    "opening ledger must be conditional on creating the missing Favor account",
  );
  assert.ok(openingLedger >= 0 && openingLedger < catchLedger);
});

test("migration bounds persisted and returned balances to JavaScript safe integers", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260718200316_starfishing_phase_2_progression.sql", import.meta.url),
    "utf8",
  );
  const claimFunction = migration.slice(
    migration.indexOf("create or replace function public.claim_starfishing_catch("),
    migration.indexOf("revoke execute on function public.start_starfishing_cast()"),
  );
  const ensureFunction = migration.slice(
    migration.indexOf("create or replace function private.ensure_favor_account("),
    migration.indexOf("create or replace function private.post_favor_entry("),
  );
  const postFunction = migration.slice(
    migration.indexOf("create or replace function private.post_favor_entry("),
    migration.indexOf("create or replace function public.perform_portal_favor_action("),
  );
  const openingRangeError = ensureFunction.indexOf(
    "message = 'Legacy Favor opening balance exceeds JavaScript safe integer range'",
  );
  const favorRangeError = postFunction.indexOf(
    "message = 'Favor balance exceeds JavaScript safe integer range'",
  );
  const materialRangeError = claimFunction.indexOf(
    "message = 'Material balance exceeds JavaScript safe integer range'",
  );
  const favorAccountLookup = ensureFunction.indexOf(
    "from public.currency_accounts as account",
  );
  const openingImportParse = ensureFunction.indexOf(
    "if legacy_user_level_data ->> 'points' ~ '^[0-9]+$' then",
  );
  const accountInsert = ensureFunction.indexOf("insert into public.currency_accounts");
  const favorLedgerInsert = postFunction.indexOf("insert into public.currency_ledger");
  const claimFavorMutation = claimFunction.indexOf("private.post_favor_entry(");

  assert.match(
    claimFunction,
    /declare\s+transport_safe_max constant bigint := 9007199254740991;/,
  );
  assert.match(
    migration,
    /create table public\.currency_accounts \([\s\S]*balance bigint not null default 0 check \(balance between 0 and 9007199254740991\)/,
  );
  assert.match(
    migration,
    /create table public\.currency_ledger \([\s\S]*balance_after bigint not null check \(balance_after between 0 and 9007199254740991\)/,
  );
  assert.match(
    migration,
    /create table public\.user_material_balances \([\s\S]*balance bigint not null default 0 check \(balance between 0 and 9007199254740991\)/,
  );
  assert.match(
    migration,
    /create table public\.material_ledger \([\s\S]*balance_after bigint not null check \(balance_after between 0 and 9007199254740991\)/,
  );
  assert.ok(
    openingRangeError >= 0 && openingRangeError < accountInsert,
    "opening balance must be rejected before reward mutation",
  );
  assert.ok(
    favorRangeError >= 0 && favorRangeError < favorLedgerInsert,
    "post-credit Favor balance must be rejected before reward mutation",
  );
  assert.ok(
    materialRangeError >= 0 && materialRangeError < claimFavorMutation,
    "post-credit material balances must be rejected before reward mutation",
  );
  assert.match(
    postFunction,
    /next_balance_numeric > 9007199254740991[\s\S]*message = 'Favor balance exceeds JavaScript safe integer range'/,
  );
  assert.match(
    claimFunction,
    /if previous_material_balance > transport_safe_max - material_delta then\s+raise exception using\s+errcode = '22003',\s+message = 'Material balance exceeds JavaScript safe integer range';/,
  );
  assert.ok(
    favorAccountLookup >= 0
      && favorAccountLookup < openingImportParse,
    "legacy points must only be parsed for a missing Favor account",
  );
  assert.match(claimFunction, /private\.ensure_favor_account\(caller_id\)/);
  assert.match(claimFunction, /private\.post_favor_entry\(/);
  assert.match(
    claimFunction,
    /when catalog_count = 0 then 0\s+else least\(\s*100,\s*greatest\(\s*0,\s*pg_catalog\.round\(discovered_count::numeric \* 100 \/ catalog_count\)::integer\s*\)\s*\)/,
  );
  assert.match(
    claimFunction,
    /'favor', pg_catalog\.jsonb_build_object\(\s*'delta', favor_delta,\s*'balance', favor_balance\s*\)/,
  );
  assert.match(
    claimFunction,
    /'balance', material_balance/,
  );
});
