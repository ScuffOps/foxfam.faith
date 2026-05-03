import { base44 } from "@/api/base44Client";

// Points awarded per action
export const POINT_VALUES = {
  post_blessing_comment: 3,  // commenting on a blessing
  upvote_blessing: 1,        // upvoting a blessing
  upvote_idea: 1,            // upvoting a community idea/feedback
  vote_poll: 2,              // voting in a poll
  submit_post: 5,            // submitting a community idea/feedback
  post_blessing: 8,          // posting a blessing (mods/admins)
};

export const PROGRESSION_ACTIONS = [
  {
    label: "Share an idea or feedback",
    description: "Start a community post so others can vote on it.",
    href: "/community",
    cta: "New post",
    points: POINT_VALUES.submit_post,
  },
  {
    label: "Upvote an idea",
    description: "Boost feedback you want the mod team to notice.",
    href: "/community",
    cta: "Vote on ideas",
    points: POINT_VALUES.upvote_idea,
  },
  {
    label: "Vote in a poll",
    description: "Help steer what the community does next.",
    href: "/community",
    cta: "Find polls",
    points: POINT_VALUES.vote_poll,
  },
  {
    label: "React to blessings",
    description: "Upvote or comment on a blessing when one speaks to you.",
    href: "/blessings",
    cta: "Visit blessings",
    points: POINT_VALUES.post_blessing_comment,
  },
];

// Rank tiers
export const RANKS = [
  { name: "Wanderer",   min: 0,   color: "text-muted-foreground", bg: "bg-muted",           icon: "🌑" },
  { name: "Initiate",   min: 10,  color: "text-chart-3",          bg: "bg-chart-3/15",       icon: "🌿" },
  { name: "Faithful",   min: 30,  color: "text-chart-2",          bg: "bg-chart-2/15",       icon: "✦" },
  { name: "Devoted",    min: 75,  color: "text-chart-4",          bg: "bg-chart-4/15",       icon: "🔥" },
  { name: "Exalted",    min: 150, color: "text-primary",          bg: "bg-primary/15",       icon: "⚡" },
  { name: "Forsaken",   min: 300, color: "text-chart-5",          bg: "bg-chart-5/15",       icon: "👁️" },
];

export function getRank(points) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.min) rank = r;
  }
  return rank;
}

export function getNextRank(points) {
  for (const r of RANKS) {
    if (points < r.min) return r;
  }
  return null; // max rank
}

export function getRankProgress(points) {
  const safePoints = Math.max(0, Number(points) || 0);
  const rank = getRank(safePoints);
  const next = getNextRank(safePoints);

  if (!next) {
    return {
      rank,
      next,
      percent: 100,
      pointsToNext: 0,
      pointsIntoRank: safePoints - rank.min,
      pointsForRank: 0,
    };
  }

  const pointsForRank = next.min - rank.min;
  const pointsIntoRank = safePoints - rank.min;

  return {
    rank,
    next,
    percent: Math.min(100, Math.round((pointsIntoRank / pointsForRank) * 100)),
    pointsToNext: next.min - safePoints,
    pointsIntoRank,
    pointsForRank,
  };
}

/**
 * Award points to the current user for a specific action.
 * Creates a UserLevel record if one doesn't exist yet.
 * Returns { leveledUp: boolean, newRank: RankObject } so callers can fire a toast.
 */
export async function awardPoints(user, action) {
  if (!user?.email) return { leveledUp: false, newRank: null };
  const pts = POINT_VALUES[action];
  if (!pts) return { leveledUp: false, newRank: null };

  const field = {
    post_blessing_comment: "points_from_comments",
    upvote_blessing: "points_from_upvotes",
    upvote_idea: "points_from_upvotes",
    vote_poll: "points_from_polls",
    submit_post: "points_from_posts",
    post_blessing: "points_from_blessings",
  }[action];

  const existing = await base44.entities.UserLevel.filter({ user_email: user.email });

  let oldPoints = 0;
  if (existing.length > 0) {
    const record = existing[0];
    oldPoints = record.points || 0;
    await base44.entities.UserLevel.update(record.id, {
      points: oldPoints + pts,
      [field]: (record[field] || 0) + pts,
      display_name: user.display_name || user.full_name || record.display_name,
      avatar_url: user.avatar_url || record.avatar_url,
    });
  } else {
    await base44.entities.UserLevel.create({
      user_email: user.email,
      display_name: user.display_name || user.full_name || user.email,
      avatar_url: user.avatar_url || "",
      points: pts,
      [field]: pts,
    });
  }

  const newPoints = oldPoints + pts;
  const oldRank = getRank(oldPoints);
  const newRank = getRank(newPoints);
  const leveledUp = newRank.name !== oldRank.name;

  return { leveledUp, newRank: leveledUp ? newRank : null };
}