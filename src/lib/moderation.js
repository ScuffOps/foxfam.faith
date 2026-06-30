const MAX_HISTORY_ENTRIES = 24;

export function getModerationHistory(item) {
  return Array.isArray(item?.moderation_history) ? item.moderation_history : [];
}

export function appendModerationHistory(item, { status, actorName = "Staff", note = "" } = {}) {
  const history = getModerationHistory(item);
  const nextEntry = {
    status: status || item?.status || "updated",
    actor_name: String(actorName || "Staff").trim() || "Staff",
    note: String(note || "").trim(),
    created_at: new Date().toISOString(),
  };
  return [nextEntry, ...history].slice(0, MAX_HISTORY_ENTRIES);
}

export function formatModerationStatus(status) {
  return String(status || "updated")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getModerationSummary(items = [], closedStatuses = new Set()) {
  return items.reduce(
    (summary, item) => {
      const status = item?.status || "open";
      summary.total += 1;
      if (status === "pending" || status === "pending_review") {
        summary.pending += 1;
      } else if (closedStatuses.has(status)) {
        summary.closed += 1;
      } else {
        summary.active += 1;
      }
      return summary;
    },
    { active: 0, pending: 0, closed: 0, total: 0 },
  );
}
