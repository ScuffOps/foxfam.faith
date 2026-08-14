import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  normalizeGameRewardClaim,
  normalizeGameRewardProgress,
  normalizeGameRewardSession,
  normalizeBobaCafeAction,
  normalizeFindVezmirAction,
  normalizeMatchMergeAction,
  normalizeTimeRunnerAction,
  normalizeWordGardenAction,
} from "./gameRewardRpcContract.js";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(
  HERE,
  "../../../../supabase/migrations/20260721120000_add_game_reward_claim_boundary.sql",
), "utf8");
const MATCH_MERGE_MIGRATION = readFileSync(join(
  HERE,
  "../../../../supabase/migrations/20260722120000_add_match_merge_reward_actions.sql",
), "utf8");

test("normalizes a server-owned Word Garden session", () => {
  const result = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "word-garden",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    puzzle: {
      date: "2026-07-21",
      key: "petal-rite",
      title: "Petal Rite",
      letters: "PETALSR",
      center: "A",
    },
    started_at: "2026-07-21T12:00:00.000Z",
    expires_at: "2026-07-21T12:30:00.000Z",
  });

  assert.equal(result.sessionId, SESSION_ID);
  assert.equal(result.puzzle.letters, "PETALSR");
  assert.equal(result.puzzle.center, "A");
});

test("rejects session payloads that expose accepted words", () => {
  assert.throws(() => normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "word-garden",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    puzzle: {
      date: "2026-07-21",
      key: "petal-rite",
      title: "Petal Rite",
      letters: "PETALSR",
      center: "A",
      accepted_words: ["PALE"],
    },
    started_at: "2026-07-21T12:00:00.000Z",
    expires_at: "2026-07-21T12:30:00.000Z",
  }));
});

test("normalizes Blooming Ink canonical context and submit-only word intents", () => {
  const session = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "word-garden",
    display_name: "Blooming Ink",
    rules_version: 2,
    seed: "33333333-3333-4333-8333-333333333333",
    puzzle: {
      date: "2026-07-22",
      key: "petal-rite",
      title: "Petal Rite",
      letters: "PETALSR",
      center: "A",
    },
    context: {
      display_name: "Blooming Ink",
      puzzle_key: "petal-rite",
      phase: "playing",
      found_words: ["PALE"],
      score: 4,
      full_bloom_count: 0,
      action_index: 1,
      completed_at: null,
    },
    started_at: "2026-07-22T12:00:00.000Z",
    expires_at: "2026-07-22T12:30:00.000Z",
  });
  assert.deepEqual(session.context.found_words, ["PALE"]);
  assert.deepEqual(normalizeWordGardenAction({ op: "submit", word: "PALE" }), { op: "submit", word: "PALE" });
  assert.deepEqual(normalizeWordGardenAction({ op: "rest" }), { op: "rest" });
  assert.throws(() => normalizeWordGardenAction({ op: "submit", word: "PALE", score: 999 }));
});

test("normalizes the deployed Blooming Ink progress payload", () => {
  const progress = normalizeGameRewardProgress({
    session_id: SESSION_ID,
    game_key: "word-garden",
    display_name: "Blooming Ink",
    action_index: 1,
    state: {
      display_name: "Blooming Ink",
      puzzle_key: "petal-rite",
      phase: "playing",
      found_words: ["PALE"],
      score: 4,
      full_bloom_count: 0,
      action_index: 1,
      completed_at: null,
    },
    replayed: false,
  });

  assert.deepEqual(progress.state.found_words, ["PALE"]);
});

test("normalizes a server-owned Match and Merge session and progress snapshot", () => {
  const context = {
    grid: [1, 1, 1, 1, 2, 2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,
    moves: 0,
    highest_tier: 2,
    merge_streak: 0,
    best_chain: 0,
    last_merge_at: null,
    action_index: 0,
  };
  const session = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "match-merge",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    context,
    started_at: "2026-07-21T12:00:00.000Z",
    expires_at: "2026-07-21T12:30:00.000Z",
  });
  assert.deepEqual(session.context.grid, context.grid);

  const progress = normalizeGameRewardProgress({
    session_id: SESSION_ID,
    game_key: "match-merge",
    action_index: 1,
    state: { ...context, score: 55, moves: 1, merge_streak: 1, best_chain: 1, action_index: 1, last_merge_at: "2026-07-21T12:00:01.000Z" },
    replayed: false,
  });
  assert.equal(progress.state.score, 55);
  assert.equal(progress.actionIndex, 1);
});

