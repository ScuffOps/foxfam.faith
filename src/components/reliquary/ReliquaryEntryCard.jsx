import { useEffect, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { format } from "date-fns";
import { CalendarDays, ChevronDown, ChevronUp, Edit3, MessageCircle, Send, Sparkles, Tag, Trash2 } from "lucide-react";
import PraiseBurst from "@/components/PraiseBurst";
import RichTextContent, { getRichTextPlainText } from "@/components/RichTextContent";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { getCommunityActorKey } from "@/lib/communityActor";
import { PRAISE_BURST_DURATION_MS, PRAISE_REFRESH_DELAY_MS } from "@/lib/praiseEffects";
import { getReliquaryPreview } from "@/lib/reliquaryPreview";

export default function ReliquaryEntryCard({ entry, user, isAdmin, featured = false, onEdit, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [praiseBurst, setPraiseBurst] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPraise, setLocalPraise] = useState({
    upvotes: entry.upvotes || 0,
    upvotedBy: entry.upvoted_by || [],
  });

  useEffect(() => {
    setLocalPraise({
      upvotes: entry.upvotes || 0,
      upvotedBy: entry.upvoted_by || [],
    });
  }, [entry.id, entry.upvotes, entry.upvoted_by]);

  useEffect(() => {
    setIsExpanded(false);
    setShowComments(false);
  }, [entry.id]);

  const actorKey = getCommunityActorKey(user);
  const hasPraised = localPraise.upvotedBy.includes(actorKey);
  const plainBody = getRichTextPlainText(entry.body);
  const preview = getReliquaryPreview(plainBody);
  const shouldShowPreview = !isExpanded && !entry.image_url && preview.text;

  const handlePraise = async () => {
    const previousPraise = localPraise;
    const nextPraise = {
      upvotes: hasPraised ? Math.max(localPraise.upvotes - 1, 0) : localPraise.upvotes + 1,
      upvotedBy: hasPraised
        ? localPraise.upvotedBy.filter((email) => email !== actorKey)
        : [...localPraise.upvotedBy, actorKey],
    };

    setLocalPraise(nextPraise);
    if (!hasPraised) {
      setPraiseBurst((value) => value + 1);
      window.setTimeout(() => setPraiseBurst(0), PRAISE_BURST_DURATION_MS);
    }

    try {
      await communityClient.entities.ReliquaryEntry.update(entry.id, {
        upvotes: nextPraise.upvotes,
        upvoted_by: nextPraise.upvotedBy,
      });
      window.setTimeout(() => onRefresh?.({ silent: true }), PRAISE_REFRESH_DELAY_MS);
    } catch {
      setLocalPraise(previousPraise);
      onRefresh?.({ silent: true });
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await communityClient.entities.ReliquaryComment.filter({ entry_id: entry.id });
      setComments(all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) setIsExpanded(true);
    if (next && comments.length === 0) loadComments();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const actorName = getPublicDisplayName(user, "Guest");
    await communityClient.entities.ReliquaryComment.create({
      entry_id: entry.id,
      message: commentText.trim(),
      author_name: actorName,
      is_anonymous: false,
    });
    await communityClient.entities.ReliquaryEntry.update(entry.id, {
      comment_count: (entry.comment_count || 0) + 1,
    });
    if (user?.email) awardPoints(user, "post_reliquary_comment").then(checkLevelUp);
    setCommentText("");
    setSubmitting(false);
    loadComments();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this reliquary entry?")) return;
    await communityClient.entities.ReliquaryEntry.delete(entry.id);
    onRefresh();
  };
  const publishedDate = entry.created_date ? format(new Date(entry.created_date), "MMM d, yyyy") : "Undated";

  return (
    <article className={`foxcard overflow-hidden rounded-xl ${featured ? "p-6 md:p-7" : "p-5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {entry.mood && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-medium text-primary">
                <Tag className="h-3 w-3" /> {entry.mood}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {publishedDate}
            </span>
          </div>
          <h2 className={`font-heading font-bold text-foreground ${featured ? "text-2xl md:text-3xl" : "text-xl"}`}>{entry.title}</h2>
          {entry.subtitle && <p className="mt-1 text-sm text-muted-foreground">{entry.subtitle}</p>}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onEdit?.(entry)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Edit post"
              type="button"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              title="Delete post"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {entry.image_url && (
        <div className={`mt-5 overflow-hidden rounded-xl border border-border bg-secondary/35 ${isExpanded ? "" : "shadow-inner shadow-background/30"}`}>
          <img
            src={entry.image_url}
            alt={entry.title || "Reliquary entry image"}
            className={`w-full object-cover transition-[max-height,filter] duration-300 ${isExpanded ? "max-h-[28rem]" : "max-h-64"}`}
          />
        </div>
      )}

      {shouldShowPreview && (
        <p className="mt-4 whitespace-pre-line rounded-lg border border-border/70 bg-secondary/25 px-4 py-3 text-sm leading-6 text-card-foreground/80">
          {preview.text}
        </p>
      )}

      {isExpanded && (
        <RichTextContent className="mt-5 whitespace-pre-wrap text-sm leading-7 text-card-foreground/90">
          {entry.body}
        </RichTextContent>
      )}

      {isExpanded && entry.tags?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {isExpanded ? "Collapse" : "Read entry"}
        </button>
        <button
          type="button"
          onClick={handlePraise}
          aria-label={hasPraised ? "Remove Praise" : "Give Praise"}
          title={hasPraised ? "Remove Praise" : "Give Praise"}
          className={`praise-button flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
            hasPraised ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
          } ${praiseBurst ? "is-praising" : ""}`}
        >
          <PraiseBurst key={praiseBurst} active={praiseBurst > 0} />
          <Sparkles className="h-3.5 w-3.5" />
          <span>{hasPraised ? "Praised" : "Give Praise"}</span>
          <span className="font-bold">{localPraise.upvotes}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {entry.comment_count || 0}
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{entry.author_name || "Veri"}</span>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No comments yet. Leave the first echo.</p>
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

          {user ? (
            <div className="mt-2 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
                placeholder="Leave a comment..."
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || submitting}
                className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">Sign in to comment on this entry.</p>
          )}
        </div>
      )}
    </article>
  );
}
