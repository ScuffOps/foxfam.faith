import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Check, X, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";

export default function PollCard({ post, isAdmin, userEmail, onRefresh }) {
  const [voting, setVoting] = useState(false);
  const options = post.poll_options || [];
  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0);
  const userVotedOption = options.find((o) => (o.voted_by || []).includes(userEmail));

  const handleVote = async (optionId) => {
    if (!userEmail || voting || userVotedOption) return;
    setVoting(true);
    const updated = options.map((o) => {
      if (o.id === optionId) {
        return { ...o, votes: (o.votes || 0) + 1, voted_by: [...(o.voted_by || []), userEmail] };
      }
      return o;
    });
    await base44.entities.CommunityPost.update(post.id, { poll_options: updated });
    setVoting(false);
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
    const topOption = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
    await base44.entities.Event.create({
      title: `${post.title}${topOption ? ` - ${topOption.text}` : ""}`,
      description: post.description || "",
      category: "community",
      start_date: new Date().toISOString(),
      status: "active",
    });
    await base44.entities.CommunityPost.update(post.id, { status: "converted" });
    onRefresh();
  };

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-chart-2/15">
            <BarChart3 className="h-3.5 w-3.5 text-chart-2" />
          </div>
          <h4 className="font-medium">{post.title}</h4>
          <StatusBadge status={post.status} />
        </div>
      </div>
      {post.description && (
        <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
      )}
      {/* Poll Options */}
      <div className="mt-3 space-y-2">
        {options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
          const isVoted = userVotedOption?.id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={!!userVotedOption || !userEmail}
              className="relative w-full overflow-hidden rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-left transition-colors hover:border-primary/30 disabled:cursor-default"
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className={`text-sm ${isVoted ? "font-semibold text-primary" : ""}`}>
                  {opt.text}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {opt.votes || 0} votes ({pct}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {totalVotes} total votes · by {post.submitted_by_name || "Anonymous"}
        </span>
        <div className="flex gap-1">
          {isAdmin && post.status === "pending" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-success hover:bg-success/10" onClick={handleApprove}>
                <Check className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={handleReject}>
                <X className="h-3 w-3" /> Reject
              </Button>
            </>
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