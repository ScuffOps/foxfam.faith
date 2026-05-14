function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function getEntryTerms(entry) {
  return [
    entry.title,
    entry.subtitle,
    entry.mood,
    stripHtml(entry.body),
    ...(entry.tags || []),
  ].map(normalize);
}

function isPublished(entry) {
  return entry.is_published !== false;
}

export function getReliquaryCategories(entries = []) {
  const categories = new Set();

  entries.filter(isPublished).forEach((entry) => {
    if (entry.mood) categories.add(entry.mood.trim());
    (entry.tags || []).forEach((tag) => {
      if (tag) categories.add(tag.trim());
    });
  });

  return [...categories].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function filterReliquaryEntries(entries = [], filters = {}) {
  const search = normalize(filters.search);
  const category = normalize(filters.category === "all" ? "" : filters.category);
  const sort = filters.sort || "newest";

  const filtered = entries.filter((entry) => {
    if (!isPublished(entry)) return false;

    const terms = getEntryTerms(entry);
    const matchesSearch = !search || terms.some((term) => term.includes(search));
    const matchesCategory = !category || terms.some((term) => term === category);

    return matchesSearch && matchesCategory;
  });

  return filtered.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.created_date || 0) - new Date(b.created_date || 0);
    }
    if (sort === "discussed") {
      return (b.comment_count || 0) - (a.comment_count || 0);
    }
    return new Date(b.created_date || 0) - new Date(a.created_date || 0);
  });
}
