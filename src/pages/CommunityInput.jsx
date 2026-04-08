import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";
import GuestProfileBanner from "../components/GuestProfileBanner";
import { Button } from "@/components/ui/button";
import PostForm from "../components/community/PostForm";
import IdeaCard from "../components/community/IdeaCard";
import PollCard from "../components/community/PollCard";

export default function CommunityInput() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("approved");

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
    } catch {}
    const all = await base44.entities.CommunityPost.list("-created_date", 200);
    setPosts(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  const filtered = posts.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = posts.filter((p) => p.status === "pending").length;

  const typeButtons = [
    { key: "all", label: "All" },
    { key: "idea", label: "Ideas" },
    { key: "poll", label: "Polls" },
    { key: "feedback", label: "Feedback" },
  ];

  const statusButtons = [
    { key: "approved", label: "Approved" },
    ...(isAdmin ? [{ key: "pending", label: `Pending (${pendingCount})` }] : []),
    { key: "all", label: "All" },
  ];

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Community Input</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ideas, polls, and feedback from the community</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      {!user && <GuestProfileBanner />}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
          {typeButtons.map((b) => (
            <button
              key={b.key}
              onClick={() => setTypeFilter(b.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === b.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
          {statusButtons.map((b) => (
            <button
              key={b.key}
              onClick={() => setStatusFilter(b.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === b.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No posts to show</p>
        </div>
      ) : (
        <div className="space-y-3">
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