test("accepts merge intent only and rejects client-authored result fields", () => {
  assert.deepEqual(normalizeMatchMergeAction({ op: "merge", from: 0, to: 1 }), { op: "merge", from: 0, to: 1 });
  assert.throws(() => normalizeMatchMergeAction({ op: "merge", from: 0, to: 1, score: 999 }));
  assert.throws(() => normalizeMatchMergeAction({ op: "merge", from: 0, to: 16 }));
});

test("normalizes server-owned Boba Cafe sessions, progress, and narrow actions", () => {
  const context = {
    phase: "serving",
    order_index: 0,
    active_order: {
      order_key: "lantern-latte",
      order_label: "Lantern Latte",
      customer: { key: "choir-helper", label: "Choir Helper", palette: ["#f9a8d4", "#7dd3fc"] },
      recipe: { tea: "black-tea", milk: "cream-cloud", topping: "brown-sugar-pearls", charm: "lantern-pick", sweetness: "glow" },
      placed_at: "2026-07-22T12:00:00.000Z",
      deadline_at: "2026-07-22T12:00:32.000Z",
      patience_ms: 32000,
    },
    tray: { tea: null, milk: null, topping: null, charm: null, sweetness: null },
    score: 0,
    served_count: 0,
    perfect_count: 0,
    combo: 0,
    best_combo: 0,
    mistakes: 0,
    last_result: null,
    action_index: 0,
    completed_at: null,
  };
  const session = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "boba-cafe",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    context,
    started_at: "2026-07-22T12:00:00.000Z",
    expires_at: "2026-07-22T12:30:00.000Z",
  });
  assert.equal(session.context.active_order.order_key, "lantern-latte");

  const progress = normalizeGameRewardProgress({
    session_id: SESSION_ID,
    game_key: "boba-cafe",
    action_index: 1,
    state: { ...context, tray: { ...context.tray, tea: "black-tea" }, action_index: 1 },
    replayed: false,
  });
  assert.equal(progress.state.tray.tea, "black-tea");

  assert.deepEqual(normalizeBobaCafeAction({ op: "select", station: "tea", choice: "black-tea" }), {
    op: "select", station: "tea", choice: "black-tea",
  });
  assert.deepEqual(normalizeBobaCafeAction({ op: "settle" }), { op: "settle" });
  assert.throws(() => normalizeBobaCafeAction({ op: "serve", score: 999 }));
  assert.throws(() => normalizeBobaCafeAction({ op: "select", station: "score", choice: "999" }));
});

test("normalizes server-owned Find Vezmir sessions and coordinate-only actions", () => {
  const context = {
    phase: "seeking",
    targets: [
      { key: "moon-mug", role: "clue", layer: "foreground", x: 180, y: 750, radius: 58 },
      { key: "ribbon-bell", role: "clue", layer: "room", x: 380, y: 390, radius: 58 },
      { key: "fox-pin", role: "clue", layer: "foreground", x: 610, y: 760, radius: 58 },
      { key: "star-note", role: "clue", layer: "background", x: 800, y: 340, radius: 58 },
      { key: "seed-pouch", role: "clue", layer: "room", x: 850, y: 710, radius: 58 },
      { key: "vezmir", role: "final", layer: "background", x: 520, y: 520, radius: 78 },
    ],
    found_keys: ["moon-mug"],
    active_hint_key: null,
    focus: 5,
    misses: 0,
    hints_used: 0,
    score: 365,
    elapsed_ms: 1000,
    started_at: "2026-07-22T12:00:00.000Z",
    action_index: 1,
    completed_at: null,
  };
  const session = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "puzzle-cat",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    context,
    started_at: "2026-07-22T12:00:00.000Z",
    expires_at: "2026-07-22T12:30:00.000Z",
  });
  assert.deepEqual(session.context.found_keys, ["moon-mug"]);

  const progress = normalizeGameRewardProgress({
    session_id: SESSION_ID,
    game_key: "puzzle-cat",
    action_index: 2,
    state: { ...context, hints_used: 1, active_hint_key: "ribbon-bell", action_index: 2 },
    replayed: false,
  });
  assert.equal(progress.state.active_hint_key, "ribbon-bell");

  assert.deepEqual(normalizeFindVezmirAction({ op: "search", x: 197, y: 758, layer: "foreground" }), {
    op: "search", x: 197, y: 758, layer: "foreground",
  });
  assert.deepEqual(normalizeFindVezmirAction({ op: "hint" }), { op: "hint" });
  assert.throws(() => normalizeFindVezmirAction({ op: "search", objectKey: "moon-mug", layer: "foreground" }));
  assert.throws(() => normalizeFindVezmirAction({ op: "search", x: 1001, y: 500, layer: "foreground" }));
});

