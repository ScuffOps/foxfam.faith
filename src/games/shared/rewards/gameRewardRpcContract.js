import { z } from "zod";

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const safeIntegerSchema = z.number().int().safe().nonnegative();
const keySchema = z.string().regex(/^[a-z0-9-]+$/);

export const wordGardenEvidenceSchema = z.object({
  found_words: z.array(
    z.string().regex(/^[A-Z]{4,32}$/),
  ).min(1).max(100).refine((words) => new Set(words).size === words.length, {
    message: "Word Garden evidence cannot contain duplicate words.",
  }),
}).strict();

export const wordGardenActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("submit"), word: z.string().regex(/^[A-Z]{4,32}$/) }).strict(),
  z.object({ op: z.literal("rest") }).strict(),
]);

export const matchMergeEvidenceSchema = z.object({}).strict();
export const bobaCafeEvidenceSchema = z.object({}).strict();
export const findVezmirEvidenceSchema = z.object({}).strict();
export const timeRunnerEvidenceSchema = z.object({}).strict();

export const matchMergeActionSchema = z.object({
  op: z.literal("merge"),
  from: z.number().int().min(0).max(15),
  to: z.number().int().min(0).max(15),
}).strict().refine(({ from, to }) => from !== to, {
  message: "Match and Merge cells must be different.",
});

const bobaStationSchema = z.enum(["tea", "milk", "topping", "charm", "sweetness"]);
const bobaChoiceSchema = z.string().regex(/^[a-z0-9-]+$/).max(40);

export const bobaCafeActionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("select"),
    station: bobaStationSchema,
    choice: bobaChoiceSchema,
  }).strict(),
  z.object({ op: z.literal("clear") }).strict(),
  z.object({ op: z.literal("serve") }).strict(),
  z.object({ op: z.literal("next") }).strict(),
  z.object({ op: z.literal("settle") }).strict(),
]);

const findVezmirLayerSchema = z.enum(["foreground", "room", "background"]);
export const findVezmirActionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("search"),
    x: z.number().int().min(0).max(1000),
    y: z.number().int().min(0).max(1000),
    layer: findVezmirLayerSchema,
  }).strict(),
  z.object({ op: z.literal("hint") }).strict(),
]);

const timeRunnerHazardIdSchema = z.string().regex(/^time-[0-9]{1,2}$/);
const timeRunnerLandingIdSchema = z.string().regex(/^landing-[0-9]{1,3}-[01]$/);
export const timeRunnerActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("jump"), hazard_id: timeRunnerHazardIdSchema }).strict(),
  z.object({ op: z.literal("duck"), hazard_id: timeRunnerHazardIdSchema }).strict(),
  z.object({ op: z.literal("land"), landing_id: timeRunnerLandingIdSchema }).strict(),
  z.object({ op: z.literal("focus") }).strict(),
  z.object({ op: z.literal("sync") }).strict(),
]);

const puzzleSchema = z.object({
  date: z.string().date(),
  key: keySchema,
  title: z.string().min(1).max(80),
  letters: z.string().regex(/^[A-Z]{7}$/).refine((letters) => new Set(letters).size === 7),
  center: z.string().regex(/^[A-Z]$/),
}).strict().refine((puzzle) => puzzle.letters.includes(puzzle.center), {
  message: "Puzzle center must belong to its letter set.",
});

const sessionBase = {
  session_id: uuidSchema,
  rules_version: safeIntegerSchema.positive(),
  seed: uuidSchema,
  started_at: timestampSchema,
  expires_at: timestampSchema,
};

const matchMergeStateSchema = z.object({
  grid: z.array(z.number().int().min(0).max(5)).length(16),
  score: safeIntegerSchema,
  moves: safeIntegerSchema,
  highest_tier: z.number().int().min(1).max(5),
  merge_streak: safeIntegerSchema,
  best_chain: safeIntegerSchema,
  last_merge_at: timestampSchema.nullable(),
  action_index: safeIntegerSchema,
}).strict();

const bobaTraySchema = z.object({
  tea: keySchema.nullable(),
  milk: keySchema.nullable(),
  topping: keySchema.nullable(),
  charm: keySchema.nullable(),
  sweetness: keySchema.nullable(),
}).strict();

const bobaRecipeSchema = z.object({
  tea: keySchema,
  milk: keySchema,
  topping: keySchema,
  charm: keySchema,
  sweetness: keySchema,
}).strict();

const bobaCustomerSchema = z.object({
  key: keySchema,
  label: z.string().min(1).max(80),
  palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).length(2),
}).strict();

const bobaActiveOrderSchema = z.object({
  order_key: keySchema,
  order_label: z.string().min(1).max(80),
  customer: bobaCustomerSchema,
  recipe: bobaRecipeSchema,
  placed_at: timestampSchema,
  deadline_at: timestampSchema,
  patience_ms: z.number().int().min(18000).max(32000),
}).strict();

