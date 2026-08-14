function getNeighborIndexes(index, gridSize) {
  const row = Math.floor(index / gridSize);
  const column = index % gridSize;
  const neighbors = [];

  if (row > 0) neighbors.push(index - gridSize);
  if (row < gridSize - 1) neighbors.push(index + gridSize);
  if (column > 0) neighbors.push(index - 1);
  if (column < gridSize - 1) neighbors.push(index + 1);

  return neighbors;
}

function getMatchingNeighbors(grid, index, gridSize) {
  const tile = grid[index];
  if (!tile) return [];

  return getNeighborIndexes(index, gridSize).filter((neighborIndex) => (
    grid[neighborIndex]?.tier === tile.tier
  ));
}

export function getMatchMergeGuidance(grid = [], selectedIndex = null, gridSize = 4) {
  if (Number.isInteger(selectedIndex) && grid[selectedIndex]) {
    const matchingNeighbors = getMatchingNeighbors(grid, selectedIndex, gridSize);
    if (matchingNeighbors.length > 0) {
      return {
        state: "target",
        sourceIndex: selectedIndex,
        targetIndexes: matchingNeighbors,
        eyebrow: "Offering selected",
        title: `Choose a neighboring ${grid[selectedIndex].label}`,
        detail: "Select a highlighted twin to complete the merge.",
      };
    }
  }

  for (let index = 0; index < grid.length; index += 1) {
    const matchingNeighbors = getMatchingNeighbors(grid, index, gridSize);
    const targetIndex = matchingNeighbors.find((neighborIndex) => neighborIndex > index);
    if (targetIndex !== undefined) {
      return {
        state: "source",
        sourceIndex: index,
        targetIndexes: [targetIndex],
        eyebrow: "Next move",
        title: `Pair the highlighted ${grid[index].label}s`,
        detail: "Select either offering, then its highlighted neighbor.",
      };
    }
  }

  return {
    state: "locked",
    sourceIndex: null,
    targetIndexes: [],
    eyebrow: "Bench complete",
    title: "No neighboring twins remain",
    detail: "Claim this run or reset the practice bench.",
  };
}
