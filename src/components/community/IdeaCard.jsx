import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Check, X, CalendarPlus, ChevronDown, ChevronUp, Lightbulb, MessageCircle, MessageSquare, Map, Newspaper, Send, Sparkles } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import PraiseBurst from "../PraiseBurst";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { useGuestProfile } from "@/hooks/useGuestProfile";
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
  const { profile } = useGuestProfile();
  const [upvoting, setUpvoting] = useState(false);
  const [voteBurst, setVoteBurst] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const actorKey = getCommunityActorKey(user);
  const hasUpvoted = (post.upvoted_by || []).includes(actorKey);
  const Icon = typeIcons[post.type] || Lightbulb;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await communityClient.entities.CommunityPostComment.filter({ post_id: post.id });
      setComments(all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

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

  const handleComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      let actorName = profile.name || "Guest";
      try {
        const currentUser = await communityClient.auth.me();
        actorName = getPublicDisplayName(currentUser, "Guest");
      } catch {}

      await communityClient.entities.CommunityPostComment.create({
        post_id: post.id,
        message: commentText.trim(),
        author_name: actorName,
      });
      await communityClient.entities.CommunityPost.update(post.id, {
        comment_count: (post.comment_count || 0) + 1,
      });
      setCommentText("");
      setShowComments(true);
      await loadComments();
      onRefresh();
    } catch {
      toast({
        title: "Comment could not be posted",
        description: "Please try again in a moment.",
      });
    } finally {
      setSubmittingComment(false);
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
          <button
            type="button"
            onClick={toggleComments}
            className="flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Comment
            <span className="font-semibold">{post.comment_count || 0}</span>
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
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
        </div>
        {showComments && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {loadingComments ? (
              <div className="flex justify-center py-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No comments yet. Start the chorus.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {(comment.author_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">{comment.author_name || "Guest"} </span>
                    <RichTextContent className="inline text-xs text-muted-foreground" inline>
                      {comment.message}
                    </RichTextContent>
                  </div>
                </div>
              ))
            )}

            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleComment}
                disabled={!commentText.trim() || submittingComment}
                className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
