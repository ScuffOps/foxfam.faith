const HIDDEN_FEATURE_POST_TITLES = new Set(["relic forge"]);

function normalizeFeatureTitle(title = "") {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isPubliclyHiddenFeaturePost(post) {
  return HIDDEN_FEATURE_POST_TITLES.has(normalizeFeatureTitle(post?.title));
}
