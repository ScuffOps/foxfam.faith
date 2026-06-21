import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Check, X, CalendarPlus, Lightbulb, MessageSquare, Map, Newspaper, Sparkles, ArchiveRestore, Lock } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import PraiseBurst from "../PraiseBurst";
import CommunityComments from "@/components/community/CommunityComments";
import { getCommunityActorKey } from "@/lib/communityActor";
import { PRAISE_BURST_DURATION_MS, PRAISE_REFRESH_DELAY_MS } from "@/lib/praiseEffects";

const typeIcons = {
  idea: Lightbulb,
  feedback: MessageSquare,
  update: Newspaper,
};
const typeColors = {
  idea: "text-chart-4 bg-chart-4/15",
  feedback: "text-chart-2 bg-chart-2/15",
  update: "text-accent bg-accent/15",
};

export default function IdeaCard({ post, isAdmin, user, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const { toast } = useToast();
  const [upvoting, setUpvoting] = useState(false);
  const [voteBurst, setVoteBurst] = useState(0);
  const actorKey = getCommunityActorKey(user);
  const hasUpvoted = (post.upvoted_by || []).includes(actorKey);
  const Icon = typeIcons[post.type] || Lightbulb;

  const handleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);
    const upvotedBy = post.upvoted_by || [];
    try {
      if (hasUpvoted) {
        await communityClient.entities.CommunityPost.update(post.id, {
          upvotes: Math.max((post.upvotes || 0) - 1, 0),
          upvoted_by: upvotedBy.filter((e) => e !== actorKey),
        });
      } else {
        await communityClient.entities.CommunityPost.update(post.id, {
          upvotes: (post.upvotes || 0) + 1,
          upvoted_by: [...upvotedBy, actorKey],
        });
        setVoteBurst((value) => value + 1);
        window.setTimeout(() => setVoteBurst(0), PRAISE_BURST_DURATION_MS);
        communityClient.auth.me().then((u) => {
          awardPoints(u, "upvote_idea").then(checkLevelUp);
        }).catch(() => {});
      }
      if (onRefresh) window.setTimeout(onRefresh, hasUpvoted ? 0 : PRAISE_REFRESH_DELAY_MS);
    } catch {
      toast({
        title: "Praise could not be sent",
        description: "Please try again in a moment.",
      });
    } finally {
      setUpvoting(false);
    }
  };

  const handleApprove = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "approved" });
    onRefresh();
  };
  const handleReject = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "rejected" });
    onRefresh();
  };
  const handleConvert = async () => {
    await communityClient.entities.Event.create({
      title: post.title,
      description: post.description || "",
      category: "community",
      start_date: new Date().toISOString(),
      status: "active",
    });
    await communityClient.entities.CommunityPost.update(post.id, { status: "converted" });
    onRefresh();
  };

  const handleAddToRoadmap = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { roadmap_status: "planned" });
    onRefresh();
  };

  const handleClose = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "closed" });
    onRefresh();
  };

  const handleReopen = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "approved" });
    onRefresh();
  };

  return (
    <GlassCard className="flex gap-3">
      {/* Give Praise */}
      <button
        onClick={handleUpvote}
        aria-label={hasUpvoted ? "Remove Praise" : "Give Praise"}
        title={hasUpvoted ? "Remove Praise" : "Give Praise"}
        className={`praise-button flex min-w-[4.75rem] flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors ${
          hasUpvoted ? "bg-chart-4/15 text-chart-4" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        } ${voteBurst ? "is-praising" : ""}`}
      >
        <PraiseBurst key={voteBurst} active={voteBurst > 0} />
        <Sparkles className="h-4 w-4" />
        <span className="text-[10px] font-medium leading-none">{hasUpvoted ? "Praised" : "Give Praise"}</span>
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
          <RichTextContent className="mt-1.5 text-sm text-muted-foreground">
            {post.description}
          </RichTextContent>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">by {post.submitted_by_name || "Guest"}</span>
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
          {isAdmin && post.status === "approved" && post.type !== "update" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={handleConvert}>
                <CalendarPlus className="h-3 w-3" /> Convert to Event
              </Button>
              {(!post.roadmap_status || post.roadmap_status === "none") && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-chart-4 hover:bg-chart-4/10" onClick={handleAddToRoadmap}>
                  <Map className="h-3 w-3" /> Add to Roadmap
                </Button>
              )}
            </>
          )}
          {isAdmin && ["approved", "converted"].includes(post.status) && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:bg-secondary" onClick={handleClose}>
              <Lock className="h-3 w-3" /> Close
            </Button>
          )}
          {isAdmin && post.status === "closed" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={handleReopen}>
              <ArchiveRestore className="h-3 w-3" /> Reopen
            </Button>
          )}
        </div>
        <CommunityComments post={post} user={user} onRefresh={onRefresh} />
      </div>
    </GlassCard>
  );
}
