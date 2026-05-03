import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUp, MessageCircle, ExternalLink, Trash2, ChevronDown, ChevronUp, Send, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";

export default function BlessingCard({ blessing, user, isAdmin, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasUpvoted = (blessing.upvoted_by || []).includes(user?.email);

  const handleUpvote = async () => {
    if (!user?.email) return;
    const upvotedBy = blessing.upvoted_by || [];
    await base44.entities.Blessing.update(blessing.id, {
      upvotes: hasUpvoted ? Math.max((blessing.upvotes || 0) - 1, 0) : (blessing.upvotes || 0) + 1,
      upvoted_by: hasUpvoted ? upvotedBy.filter((e) => e !== user.email) : [...upvotedBy, user.email],
    });
    if (!hasUpvoted) awardPoints(user, "upvote_blessing").then(checkLevelUp);
    onRefresh();
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const all = await base44.entities.BlessingComment.filter({ blessing_id: blessing.id });
    setComments(all.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
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
    await base44.entities.BlessingComment.create({
      blessing_id: blessing.id,
      message: commentText.trim(),
      author_name: user.full_name || user.email,
    });
    await base44.entities.Blessing.update(blessing.id, {
      comment_count: (blessing.comment_count || 0) + 1,
    });
    awardPoints(user, "post_blessing_comment").then(checkLevelUp);
    setCommentText("");
    setSubmitting(false);
    loadComments();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this blessing?")) return;
    await base44.entities.Blessing.delete(blessing.id);
    onRefresh();
  };

  const isImage = blessing.media_url && /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(blessing.media_url);
  const isVideo = blessing.media_url && /\.(mp4|webm|mov)(\?|$)/i.test(blessing.media_url);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-border/70">
      {/* Media */}
      {isImage && (
        <img src={blessing.media_url} alt="" className="w-full max-h-80 object-cover" />
      )}
      {isVideo && (
        <video src={blessing.media_url} controls className="w-full max-h-80 object-cover" />
      )}

      <div className="p-4">
        <h3 className="font-heading font-semibold text-base">{blessing.title}</h3>
        {blessing.content && (
          <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{blessing.content}</p>
        )}

        {/* Codex link */}
        {blessing.codex_entry_id && (
          <Link
            to="/codex"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs text-primary hover:bg-primary/15 transition-colors"
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span>{blessing.codex_entry_emoji || "📖"}</span>
            <span className="truncate max-w-[160px]">{blessing.codex_entry_title}</span>
          </Link>
        )}

        {/* Link */}
        {blessing.link_url && (
          <a
            href={blessing.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-accent hover:bg-secondary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{blessing.link_preview_title || blessing.link_url}</span>
          </a>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleUpvote}
            disabled={!user?.email}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              hasUpvoted ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            {blessing.upvotes || 0}
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-secondary transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {blessing.comment_count || 0}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            {blessing.author_name || "Veri"}
          </span>

          {isAdmin && (
            <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 border-t border-border pt-4 space-y-3">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-2">No comments yet. Be the first! 💬</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
                    {(c.author_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">{c.author_name || "Anonymous"} </span>
                    <span className="text-xs text-muted-foreground">{c.message}</span>
                  </div>
                </div>
              ))
            )}

            {user && (
              <div className="flex gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || submitting}
                  className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}