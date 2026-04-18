import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lightbulb, ArrowUp } from "lucide-react";
import GlassCard from "../GlassCard";

export default function TopIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [upvoting, setUpvoting] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [all, me] = await Promise.all([
          base44.entities.CommunityPost.filter({ type: "idea", status: "approved" }, "-upvotes", 5),
          base44.auth.me().catch(() => null),
        ]);
        setIdeas(all);
        setUser(me);
      } catch {
        setIdeas([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpvote = async (idea) => {
    if (!user?.email || upvoting) return;
    const upvotedBy = idea.upvoted_by || [];
    const hasUpvoted = upvotedBy.includes(user.email);
    setUpvoting(idea.id);

    const updated = {
      upvotes: hasUpvoted ? Math.max((idea.upvotes || 0) - 1, 0) : (idea.upvotes || 0) + 1,
      upvoted_by: hasUpvoted
        ? upvotedBy.filter((e) => e !== user.email)
        : [...upvotedBy, user.email],
    };

    // Optimistic update
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, ...updated } : i))
        .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
    );

    try {
      await base44.entities.CommunityPost.update(idea.id, updated);
    } catch {
      // revert on failure
      setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
    } finally {
      setUpvoting(null);
    }
  };

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/15">
          <Lightbulb className="h-4 w-4 text-chart-4" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Top Ideas</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : ideas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No ideas yet</p>
      ) : (
        <div className="space-y-2.5">
          {ideas.map((idea) => {
            const hasUpvoted = (idea.upvoted_by || []).includes(user?.email);
            return (
              <div key={idea.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                <button
                  onClick={() => handleUpvote(idea)}
                  disabled={!user?.email || upvoting === idea.id}
                  className={`flex flex-col items-center gap-0.5 rounded-md px-1.5 py-1 transition-colors ${
                    hasUpvoted
                      ? "text-chart-4 bg-chart-4/15"
                      : "text-muted-foreground hover:text-chart-4 hover:bg-chart-4/10"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">{idea.upvotes || 0}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{idea.title}</p>
                  <p className="text-xs text-muted-foreground">by {idea.submitted_by_name || "Anonymous"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}