test("normalizes server-owned Time Runner snapshots and narrow intents", () => {
  const context = {
    phase: "running",
    layout: Array.from({ length: 24 }, (_, index) => ({
      id: `time-${index}`,
      at_ms: 1200 + index * 1700,
      kind: index % 3 === 0 ? "hand-sweep" : index % 3 === 1 ? "roman-gate" : "clock-shard",
      required_op: index % 3 === 0 ? "jump" : index % 3 === 1 ? "duck" : null,
      resolved: false,
      outcome: null,
    })),
    elapsed_ms: 0,
    falls: 0,
    clock_shards: 0,
    cleared_hazards: 0,
    focus: 0,
    focus_started_ms: 0,
    focus_until_ms: 0,
    combo: 0,
    best_combo: 0,
    route_step: 0,
    available_landings: [
      { id: "landing-0-0", kind: "minute-hand", label: "Minute hand", branch: 0 },
      { id: "landing-0-1", kind: "roman-dial", label: "Roman dial", branch: 1 },
    ],
    score: 0,
    started_at: "2026-07-22T12:00:00.000Z",
    completed_at: null,
    action_index: 0,
  };
  const session = normalizeGameRewardSession({
    session_id: SESSION_ID,
    game_key: "time-runner",
    rules_version: 1,
    seed: "33333333-3333-4333-8333-333333333333",
    context,
    started_at: "2026-07-22T12:00:00.000Z",
    expires_at: "2026-07-22T12:10:00.000Z",
  });
  assert.equal(session.context.layout.length, 24);

  const progress = normalizeGameRewardProgress({
    session_id: SESSION_ID,
    game_key: "time-runner",
    action_index: 1,
    state: { ...context, elapsed_ms: 1200, action_index: 1 },
    replayed: false,
  });
  assert.equal(progress.state.elapsed_ms, 1200);
  assert.deepEqual(normalizeTimeRunnerAction({ op: "jump", hazard_id: "time-0" }), { op: "jump", hazard_id: "time-0" });
  assert.deepEqual(normalizeTimeRunnerAction({ op: "land", landing_id: "landing-0-1" }), { op: "land", landing_id: "landing-0-1" });
  assert.deepEqual(normalizeTimeRunnerAction({ op: "sync" }), { op: "sync" });
  assert.throws(() => normalizeTimeRunnerAction({ op: "jump", hazard_id: "time-0", score: 999 }));
});

test("normalizes an authoritative claim snapshot", () => {
  const result = normalizeGameRewardClaim({
    reward_event_id: EVENT_ID,
    session_id: SESSION_ID,
    game_key: "word-garden",
    display_name: "Blooming Ink",
    score: 19,
    favor: { delta: 4, balance: 104, cap_remaining: 76 },
    materials: [{ key: "blooming-ink", delta: 3, balance: 8 }],
    achievements: [{
      key: "word-garden-first-sprout",
      title: "First Sprout",
      collectible: {
        kind: "charm",
        charm_key: "blooming-ink-sprout",
        label: "Blooming Ink Sprout",
        description: "A first word preserved as a small living sprout.",
        rarity: "uncommon",
        slot: "root",
        effects: { profile_particle: "ink-petals" },
        trophy_key: "first-sprout",
      },
    }],
    replayed: false,
  });

  assert.equal(result.rewardEventId, EVENT_ID);
  assert.equal(result.favor.delta, 4);
  assert.deepEqual(result.materials[0], { key: "blooming-ink", delta: 3, balance: 8 });
  assert.deepEqual(result.achievements[0].collectible, {
    kind: "charm",
    charmKey: "blooming-ink-sprout",
    label: "Blooming Ink Sprout",
    description: "A first word preserved as a small living sprout.",
    rarity: "uncommon",
    slot: "root",
    effects: { profile_particle: "ink-petals" },
    trophyKey: "first-sprout",
  });
});

