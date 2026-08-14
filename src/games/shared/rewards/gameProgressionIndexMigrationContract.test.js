import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260810090000_add_game_progression_fk_indexes.sql",
    import.meta.url,
  ),
  "utf8",
);

const REQUIRED_INDEXES = [
  ["daily_word_puzzles_game_key_idx", "daily_word_puzzles", "game_key"],
  ["game_cast_tickets_fish_key_idx", "game_cast_tickets", "fish_key"],
  ["game_catches_fish_key_idx", "game_catches", "fish_key"],
  ["game_reward_actions_game_key_idx", "game_reward_actions", "game_key"],
  [
    "game_reward_actions_session_identity_idx",
    "game_reward_actions",
    "session_id, user_id, game_key",
  ],
  ["game_reward_cap_buckets_game_key_idx", "game_reward_cap_buckets", "game_key"],
  ["game_reward_events_game_key_idx", "game_reward_events", "game_key"],
  [
    "game_reward_sessions_claimed_event_id_idx",
    "game_reward_sessions",
    "claimed_event_id",
  ],
  ["game_reward_sessions_game_key_idx", "game_reward_sessions", "game_key"],
  [
    "game_reward_sessions_puzzle_date_game_key_idx",
    "game_reward_sessions",
    "puzzle_date, game_key",
  ],
  ["user_achievements_achievement_key_idx", "user_achievements", "achievement_key"],
  ["user_achievements_source_catch_id_idx", "user_achievements", "source_catch_id"],
  [
    "user_achievements_source_reward_event_id_idx",
    "user_achievements",
    "source_reward_event_id",
  ],
  ["user_fishpedia_fish_key_idx", "user_fishpedia", "fish_key"],
  [
    "user_trophies_source_achievement_key_idx",
    "user_trophies",
    "source_achievement_key",
  ],
];

test("game progression foreign keys have stable covering indexes", () => {
  for (const [indexName, tableName, columns] of REQUIRED_INDEXES) {
    const normalizedColumns = columns.replaceAll(",", "\\s*,\\s*");
    assert.match(
      migration,
      new RegExp(
        `create index if not exists ${indexName}\\s+on public\\.${tableName} \\(${normalizedColumns}\\)`,
        "i",
      ),
    );
  }
});

test("index-only migration does not change grants, policies, or reward functions", () => {
  assert.doesNotMatch(migration, /\b(grant|revoke|policy|function|trigger)\b/i);
});
