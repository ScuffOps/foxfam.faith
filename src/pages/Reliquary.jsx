import { useEffect, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { BookOpenText, Clock, Feather, Filter, MessageCircle, Plus, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReliquaryEntryCard from "@/components/reliquary/ReliquaryEntryCard";
import ReliquaryForm from "@/components/reliquary/ReliquaryForm";
import ParticleOverlay from "@/components/ParticleOverlay";
import { canModerate } from "@/lib/roles";
import { filterReliquaryEntries, getReliquaryCategories } from "@/lib/reliquaryFilters";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "discussed", label: "Most discussed" },
];

export default function Reliquary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await communityClient.auth.me();
      setUser(me);
    } catch {}
    try {
      const all = await communityClient.entities.ReliquaryEntry.list("-created_date", 100);
      setEntries(all);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = canModerate(user);
  const openNewPost = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const openEditPost = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormOpenChange = (nextOpen) => {
    setShowForm(nextOpen);
    if (!nextOpen) setEditingEntry(null);
  };
  const publishedEntries = entries.filter((entry) => entry.is_published !== false);
  const filteredEntries = filterReliquaryEntries(entries, { search, category, sort });
  const categories = getReliquaryCategories(entries);
  const featuredEntry = filteredEntries[0];
  const hasActiveFilters = Boolean(search.trim() || category !== "all" || sort !== "newest");
  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSort("newest");
  };

  return (
    <div className="relative mx-auto max-w-6xl animate-fade-in">
      <ParticleOverlay style={{ position: "fixed", zIndex: 50 }} />
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary/75">
            <BookOpenText className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em]">Poem Sanctuary</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">The Reliquary</h1>
          <p className="mt-1 text-sm text-muted-foreground">A quiet place for Veri's poems, notes, and community echoes.</p>
        </div>
        {isAdmin && (
          <Button onClick={openNewPost} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="foxcard rounded-xl p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the Reliquary..."
                className="h-11 w-full rounded-lg border border-border bg-secondary/45 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <div className="flex rounded-lg border border-border bg-secondary/45 p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSort(option.key)}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    sort === option.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Categories
            </span>
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === "all"
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-secondary/35 text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  category === item
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-secondary/35 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
        <div className="foxcard flex items-center justify-between gap-5 rounded-xl p-4 lg:min-w-56 lg:flex-col lg:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Archive</p>
            <p className="mt-1 font-heading text-2xl font-bold">{publishedEntries.length}</p>
          </div>
          <div className="text-right lg:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Showing</p>
            <p className="mt-1 font-heading text-2xl font-bold text-primary">{filteredEntries.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : publishedEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-14 text-center">
          <Feather className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No poems placed here yet.</p>
          {isAdmin && (
            <Button className="mt-4 gap-2" onClick={openNewPost}>
              <Plus className="h-4 w-4" /> Write the first one
            </Button>
          )}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-14 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No entries match that search.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}>
            <X className="h-4 w-4" /> Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-5">
            {filteredEntries.map((entry, index) => (
              <ReliquaryEntryCard
                key={entry.id}
                entry={entry}
                user={user}
                isAdmin={isAdmin}
                featured={index === 0}
                onEdit={openEditPost}
                onRefresh={loadData}
              />
            ))}
          </div>
          <aside className="space-y-4">
            {featuredEntry && (
              <div className="foxcard rounded-xl p-5">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  <BookOpenText className="h-3.5 w-3.5" /> Featured
                </p>
                <h2 className="font-heading text-lg font-bold">{featuredEntry.title}</h2>
                {featuredEntry.subtitle && <p className="mt-1 text-sm text-muted-foreground">{featuredEntry.subtitle}</p>}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {featuredEntry.mood && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      <Tag className="h-3 w-3" /> {featuredEntry.mood}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1">
                    <MessageCircle className="h-3 w-3" /> {featuredEntry.comment_count || 0}
                  </span>
                </div>
              </div>
            )}
            <div className="foxcard rounded-xl p-5">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Latest echoes
              </p>
              <div className="space-y-3">
                {publishedEntries.slice(0, 4).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSearch(entry.title);
                      setCategory("all");
                    }}
                    className="block w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50"
                  >
                    <span className="block truncate text-sm font-medium">{entry.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{entry.mood || entry.author_name || "Reliquary"}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      <ReliquaryForm open={showForm} onOpenChange={handleFormOpenChange} user={user} entry={editingEntry} onSaved={loadData} />
    </div>
  );
}
