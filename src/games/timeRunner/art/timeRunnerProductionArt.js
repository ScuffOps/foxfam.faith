import { getApprovedGameArtFamily } from "../../shared/art/gameArtManifest.js";

export const TIME_RUNNER_PRODUCTION_ART_SLOT_IDS = Object.freeze([
  "time-runner.runner",
  "time-runner.shards",
  "time-runner.actions",
]);

export const TIME_RUNNER_RUNNER_ATLAS = Object.freeze({
  columns: 4,
  rows: 1,
  frames: Object.freeze({
    run: 0,
    jump: 1,
    focus: 2,
    fall: 3,
  }),
});

export const TIME_RUNNER_SHARD_ATLAS = Object.freeze({
  columns: 2,
  rows: 2,
  frames: Object.freeze({
    clockShard: 0,
    clockBrass: 1,
  }),
});

export const TIME_RUNNER_ACTION_ATLAS = Object.freeze({
  columns: 2,
  rows: 2,
  cells: Object.freeze({
    jump: Object.freeze({ column: 0, row: 0 }),
    duck: Object.freeze({ column: 1, row: 0 }),
    focus: Object.freeze({ column: 0, row: 1 }),
    landing: Object.freeze({ column: 1, row: 1 }),
  }),
});

export function getApprovedTimeRunnerProductionArt(
  resolveFamily = getApprovedGameArtFamily,
) {
  const family = resolveFamily(TIME_RUNNER_PRODUCTION_ART_SLOT_IDS);
  const runner = family?.["time-runner.runner"];
  const shards = family?.["time-runner.shards"];
  const actions = family?.["time-runner.actions"];

  if (![runner, shards, actions].every(isResolvedAsset)) return null;

  return Object.freeze({ runner, shards, actions });
}

export function getTimeRunnerRunnerFrame(state) {
  if (state?.finishReason === "clock-fractured") {
    return TIME_RUNNER_RUNNER_ATLAS.frames.fall;
  }

  return TIME_RUNNER_RUNNER_ATLAS.frames[state?.posture]
    ?? TIME_RUNNER_RUNNER_ATLAS.frames.run;
}

export function getTimeRunnerActionAtlasTransform(action) {
  const cell = TIME_RUNNER_ACTION_ATLAS.cells[action]
    || TIME_RUNNER_ACTION_ATLAS.cells.landing;

  return `translate(${-cell.column * (100 / TIME_RUNNER_ACTION_ATLAS.columns)}%, ${-cell.row * (100 / TIME_RUNNER_ACTION_ATLAS.rows)}%)`;
}

export function getTimeRunnerShardAtlasTransform(kind) {
  const frame = TIME_RUNNER_SHARD_ATLAS.frames[kind]
    ?? TIME_RUNNER_SHARD_ATLAS.frames.clockShard;
  const column = frame % TIME_RUNNER_SHARD_ATLAS.columns;
  const row = Math.floor(frame / TIME_RUNNER_SHARD_ATLAS.columns);

  return `translate(${-column * (100 / TIME_RUNNER_SHARD_ATLAS.columns)}%, ${-row * (100 / TIME_RUNNER_SHARD_ATLAS.rows)}%)`;
}

function isResolvedAsset(assetPath) {
  return typeof assetPath === "string" && assetPath.trim().length > 0;
}
