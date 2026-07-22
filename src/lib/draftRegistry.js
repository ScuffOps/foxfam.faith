const DRAFT_PREFIX = "foxfam.draft.";

export const DRAFT_DEFINITIONS = [
  { suffix: "community-post.new.v1", label: "Community post", description: "An idea, update, feedback post, or poll.", action: "post", route: "/community", fields: ["title", "description"] },
  { suffix: "community-poll-options.new.v1", label: "Poll options", description: "Options attached to a saved community poll.", action: "post", route: "/community", companion: true, fields: ["options"] },
  { suffix: "forum-thread.new.v1", label: "Forum thread", description: "A discussion waiting to be started.", action: "forum", route: "/forum", fields: ["title", "body", "tags"] },
  { suffix: "suggestion.new.v1", label: "Suggestion", description: "Feedback or an idea for the portal.", action: "suggestion", route: "/suggestions", fields: ["title", "description"] },
  { suffix: "bug-report.new.v1", label: "Bug report", description: "A report with reproduction details.", action: "bug", route: "/bugs", fields: ["title", "description", "attempted_action", "expected_behavior", "steps_to_reproduce", "notes"] },
  { suffix: "offering.new.v1", label: "Offering", description: "Art, music, writing, or another creation for Veri.", action: "offering", route: "/offerings", fields: ["title", "description", "externalUrl"] },
  { suffix: "reliquary.new.v1", label: "Reliquary post", description: "A poem, story, memory, or shrine entry.", action: "reliquary", route: "/reliquary", fields: ["title", "subtitle", "mood", "tags", "body", "image_url"] },
  { suffix: "blessing.new.v1", label: "Blessing", description: "A community blessing in progress.", action: "blessing", route: "/blessings", fields: ["title", "content", "link_url"] },
  { suffix: "birthday-submit.new.v1", label: "Birthday", description: "An unfinished birthday entry.", route: "/birthdays", fields: ["display_name", "birthday_date", "note"] },
  { suffix: "collab-request.new.v1", label: "Collab request", description: "A collab or one-on-one request.", route: "/collabs", fields: ["game_category", "preferred_time", "description", "extra_info"] },
  { suffix: "event.new.v1", label: "Calendar event", description: "A staff event that has not been saved.", action: "event", route: "/events", staffOnly: true, fields: ["title", "description", "start_date", "end_date", "location"] },
];

function hasMeaningfulValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (value && typeof value === "object") return Object.values(value).some(hasMeaningfulValue);
  return false;
}

export function listSavedDrafts() {
  if (typeof window === "undefined") return [];
  return DRAFT_DEFINITIONS.flatMap((definition) => {
    const key = `${DRAFT_PREFIX}${definition.suffix}`;
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || "null");
      if (!value || !definition.fields.some((field) => hasMeaningfulValue(value[field]))) return [];
      return [{ ...definition, key, value }];
    } catch {
      return [];
    }
  }).filter((draft, index, drafts) => {
    if (!draft.companion) return true;
    return !drafts.some((candidate) => candidate.action === draft.action && !candidate.companion);
  });
}

export function discardSavedDraft(key) {
  window.localStorage.removeItem(key);
}
