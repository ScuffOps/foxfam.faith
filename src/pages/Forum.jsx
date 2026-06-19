import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, MessageSquare, Plus, Search, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { communityClient } from "@/api/communityClient";
import ForumThreadCard from "@/components/community/ForumThreadCard";
import ForumThreadForm from "@/components/community/ForumThreadForm";
import GlassCard from "@/components/GlassCard";
import ProgressionLoop from "@/components/ProgressionLoop";
import { FORUM_SECTIONS, getForumSection, normalizeForumCategory } from "@/lib/forumSections";
import { canModerate } from "@/lib/roles";

const SORT_OPTIONS = [
  { key: "latest", label: "Latest", icon: Clock },
  { key: "active", label: "Active", icon: TrendingUp },
  { key: "praised", label: "Praised", icon: Sparkles },
];

const ALL_SECTION = {
  id: "all",
  label: "All Threads",
  description: "Every subforum, newest movement first.",
};

export default function Forum() {
  const [threads, setThreads] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await communityClient.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    }
    const allThreads = await communityClient.entities.CommunityThread.list("-created_date", 200).catch(() => []);
    setThreads(allThreads);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = canModerate(user);
  const sectionOptions = [ALL_SECTION, ...FORUM_SECTIONS];
  const selectedDefaultCategory = activeSection === "all" ? "general" : activeSection;

  const sectionCounts = useMemo(() => {
    return threads.reduce((counts, thread) => {
      const category = normalizeForumCategory(thread.category);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = threads.filter((thread) => {
      const section = getForumSection(thread.category);
      if (activeSection !== "all" && section.id !== activeSection) return false;
      if (!needle) return true;
      const searchable = [
        thread.title,
        thread.body,
        thread.author_name,
        section.label,
        ...(thread.tags || []),
      ].join(" ").toLowerCase();
      return searchable.includes(needle);
    });

    return filtered.sort((a, b) => {
      if (sort === "active") {
        const scoreA = (a.comment_count || 0) * 2 + (a.reactions || 0);
        const scoreB = (b.comment_count || 0) * 2 + (b.reactions || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      if (sort === "praised") {
        const praiseDelta = (b.reactions || 0) - (a.reactions || 0);
        if (praiseDelta !== 0) return praiseDelta;
      }
      return new Date(b.created_date || b.created_at || 0) - new Date(a.created_date || a.created_at || 0);
    });
  }, [activeSection, search, sort, threads]);

  const totalReplies = threads.reduce((sum, thread) => sum + (thread.comment_count || 0), 0);
  const totalPraise = threads.reduce((sum, thread) => sum + (thread.reactions || 0), 0);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Forum</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A standalone circle for threads, subforums, replies, praise, and longer community conversations.
          </p>
        </div>
        <Button onClick={() => setShowThreadForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Thread
        </Button>
      </div>

      <div className="mb-5">
        <ProgressionLoop compact />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <ForumStat label="Threads" value={threads.length} icon={MessageSquare} />
        <ForumStat label="Replies" value={totalReplies} icon={BarChart3} />
        <ForumStat label="Praise" value={totalPraise} icon={Sparkles} />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sectionOptions.map((section) => {
          const count = section.id === "all" ? threads.length : sectionCounts[section.id] || 0;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={isActive}
              className={`rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary/70 bg-primary/10 shadow-[0_0_24px_rgba(92,197,255,0.14)]"
                  : "border-border bg-card/55 hover:border-primary/40 hover:bg-card/80"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-heading text-sm font-semibold">{section.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {count}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{section.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card/55 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forum..."
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No threads in this subforum yet.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowThreadForm(true)}>
            <Plus className="h-4 w-4" /> Start the first thread
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <ForumThreadCard key={thread.id} thread={thread} user={user} isAdmin={isAdmin} onRefresh={loadData} />
          ))}
        </div>
      )}

      <ForumThreadForm
        open={showThreadForm}
        onOpenChange={setShowThreadForm}
        user={user}
        onCreated={loadData}
        defaultCategory={selectedDefaultCategory}
      />
    </div>
  );
}

function ForumStat({ label, value, icon: Icon }) {
  return (
    <GlassCard className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </GlassCard>
  );
}