const bobaResultSchema = z.object({
  score: safeIntegerSchema,
  matches: z.array(bobaStationSchema).max(5),
  misses: z.array(bobaStationSchema).max(5),
  perfect: z.boolean(),
  timed_out: z.boolean(),
  patience_percent: z.number().int().min(0).max(100),
  message: z.string().min(1).max(160),
}).strict();

const bobaCafeStateSchema = z.object({
  phase: z.enum(["serving", "result", "shiftComplete"]),
  order_index: z.number().int().min(0).max(8),
  active_order: bobaActiveOrderSchema.nullable(),
  tray: bobaTraySchema,
  score: safeIntegerSchema,
  served_count: z.number().int().min(0).max(8),
  perfect_count: z.number().int().min(0).max(8),
  combo: z.number().int().min(0).max(8),
  best_combo: z.number().int().min(0).max(8),
  mistakes: z.number().int().min(0).max(8),
  last_result: bobaResultSchema.nullable(),
  action_index: z.number().int().min(0).max(96),
  completed_at: timestampSchema.nullable(),
}).strict();

const findVezmirTargetSchema = z.object({
  key: keySchema,
  role: z.enum(["clue", "final"]),
  layer: findVezmirLayerSchema,
  x: z.number().int().min(0).max(1000),
  y: z.number().int().min(0).max(1000),
  radius: z.number().int().positive().max(200),
}).strict();

const findVezmirStateSchema = z.object({
  phase: z.enum(["seeking", "vezmir-ready", "complete"]),
  targets: z.array(findVezmirTargetSchema).length(6),
  found_keys: z.array(keySchema).max(6).refine((keys) => new Set(keys).size === keys.length),
  active_hint_key: keySchema.nullable(),
  focus: z.number().int().min(0).max(5),
  misses: safeIntegerSchema,
  hints_used: safeIntegerSchema,
  score: safeIntegerSchema,
  elapsed_ms: safeIntegerSchema,
  started_at: timestampSchema,
  action_index: z.number().int().min(0).max(64),
  completed_at: timestampSchema.nullable(),
}).strict();

const timeRunnerHazardSchema = z.object({
  id: timeRunnerHazardIdSchema,
  at_ms: z.number().int().min(0).max(45000),
  kind: z.enum(["hand-sweep", "roman-gate", "clock-shard"]),
  required_op: z.enum(["jump", "duck"]).nullable(),
  resolved: z.boolean(),
  outcome: z.string().nullable(),
}).strict();

const timeRunnerLandingSchema = z.object({
  id: timeRunnerLandingIdSchema,
  kind: z.enum(["minute-hand", "roman-dial", "pendulum-step", "hour-hand"]),
  label: z.string().min(1).max(80),
  branch: z.number().int().min(0).max(1),
}).strict();

const timeRunnerStateSchema = z.object({
  phase: z.enum(["running", "complete", "failed"]),
  layout: z.array(timeRunnerHazardSchema).length(24),
  elapsed_ms: z.number().int().min(0).max(45000),
  falls: z.number().int().min(0).max(24),
  clock_shards: z.number().int().min(0).max(24),
  cleared_hazards: z.number().int().min(0).max(24),
  focus: z.number().int().min(0).max(100),
  focus_started_ms: z.number().int().min(0).max(45000),
  focus_until_ms: z.number().int().min(0).max(45420),
  combo: z.number().int().min(0).max(128),
  best_combo: z.number().int().min(0).max(128),
  route_step: z.number().int().min(0).max(128),
  available_landings: z.array(timeRunnerLandingSchema).length(2),
  score: safeIntegerSchema,
  started_at: timestampSchema,
  completed_at: timestampSchema.nullable(),
  action_index: z.number().int().min(0).max(128),
}).strict();

const wordGardenSessionSchema = z.object({
  ...sessionBase,
  game_key: z.literal("word-garden"),
  display_name: z.literal("Blooming Ink").optional(),
  puzzle: puzzleSchema,
  context: z.object({
    display_name: z.literal("Blooming Ink"),
    puzzle_key: keySchema,
    phase: z.enum(["playing", "complete"]),
    found_words: z.array(z.string().regex(/^[A-Z]{4,32}$/)).max(100),
    score: safeIntegerSchema,
    full_bloom_count: safeIntegerSchema,
    action_index: z.number().int().min(0).max(101),
    completed_at: timestampSchema.nullable(),
  }).strict().optional(),
}).strict();

const matchMergeSessionSchema = z.object({
  ...sessionBase,
  game_key: z.literal("match-merge"),
  context: matchMergeStateSchema,
}).strict();

const bobaCafeSessionSchema = z.object({
  ...sessionBase,
  game_key: z.literal("boba-cafe"),
  context: bobaCafeStateSchema,
}).strict();

const findVezmirSessionSchema = z.object({
  ...sessionBase,
  game_key: z.literal("puzzle-cat"),
  context: findVezmirStateSchema,
}).strict();

const timeRunnerSessionSchema = z.object({
  ...sessionBase,
  game_key: z.literal("time-runner"),
  context: timeRunnerStateSchema,
}).strict();

