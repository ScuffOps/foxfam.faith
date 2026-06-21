const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getDateMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getPollVoteTotal(post = {}) {
  return (post.poll_options || []).reduce((sum, option) => sum + Number(option?.votes || 0), 0);
}

export function getCommunityEngagement(post = {}) {
  if (post.type === "poll") return getPollVoteTotal(post);
  return Number(post.upvotes || 0);
}

export function sortCommunityPosts(posts = [], sort = "top", now = Date.now()) {
  return [...posts].sort((a, b) => {
    if (sort === "new") return getDateMs(b.created_date) - getDateMs(a.created_date);

    const score = (post) => {
      const engagement = getCommunityEngagement(post);
      if (sort !== "trending") return engagement;
      const isRecent = getDateMs(post.created_date) > now - WEEK_MS;
      return engagement + (isRecent ? 10 : 0);
    };

    return score(b) - score(a) || getDateMs(b.created_date) - getDateMs(a.created_date);
  });
}
