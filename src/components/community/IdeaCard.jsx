import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUp, Check, X, CalendarPlus, ChevronDown, ChevronUp, Lightbulb, MessageCircle, MessageSquare, Map, Newspaper, Send } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import PraiseBurst from "../PraiseBurst";
import { createUserNotification } from "@/lib/notifications";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { useGuestProfile } from "@/hooks/useGuestProfile";

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

export default function IdeaCard({ post, isAdmin, userEmail, onRefresh }) {
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
  const hasUpvoted = (post.upvoted_by || []).includes(userEmail);
  const Icon = typeIcons[post.type] || Lightbulb;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await base44.entities.CommunityPostComment.filter({ post_id: post.id });
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
    if (!userEmail || upvoting) return;
    setUpvoting(true);
    const upvotedBy = post.upvoted_by || [];
    try {
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
        setVoteBurst((value) => value + 1);
        window.setTimeout(() => setVoteBurst(0), 1550);
        base44.auth.me().then((u) => {
          awardPoints(u, "upvote_idea").then(checkLevelUp);
          if (post.submitted_by_email && post.submitted_by_email !== u.email) {
            createUserNotification({
              recipientEmail: post.submitted_by_email,
              actorEmail: u.email,
              actorName: getPublicDisplayName(u, "Someone"),
              type: "praise_received",
              title: "Praise received",
              message: `${getPublicDisplayName(u, "Someone")} gave praise to "${post.title}".`,
              sourceType: "community_post",
              sourceId: post.id,
            });
          }
        }).catch(() => {});
      }
      onRefresh();
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
      let actorEmail = "";
      try {
        const user = await base44.auth.me();
        actorName = getPublicDisplayName(user, user.email || "Member");
        actorEmail = user.email || "";
      } catch {}

      await base44.entities.CommunityPostComment.create({
        post_id: post.id,
        message: commentText.trim(),
        author_name: actorName,
        author_email: actorEmail,
      });
      await base44.entities.CommunityPost.update(post.id, {
        comment_count: (post.comment_count || 0) + 1,
      });
      if (post.submitted_by_email && post.submitted_by_email !== actorEmail) {
        createUserNotification({
          recipientEmail: post.submitted_by_email,
          actorEmail,
          actorName,
          type: "comment_received",
          title: "New feedback comment",
          message: `${actorName} commented on "${post.title}".`,
          sourceType: "community_post",
          sourceId: post.id,
        });
      }
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

  const handleAddToRoadmap = async () => {
    await base44.entities.CommunityPost.update(post.id, { roadmap_status: "planned" });
    onRefresh();
  };

  return (
    <GlassCard className="flex gap-3">
      {/* Give Praise */}
      <button
        onClick={handleUpvote}
        disabled={!userEmail}
        aria-label={hasUpvoted ? "Remove Praise" : "Give Praise"}
        title={hasUpvoted ? "Remove Praise" : "Give Praise"}
        className={`praise-button flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors ${
          hasUpvoted ? "bg-chart-4/15 text-chart-4" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        } ${voteBurst ? "is-praising" : ""}`}
      >
        <PraiseBurst key={voteBurst} active={voteBurst > 0} />
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
          <RichTextContent className="mt-1.5 text-sm text-muted-foreground">
            {post.description}
          </RichTextContent>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">by {post.submitted_by_name || "Anonymous"}</span>
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
                    <span className="text-xs font-semibold text-foreground">{comment.author_name || "Anonymous"} </span>
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
