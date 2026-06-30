export const DASHBOARD_PREFS_STORAGE_KEY = "foxfam.dashboard.cards.v1";

export const DASHBOARD_CARD_IDS = [
  "quick-stats",
  "launch-quests",
  "founders-cache",
  "progression",
  "upcoming-events",
  "codex",
  "birthdays",
  "community-updates",
  "top-ideas",
  "bug-report",
  "scuffox-thought",
  "boop-fox",
];

export const DASHBOARD_CARD_LABELS = {
  "quick-stats": "Quick Stats",
  "launch-quests": "Daily Shrine Signal",
  "founders-cache": "Founder's Cache",
  progression: "Progression",
  "upcoming-events": "Upcoming Events",
  codex: "Recent Codex",
  birthdays: "Birthdays",
  "community-updates": "Community Updates",
  "top-ideas": "Top Ideas",
  "bug-report": "Bug Report",
  "scuffox-thought": "Scuffox Thoughts",
  "boop-fox": "Resident Fox",
};

export function normalizeDashboardPreferences(value = {}) {
  const orderInput = Array.isArray(value.order) ? value.order : [];
  const hiddenInput = Array.isArray(value.hidden) ? value.hidden : [];
  const order = [
    ...orderInput.filter((id) => DASHBOARD_CARD_IDS.includes(id)),
    ...DASHBOARD_CARD_IDS.filter((id) => !orderInput.includes(id)),
  ];
  return {
    order,
    hidden: hiddenInput.filter((id) => DASHBOARD_CARD_IDS.includes(id)),
  };
}

export function getDashboardPreferencesFromProfile(profile) {
  return normalizeDashboardPreferences(profile?.notification_preferences?.dashboard_cards || {});
}

export function withDashboardPreferences(notificationPreferences = {}, dashboardPreferences = {}) {
  return {
    ...(notificationPreferences || {}),
    dashboard_cards: normalizeDashboardPreferences(dashboardPreferences),
  };
}

export function moveDashboardCard(preferences, cardId, direction) {
  const normalized = normalizeDashboardPreferences(preferences);
  const index = normalized.order.indexOf(cardId);
  if (index < 0) return normalized;
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= normalized.order.length) return normalized;
  const order = [...normalized.order];
  const [item] = order.splice(index, 1);
  order.splice(nextIndex, 0, item);
  return { ...normalized, order };
}

export function setDashboardCardVisibility(preferences, cardId, visible) {
  const normalized = normalizeDashboardPreferences(preferences);
  const hidden = new Set(normalized.hidden);
  if (visible) hidden.delete(cardId);
  else hidden.add(cardId);
  return { ...normalized, hidden: [...hidden] };
}
