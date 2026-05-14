import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, MessageCircle, Send, Trash2 } from "lucide-react";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { createUserNotification } from "@/lib/notifications";
import { useToast } from "@/components/ui/use-toast";
import PraiseBurst from "../PraiseBurst";

function getGuestForumId() {
  const key = "commhub_forum_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ForumThreadCard({ thread, user, isAdmin, onRefresh }) {
  const { toast } = useToast();
  const { profile } = useGuestProfile();
  const [guestId] = useState(getGuestForumId);
  const [showReplies, setShowReplies] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reactionBurst, setReactionBurst] = useState(0);
  const actorId = user?.email || `guest:${guestId}`;
  const actorName = user ? getPublicDisplayName(user, user.email) : profile.name || "Guest";
  const hasReacted = (thread.reacted_by || []).includes(actorId);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await base44.entities.CommunityThreadComment.filter({ thread_id: thread.id });
      setComments(all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const toggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleReact = async () => {
    const reactedBy = thread.reacted_by || [];
    try {
      await base44.entities.CommunityThread.update(thread.id, {
        reactions: hasReacted ? Math.max((thread.reactions || 0) - 1, 0) : (thread.reactions || 0) + 1,
        reacted_by: hasReacted ? reactedBy.filter((id) => id !== actorId) : [...reactedBy, actorId],
      });
      if (!hasReacted) {
        setReactionBurst((value) => value + 1);
        window.setTimeout(() => setReactionBurst(0), 1550);
      }
      onRefresh();
    } catch {
      toast({
        title: "Praise could not be sent",
        description: "Please make sure you are signed in and try again.",
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || thread.is_locked) return;
    setSubmitting(true);
    try {
      await base44.entities.CommunityThreadComment.create({
        thread_id: thread.id,
        message: commentText.trim(),
        author_name: actorName,
      });
      await base44.entities.CommunityThread.update(thread.id, {
        comment_count: (thread.comment_count || 0) + 1,
      });
      if (thread.author_email && thread.author_email !== user?.email) {
        createUserNotification({
          recipientEmail: thread.author_email,
          actorEmail: user?.email || actorId,
          actorName,
          type: "reply_received",
          title: "New forum reply",
          message: `${actorName} replied to "${thread.title}".`,
          sourceType: "community_thread",
          sourceId: thread.id,
        });
      }
      setCommentText("");
      setShowReplies(true);
      loadComments();
      onRefresh();
    } catch {
      toast({
        title: "Reply could not be posted",
        description: "Please make sure you are signed in and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this forum thread?")) return;
    await base44.entities.CommunityThread.delete(thread.id);
    onRefresh();
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {thread.category || "general"}
            </span>
            {thread.is_locked && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Locked
              </span>
            )}
          </div>
          <h3 className="font-heading text-lg font-semibold">{thread.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">by {thread.author_name || "Favored Fox"}</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={handleDelete} className="shrink-0 text-muted-foreground transition-colors hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <RichTextContent className="text-sm leading-relaxed text-muted-foreground">
        {thread.body}
      </RichTextContent>

      {thread.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={handleReact}
          aria-label={hasReacted ? "Remove Praise" : "Give Praise"}
          title={hasReacted ? "Remove Praise" : "Give Praise"}
          className={`praise-button flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            hasReacted ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
          } ${reactionBurst ? "is-praising" : ""}`}
        >
          <PraiseBurst key={reactionBurst} active={reactionBurst > 0} />
          {hasReacted ? "Praised" : "Give Praise"}
          <span className="font-semibold">{thread.reactions || 0}</span>
        </button>
        <button
          type="button"
          onClick={toggleReplies}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comment
          <span className="font-semibold">{thread.comment_count || 0}</span>
          {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showReplies && (
        <div className="space-y-3 border-t border-border pt-4">
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No replies yet. Open the circle.</p>
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

          <div className="mt-2 flex gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && handleComment()}
              placeholder={thread.is_locked ? "Thread is locked" : `Reply as ${actorName}...`}
              disabled={thread.is_locked}
              className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting || thread.is_locked}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
