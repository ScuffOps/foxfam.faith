import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, ArrowUp, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostForm from "../components/community/PostForm";
import IdeaCard from "../components/community/IdeaCard";
import PollCard from "../components/community/PollCard";
import ProgressionLoop from "../components/ProgressionLoop";

const TABS = [
  { key: "feedback", label: "Feedback & Ideas" },
  { key: "polls", label: "Polls" },
];

const SORT_OPTIONS = [
  { key: "top", label: "Top", icon: ArrowUp },
  { key: "new", label: "New", icon: Clock },
  { key: "trending", label: "Trending", icon: TrendingUp },
];

export default function CommunityInput() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("feedback");
  const [sort, setSort] = useState("top");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");

  const loadData = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.CommunityPost.list("-created_date", 200);
    setPosts(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";
  const pendingCount = posts.filter((p) => p.status === "pending").length;

  const getSorted = (arr) => {
    if (sort === "top") return [...arr].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    if (sort === "new") return [...arr].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    if (sort === "trending") {
      // trending = recent + votes combined
      return [...arr].sort((a, b) => {
        const scoreA = (a.upvotes || 0) + (new Date(a.created_date) > new Date(Date.now() - 7 * 86400000) ? 10 : 0);
        const scoreB = (b.upvotes || 0) + (new Date(b.created_date) > new Date(Date.now() - 7 * 86400000) ? 10 : 0);
        return scoreB - scoreA;
      });
    }
    return arr;
  };

  const filtered = getSorted(
    posts.filter((p) => {
      if (activeTab === "feedback" && p.type === "poll") return false;
      if (activeTab === "polls" && p.type !== "poll") return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
          !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Community</h1>
          <p className="mt-1 text-sm text-muted-foreground">Share ideas, feedback, and vote on what matters most</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      <div className="mb-5">
        <ProgressionLoop compact />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Sort */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-40"
            />
          </div>

          {/* Status filter */}
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            {[
              { key: "approved", label: "Approved" },
              ...(isAdmin ? [{ key: "pending", label: `Pending ${pendingCount > 0 ? `(${pendingCount})` : ""}` }] : []),
              { key: "all", label: "All" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setStatusFilter(b.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === b.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No posts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) =>
            post.type === "poll" ? (
              <PollCard key={post.id} post={post} isAdmin={isAdmin} userEmail={user?.email} onRefresh={loadData} />
            ) : (
              <IdeaCard key={post.id} post={post} isAdmin={isAdmin} userEmail={user?.email} onRefresh={loadData} />
            )
          )}
        </div>
      )}

      <PostForm open={showForm} onOpenChange={setShowForm} onCreated={loadData} isMod={isAdmin} />
    </div>
  );
}