const sessionSchema = z.discriminatedUnion("game_key", [
  wordGardenSessionSchema,
  matchMergeSessionSchema,
  bobaCafeSessionSchema,
  findVezmirSessionSchema,
  timeRunnerSessionSchema,
]);

const progressSchema = z.discriminatedUnion("game_key", [
  z.object({
    session_id: uuidSchema,
    game_key: z.literal("word-garden"),
    action_index: safeIntegerSchema.positive(),
    state: z.object({
      display_name: z.literal("Blooming Ink"),
      puzzle_key: keySchema,
      phase: z.enum(["playing", "complete"]),
      found_words: z.array(z.string().regex(/^[A-Z]{4,32}$/)).max(100),
      score: safeIntegerSchema,
      full_bloom_count: safeIntegerSchema,
      action_index: z.number().int().min(0).max(101),
      completed_at: timestampSchema.nullable(),
    }).strict(),
    replayed: z.boolean(),
  }).strict(),
  z.object({
    session_id: uuidSchema,
    game_key: z.literal("match-merge"),
    action_index: safeIntegerSchema.positive(),
    state: matchMergeStateSchema,
    replayed: z.boolean(),
  }).strict(),
  z.object({
    session_id: uuidSchema,
    game_key: z.literal("boba-cafe"),
    action_index: safeIntegerSchema.positive(),
    state: bobaCafeStateSchema,
    replayed: z.boolean(),
  }).strict(),
  z.object({
    session_id: uuidSchema,
    game_key: z.literal("puzzle-cat"),
    action_index: safeIntegerSchema.positive(),
    state: findVezmirStateSchema,
    replayed: z.boolean(),
  }).strict(),
  z.object({
    session_id: uuidSchema,
    game_key: z.literal("time-runner"),
    action_index: safeIntegerSchema.positive(),
    state: timeRunnerStateSchema,
    replayed: z.boolean(),
  }).strict(),
]);

const favorSchema = z.object({
  delta: safeIntegerSchema,
  balance: safeIntegerSchema,
  cap_remaining: safeIntegerSchema,
}).strict();

const materialSchema = z.object({
  key: keySchema,
  delta: safeIntegerSchema.positive(),
  balance: safeIntegerSchema,
}).strict();

const achievementSchema = z.object({
  key: keySchema,
  title: z.string().min(1).max(100),
}).strict();

const claimSchema = z.object({
  reward_event_id: uuidSchema,
  session_id: uuidSchema,
  game_key: keySchema,
  score: safeIntegerSchema,
  favor: favorSchema,
  materials: z.array(materialSchema).max(20),
  achievements: z.array(achievementSchema).max(20),
  replayed: z.boolean(),
}).strict();

export function normalizeGameRewardSession(value) {
  const parsed = sessionSchema.parse(value);
  const normalized = {
    sessionId: parsed.session_id,
    gameKey: parsed.game_key,
    rulesVersion: parsed.rules_version,
    seed: parsed.seed,
    startedAt: parsed.started_at,
    expiresAt: parsed.expires_at,
  };
  if (parsed.game_key === "word-garden") return { ...normalized, puzzle: parsed.puzzle, context: parsed.context };
  return { ...normalized, context: parsed.context };
}

export function normalizeGameRewardProgress(value) {
  const parsed = progressSchema.parse(value);
  return {
    sessionId: parsed.session_id,
    gameKey: parsed.game_key,
    actionIndex: parsed.action_index,
    state: parsed.state,
    replayed: parsed.replayed,
  };
}

export function normalizeGameRewardClaim(value) {
  const parsed = claimSchema.parse(value);
  return {
    rewardEventId: parsed.reward_event_id,
    sessionId: parsed.session_id,
    gameKey: parsed.game_key,
    score: parsed.score,
    favor: parsed.favor,
    materials: parsed.materials,
    achievements: parsed.achievements,
    replayed: parsed.replayed,
  };
}

export function normalizeWordGardenEvidence(value) {
  return wordGardenEvidenceSchema.parse(value);
}

export function normalizeGameRewardEvidence(value) {
  return z.union([wordGardenEvidenceSchema, matchMergeEvidenceSchema, bobaCafeEvidenceSchema, findVezmirEvidenceSchema, timeRunnerEvidenceSchema]).parse(value);
}

export function normalizeMatchMergeAction(value) {
  return matchMergeActionSchema.parse(value);
}

export function normalizeGameRewardAction(value) {
  return z.union([wordGardenActionSchema, matchMergeActionSchema, bobaCafeActionSchema, findVezmirActionSchema, timeRunnerActionSchema]).parse(value);
}

export function normalizeBobaCafeAction(value) {
  return bobaCafeActionSchema.parse(value);
}

export function normalizeFindVezmirAction(value) {
  return findVezmirActionSchema.parse(value);
}

export function normalizeTimeRunnerAction(value) {
  return timeRunnerActionSchema.parse(value);
}

export function normalizeWordGardenAction(value) {
  return wordGardenActionSchema.parse(value);
}
