import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUp, Check, X, CalendarPlus, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";

const typeIcons = {
  idea: Lightbulb,
  feedback: MessageSquare,
};
const typeColors = {
  idea: "text-chart-4 bg-chart-4/15",
  feedback: "text-chart-2 bg-chart-2/15",
};

export default function IdeaCard({ post, isAdmin, userEmail, onRefresh }) {
  const [upvoting, setUpvoting] = useState(false);
  const hasUpvoted = (post.upvoted_by || []).includes(userEmail);
  const Icon = typeIcons[post.type] || Lightbulb;

  const handleUpvote = async () => {
    if (!userEmail || upvoting) return;
    setUpvoting(true);
    const upvotedBy = post.upvoted_by || [];
    if (hasUpvoted) {
      await base44.entities.CommunityPost.update(post.id, {
        upvotes: Math.max((post.upvotes || 0) - 1, 0),
        upvoted_by: upvotedBy.filter((e) => e !== userEmail),
      });
    } else {
      await base44.entities.CommunityPost.update(post.id, {
        upvotes: (post.upvotes || 0) + 1,
        upvoted_by: [...upvotedBy, userEmail],
      });
    }
    setUpvoting(false);
    onRefresh();
  };

  const handleApprove = async () => {
    await base44.entities.CommunityPost.update(post.id, { status: "approved" });
    onRefresh();
  };
  const handleReject = async () => {
    await base44.entities.CommunityPost.update(post.id, { status: "rejected" });
    onRefresh();
  };
  const handleConvert = async () => {
    await base44.entities.Event.create({
      title: post.title,
      description: post.description || "",
      category: "community",
      start_date: new Date().toISOString(),
      status: "active",
    });
    await base44.entities.CommunityPost.update(post.id, { status: "converted" });
    onRefresh();
  };

  return (
    <GlassCard className="flex gap-3">
      {/* Upvote */}
      <button
        onClick={handleUpvote}
        disabled={!userEmail}
        className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors ${
          hasUpvoted ? "bg-chart-4/15 text-chart-4" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <ArrowUp className="h-4 w-4" />
        <span className="text-xs font-bold">{post.upvotes || 0}</span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-md ${typeColors[post.type]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <h4 className="font-medium">{post.title}</h4>
            <StatusBadge status={post.status} />
          </div>
        </div>
        {post.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{post.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">by {post.submitted_by_name || "Anonymous"}</span>
          {isAdmin && post.status === "pending" && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-success hover:bg-success/10" onClick={handleApprove}>
                <Check className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={handleReject}>
                <X className="h-3 w-3" /> Reject
              </Button>
            </div>
          )}
          {isAdmin && post.status === "approved" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={handleConvert}>
              <CalendarPlus className="h-3 w-3" /> Convert to Event
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}