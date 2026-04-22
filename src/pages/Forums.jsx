import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThreadCard from "@/components/community/ThreadCard";
import NewThreadDialog from "@/components/community/NewThreadDialog";

const CATEGORIES = ["all", "general", "prayer", "blessings", "gaming", "creative"];

const CATEGORY_COLORS = {
  all: "text-foreground",
  general: "text-muted-foreground",
  prayer: "text-chart-5",
  blessings: "text-chart-3",
  gaming: "text-accent",
  creative: "text-chart-4",
};

export default function Forums() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.Thread.list("-created_date", 100);
    setThreads(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  const filtered = threads
    .filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.body || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Pinned first, then by date
      if (b.is_pinned !== a.is_pinned) return b.is_pinned ? 1 : -1;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Forums</h1>
          <p className="mt-1 text-sm text-muted-foreground">Discuss topics, share thoughts, and connect with the community</p>
        </div>
        {user?.email && (
          <Button onClick={() => setShowNew(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New Thread
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                activeCategory === c
                  ? "bg-primary text-primary-foreground"
                  : `border border-border bg-secondary/50 ${CATEGORY_COLORS[c]} hover:bg-secondary`
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads..."
            className="h-8 rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-44"
          />
        </div>
      </div>

      {/* Threads */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No threads yet in this category.</p>
          {user?.email && (
            <Button className="mt-4 gap-2" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Start the first thread
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              user={user}
              isAdmin={isAdmin}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      <NewThreadDialog open={showNew} onOpenChange={setShowNew} user={user} onCreated={loadData} />
    </div>
  );
}