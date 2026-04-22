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

/**
 * Award points to the current user for a specific action.
 * Creates a UserLevel record if one doesn't exist yet.
 */
export async function awardPoints(user, action) {
  if (!user?.email) return;
  const pts = POINT_VALUES[action];
  if (!pts) return;

  const field = {
    post_blessing_comment: "points_from_comments",
    upvote_blessing: "points_from_upvotes",
    upvote_idea: "points_from_upvotes",
    vote_poll: "points_from_polls",
    submit_post: "points_from_posts",
    post_blessing: "points_from_blessings",
  }[action];

  const existing = await base44.entities.UserLevel.filter({ user_email: user.email });

  if (existing.length > 0) {
    const record = existing[0];
    await base44.entities.UserLevel.update(record.id, {
      points: (record.points || 0) + pts,
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
}