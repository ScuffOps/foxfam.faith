import { createUserNotification } from "@/lib/notifications";
import { getPrivateUserKey } from "@/lib/communityActor";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { favorService, getFavorAwardOutcome } from "@/lib/favorService";

export const FAVORED_DEFAULT_TITLE = "ҒᎪᏙᏫᎡᎬᎠ";
export const FAVORED_BADGE = {
  id: "soul_lantern",
  label: "Soul Lantern",
  icon: "🕯",
  color: "text-[#bdebf1]",
  bg: "bg-[#1f42ad]/20",
  ring: "ring-[#5c5f82]/40",
};

export const PROGRESSION_ACTIONS = [
  {
    label: "Share an idea or feedback",
    description: "Start a community post so others can vote on it.",
    href: "/community",
    cta: "New post",
    points: 5,
  },
  {
    label: "Give Praise to an idea",
    description: "Send praise to feedback you want the mod team to notice.",
    href: "/community",
    cta: "Vote on ideas",
    points: 1,
  },
  {
    label: "Vote in a poll",
    description: "Help steer what the community does next.",
    href: "/community",
    cta: "Find polls",
    points: 2,
  },
  {
    label: "Give Praise to blessings",
    description: "Give Praise or comment on a blessing when one speaks to you.",
    href: "/blessings",
    cta: "Visit blessings",
    points: 3,
  },
];

// Rank tiers
export const RANKS = [
  { name: "Forsaken",      min: 0,   color: "text-muted-foreground", bg: "bg-muted",        icon: "\u{1F72C}" },
  { name: "Seeker",        min: 10,  color: "text-chart-3",          bg: "bg-chart-3/15",   icon: "\u{1F753}" },
  { name: "Faithful",      min: 30,  color: "text-chart-2",          bg: "bg-chart-2/15",   icon: "\u{1F71A}" },
  { name: "Purified",      min: 75,  color: "text-chart-4",          bg: "bg-chart-4/15",   icon: "\u{1F763}" },
  { name: "Timescorned",   min: 150, color: "text-primary",          bg: "bg-primary/15",   icon: "\u{1F738}" },
  { name: "Forblessed",    min: 300, color: "text-chart-5",          bg: "bg-chart-5/15",   icon: "\u2BD5" },
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
 * Award Favor for a server-owned action and source row.
 * Returns { leveledUp: boolean, newRank: RankObject } so callers can fire a toast.
 */
export async function awardPoints(user, actionKey, sourceId, optionKey = null) {
  const result = await favorService.performAction(actionKey, sourceId, optionKey);
  const outcome = getFavorAwardOutcome(result);
  const newRank = outcome.leveledUp ? getRank(outcome.balance) : null;
  const userKey = getPrivateUserKey(user);

  if (outcome.shouldNotify && user?.id && userKey) {
    void createUserNotification({
      recipientUserId: user.id,
      actorKey: userKey,
      actorName: getPublicDisplayName(user, "You"),
      type: "favor_gain",
      title: `+${outcome.delta} Favor`,
      message: outcome.leveledUp ? `You reached ${newRank.name}.` : "Favor added to your progress.",
      favorPoints: outcome.delta,
      sourceType: actionKey,
      sourceId,
    });
  }

  return { leveledUp: outcome.leveledUp, newRank };
}
