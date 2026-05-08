import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Edit3, MessageCircle, Send, Trash2 } from "lucide-react";
import RichTextContent from "@/components/RichTextContent";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { createUserNotification } from "@/lib/notifications";

export default function ReliquaryEntryCard({ entry, user, isAdmin, onEdit, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await base44.entities.ReliquaryComment.filter({ entry_id: entry.id });
      setComments(all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    await base44.entities.ReliquaryComment.create({
      entry_id: entry.id,
      message: commentText.trim(),
      author_name: getPublicDisplayName(user, user.email),
      is_anonymous: false,
    });
    await base44.entities.ReliquaryEntry.update(entry.id, {
      comment_count: (entry.comment_count || 0) + 1,
    });
    if (entry.author_email && entry.author_email !== user.email) {
      createUserNotification({
        recipientEmail: entry.author_email,
        actorEmail: user.email,
        actorName: getPublicDisplayName(user, "Someone"),
        type: "comment_received",
        title: "New reliquary comment",
        message: `${getPublicDisplayName(user, "Someone")} commented on "${entry.title}".`,
        sourceType: "reliquary_entry",
        sourceId: entry.id,
      });
    }
    awardPoints(user, "post_reliquary_comment").then(checkLevelUp);
    setCommentText("");
    setSubmitting(false);
    loadComments();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this reliquary entry?")) return;
    await base44.entities.ReliquaryEntry.delete(entry.id);
    onRefresh();
  };

  return (
    <article className="foxcard overflow-hidden rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {entry.mood && (
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-primary/70">{entry.mood}</p>
          )}
          <h2 className="font-heading text-xl font-bold text-foreground">{entry.title}</h2>
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
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-secondary/35">
          <img src={entry.image_url} alt={entry.title || "Reliquary entry image"} className="max-h-[28rem] w-full object-cover" />
        </div>
      )}

      <RichTextContent className="mt-5 whitespace-pre-wrap text-sm leading-7 text-card-foreground/90">
        {entry.body}
      </RichTextContent>

      {entry.tags?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
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
                  <span className="text-xs font-semibold text-foreground">{comment.author_name || "Anonymous"} </span>
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