test("rejects malformed or client-shaped claim snapshots", () => {
  assert.throws(() => normalizeGameRewardClaim({
    reward_event_id: EVENT_ID,
    session_id: SESSION_ID,
    game_key: "word-garden",
    score: 19,
    favorPreview: 999,
    favor: { delta: 4, balance: 104, cap_remaining: 76 },
    materials: [],
    achievements: [],
    replayed: false,
  }));
});

test("migration exposes two narrow RPCs and no client-authored reward parameters", () => {
  assert.match(MIGRATION, /create or replace function public\.start_game_reward_session\(\s*requested_game_key text\s*\)/i);
  assert.match(MIGRATION, /create or replace function public\.claim_game_reward\(\s*claim_session_id uuid,\s*claim_idempotency_key uuid,\s*claim_evidence jsonb\s*\)/i);
  assert.doesNotMatch(MIGRATION, /claim_(score|favor|materials|achievements)/i);
  assert.match(MIGRATION, /jsonb_object_keys\(claim_evidence\)/i);
});

test("migration keeps every game disabled and revokes direct reward writes", () => {
  assert.match(MIGRATION, /enabled boolean not null default false/i);
  assert.doesNotMatch(MIGRATION, /values\s*\(\s*'word-garden'[\s\S]{0,300}\btrue\b/i);
  for (const table of [
    "game_reward_sessions",
    "game_reward_events",
    "game_reward_cap_buckets",
    "daily_word_puzzles",
  ]) {
    assert.match(MIGRATION, new RegExp(`revoke insert, update, delete on table public\\.${table}`, "i"));
  }
});

test("migration owns Word Garden validation, scoring, caps, and atomic ledgers", () => {
  assert.match(MIGRATION, /from public\.daily_word_puzzles/i);
  assert.match(MIGRATION, /found_words/i);
  assert.match(MIGRATION, /accepted_words/i);
  assert.match(MIGRATION, /score_total/i);
  assert.match(MIGRATION, /favor_cap/i);
  assert.match(MIGRATION, /private\.post_favor_entry/i);
  assert.match(MIGRATION, /insert into public\.material_ledger/i);
  assert.match(MIGRATION, /insert into public\.game_reward_events/i);
  assert.match(MIGRATION, /existing_event\.session_id <> claim_session_id/i);
  assert.match(MIGRATION, /'replayed', true/i);
  assert.match(MIGRATION, /source_reward_event_id_fk[\s\S]*?deferrable initially deferred/i);
});

test("Match and Merge migration owns moves, deterministic spawns, rewards, and replay safety", () => {
  assert.match(MATCH_MERGE_MIGRATION, /create table public\.game_reward_actions/i);
  assert.match(MATCH_MERGE_MIGRATION, /create or replace function public\.progress_game_reward_session\(/i);
  assert.match(MATCH_MERGE_MIGRATION, /progress_action\s*->>\s*'op'\s*<>\s*'merge'/i);
  assert.match(MATCH_MERGE_MIGRATION, /create or replace function private\.game_reward_stable_roll/i);
  assert.match(MATCH_MERGE_MIGRATION, /md5\(seed_value::text/i);
  assert.match(MATCH_MERGE_MIGRATION, /private\.post_favor_entry/i);
  assert.match(MATCH_MERGE_MIGRATION, /'moonwax'/i);
  assert.match(MATCH_MERGE_MIGRATION, /'charm-cord'/i);
  assert.match(MATCH_MERGE_MIGRATION, /'sigil-shards'/i);
  assert.match(MATCH_MERGE_MIGRATION, /existing_action\.action\s*<>\s*progress_action/i);
  assert.match(MATCH_MERGE_MIGRATION, /existing_event\.evidence_hash\s*<>\s*pg_catalog\.md5\(claim_evidence::text\)/i);
  assert.match(MATCH_MERGE_MIGRATION, /daily_claim_cap/i);
  assert.match(MATCH_MERGE_MIGRATION, /reward_claims/i);
  assert.match(MATCH_MERGE_MIGRATION, /game_reward_actions_session_identity_fk/i);
  assert.match(MATCH_MERGE_MIGRATION, /pg_advisory_xact_lock/i);
  assert.doesNotMatch(MATCH_MERGE_MIGRATION, /drop constraint if exists game_reward_sessions_puzzle_date_game_key_fkey/i);
  assert.doesNotMatch(MATCH_MERGE_MIGRATION, /claim_(score|favor|materials|achievements)/i);
  assert.doesNotMatch(MATCH_MERGE_MIGRATION, /values\s*\(\s*'match-merge'[\s\S]{0,300}\btrue\b/i);
});
