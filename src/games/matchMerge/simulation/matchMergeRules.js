import { buildRewardIntent, DUPLICATE_POLICIES } from "../../../lib/gameRewards.js";
import { getTileDefinition, MAX_MATCH_MERGE_TIER } from "../content/tileCatalog.js";

export const MATCH_MERGE_STORAGE_KEY = "foxfam_match_merge_state_v1";
export const MATCH_MERGE_REWARD_LOG_KEY = "foxfam_match_merge_reward_log_v1";
export const MATCH_MERGE_GRID_SIZE = 4;
export const MATCH_MERGE_CELL_COUNT = MATCH_MERGE_GRID_SIZE * MATCH_MERGE_GRID_SIZE;

export function createMatchMergeTile(tier = 1, id = createTileId(tier)) {
  const definition = getTileDefinition(tier);
  return {
    id,
    tier: definition.tier,
    key: definition.key,
    label: definition.label,
    materialKey: definition.materialKey,
    materialLabel: definition.materialLabel,
    scoreValue: definition.scoreValue,
  };
}

export function createInitialMatchMergeState({ grid = null, now = Date.now() } = {}) {
  const initialGrid = grid || createSeedGrid();
  return {
    grid: initialGrid,
    selectedIndex: null,
    score: 0,
    claimedScore: 0,
    moves: 0,
    highestTier: getHighestTier(initialGrid),
    mergeStreak: 0,
    lastMergeAt: 0,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

export function selectMatchMergeCell(state, index, now = Date.now(), randomValue = Math.random()) {
  if (!Number.isInteger(index) || index < 0 || index >= MATCH_MERGE_CELL_COUNT) return state;
  const tile = state.grid[index];
  if (!tile) return { ...state, selectedIndex: null };

  if (state.selectedIndex === null || state.selectedIndex === index) {
    return {
      ...state,
      selectedIndex: state.selectedIndex === index ? null : index,
    };
  }

  const selectedTile = state.grid[state.selectedIndex];
  if (!selectedTile || !canMergeCells(state.selectedIndex, index, selectedTile, tile)) {
    return {
      ...state,
      selectedIndex: index,
    };
  }

  const nextTier = Math.min(tile.tier + 1, MAX_MATCH_MERGE_TIER);
  const mergedTile = createMatchMergeTile(nextTier);
  const nextGrid = [...state.grid];
  nextGrid[state.selectedIndex] = null;
  nextGrid[index] = mergedTile;
  const gridWithSpawn = spawnMatchMergeTile(nextGrid, randomValue);
  const fastChain = state.lastMergeAt > 0 && now - state.lastMergeAt <= 6000;

  return {
    ...state,
    grid: gridWithSpawn,
    selectedIndex: null,
    score: state.score + mergedTile.scoreValue,
    moves: state.moves + 1,
    highestTier: Math.max(state.highestTier || 1, mergedTile.tier),
    mergeStreak: fastChain ? state.mergeStreak + 1 : 1,
    lastMergeAt: now,
    updatedAt: new Date(now).toISOString(),
  };
}

export function buildMatchMergeRewardIntent({ state, durationMs = 0 }) {
  const unclaimedScore = Math.max(0, (state?.score || 0) - (state?.claimedScore || 0));
  if (unclaimedScore <= 0) return null;

  const items = [
    {
      key: "moonwax",
      label: "Moonwax",
      quantity: Math.max(1, Math.floor(unclaimedScore / 60)),
      type: "material",
    },
  ];

  if ((state?.highestTier || 1) >= 3) {
    items.push({
      key: "charm-cord",
      label: "Charm Cord",
      quantity: Math.max(1, Math.floor(unclaimedScore / 180)),
      type: "material",
    });
  }

  if ((state?.highestTier || 1) >= 4) {
    items.push({
      key: "sigil-shards",
      label: "Sigil Shards",
      quantity: Math.max(1, Math.floor(unclaimedScore / 320)),
      type: "material",
    });
  }

  const achievementKeys = [];
  if ((state?.moves || 0) > 0) achievementKeys.push("first-merge");
  if ((state?.mergeStreak || 0) >= 4) achievementKeys.push("quiet-chain");
  if ((state?.highestTier || 1) >= 4) achievementKeys.push("sigil-shaper");

  return buildRewardIntent({
    gameKey: "match-merge",
    eventType: "forge-material-claim",
    score: unclaimedScore,
    durationMs,
    favorPreview: Math.floor(unclaimedScore / 120),
    items,
    achievementKeys,
    duplicatePolicy: DUPLICATE_POLICIES.none,
  });
}

export function markMatchMergeClaimed(state, now = Date.now()) {
  return {
    ...state,
    claimedScore: state.score,
    updatedAt: new Date(now).toISOString(),
  };
}

export function hasAvailableMerge(grid = []) {
  return grid.some((tile, index) => {
    if (!tile || tile.tier >= MAX_MATCH_MERGE_TIER) return false;
    return getNeighborIndexes(index).some((neighborIndex) => {
      const neighbor = grid[neighborIndex];
      return Boolean(neighbor && neighbor.tier === tile.tier);
    });
  });
}

export function isMatchMergeBoardLocked(grid = []) {
  return grid.every(Boolean) && !hasAvailableMerge(grid);
}

export function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createSeedGrid() {
  const grid = Array.from({ length: MATCH_MERGE_CELL_COUNT }, () => null);
  const seedTiers = [1, 1, 1, 1, 2, 2, 1, 2];
  seedTiers.forEach((tier, index) => {
    grid[index] = createMatchMergeTile(tier, `seed-${index}`);
  });
  return grid;
}

function spawnMatchMergeTile(grid, randomValue = Math.random()) {
  const emptyIndexes = grid
    .map((tile, index) => (tile ? null : index))
    .filter((index) => index !== null);
  if (emptyIndexes.length === 0) return grid;

  const nextGrid = [...grid];
  const spawnIndex = emptyIndexes[Math.min(emptyIndexes.length - 1, Math.floor(randomValue * emptyIndexes.length))];
  const tier = randomValue > 0.82 ? 2 : 1;
  nextGrid[spawnIndex] = createMatchMergeTile(tier);
  return nextGrid;
}

function canMergeCells(firstIndex, secondIndex, firstTile, secondTile) {
  if (firstTile.tier !== secondTile.tier) return false;
  if (firstTile.tier >= MAX_MATCH_MERGE_TIER) return false;
  return getNeighborIndexes(firstIndex).includes(secondIndex);
}

function getNeighborIndexes(index) {
  const row = Math.floor(index / MATCH_MERGE_GRID_SIZE);
  const column = index % MATCH_MERGE_GRID_SIZE;
  const neighbors = [];
  if (row > 0) neighbors.push(index - MATCH_MERGE_GRID_SIZE);
  if (row < MATCH_MERGE_GRID_SIZE - 1) neighbors.push(index + MATCH_MERGE_GRID_SIZE);
  if (column > 0) neighbors.push(index - 1);
  if (column < MATCH_MERGE_GRID_SIZE - 1) neighbors.push(index + 1);
  return neighbors;
}

function getHighestTier(grid = []) {
  return grid.reduce((highest, tile) => Math.max(highest, tile?.tier || 1), 1);
}

function createTileId(tier) {
  return `merge-${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
