import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import CodexEntryCard from "@/components/codex/CodexEntryCard";
import CodexEntryForm from "@/components/codex/CodexEntryForm";

const CATEGORY_FILTERS = [
  { key: "all",         label: "All"          },
  { key: "lore",        label: "📜 Lore"       },
  { key: "milestone",   label: "🏆 Milestones" },
  { key: "inside_joke", label: "😂 Inside Jokes"},
  { key: "faq",         label: "❓ FAQ"         },
  { key: "other",       label: "📌 Other"       },
];

export default function Codex() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.Codex.list("-created_date", 200);
    setEntries(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const canEdit = user?.role === "verified" || user?.role === "admin";

  const filtered = entries.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        (e.content || "").toLowerCase().includes(q) ||
        (e.tags || []).some((t) => t.includes(q))
      );
    }
    return true;
  });

  const handleSave = async (form) => {
    const payload = {
      ...form,
      author_name: editingEntry ? form.author_name : (user?.full_name || user?.email || ""),
      last_edited_by: editingEntry ? (user?.full_name || user?.email || "") : undefined,
    };
    if (editingEntry) {
      await base44.entities.Codex.update(editingEntry.id, payload);
    } else {
      await base44.entities.Codex.create(payload);
    }
    setEditingEntry(null);
    load();
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    await base44.entities.Codex.delete(entry.id);
    load();
  };

  const openNew = () => {
    setEditingEntry(null);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-2xl font-bold md:text-3xl">The Codex</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Community lore, milestones, inside jokes & more</p>
        </div>
        {canEdit && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        )}
      </div>

      {/* VERIfied badge */}
      {canEdit && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm">✦</span>
          <p className="text-xs text-primary/80 font-heading tracking-wide">You have VERIfied access — you can create and edit entries.</p>
        </div>
      )}

      {/* Category filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setCategoryFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              categoryFilter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the Codex..."
          className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? canEdit
                ? "The Codex is empty — be the first to add an entry!"
                : "The Codex is empty. Check back soon!"
              : "No entries match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <CodexEntryCard
              key={entry.id}
              entry={entry}
              canEdit={canEdit}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CodexEntryForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingEntry(null); }}
        entry={editingEntry}
        onSave={handleSave}
      />
    </div>
  );
}