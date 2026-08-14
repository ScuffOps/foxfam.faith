export const WORD_GARDEN_BLOOM_STAGE = Object.freeze({
  sprout: 0,
  bloom: 1,
  fullBloom: 2,
  bloomingInk: 3,
});

export function resolveWordGardenBloomStage(state) {
  if (state?.status === "complete") return WORD_GARDEN_BLOOM_STAGE.bloomingInk;

  const foundWords = Array.isArray(state?.foundWords) ? state.foundWords : [];
  if (foundWords.some((word) => word?.isFullBloom)) return WORD_GARDEN_BLOOM_STAGE.fullBloom;
  if (foundWords.length > 0) return WORD_GARDEN_BLOOM_STAGE.bloom;
  return WORD_GARDEN_BLOOM_STAGE.sprout;
}
