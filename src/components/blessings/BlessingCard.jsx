import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, ChevronDown, ChevronUp, Download, ExternalLink, Maximize2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UserMarkdown from "../UserMarkdown";
import PraiseBurst from "../PraiseBurst";

function downloadNameFor(title) {
  const slug = (title || "blessing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "blessing"}.jpg`;
}

export default function BlessingCard({ blessing, user, isAdmin, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [praiseBurst, setPraiseBurst] = useState(0);
  const [localPraise, setLocalPraise] = useState({
    upvotes: blessing.upvotes || 0,
    upvotedBy: blessing.upvoted_by || [],
  });

  useEffect(() => {
    setLocalPraise({
      upvotes: blessing.upvotes || 0,
      upvotedBy: blessing.upvoted_by || [],
    });
  }, [blessing.id, blessing.upvotes, blessing.upvoted_by]);

  const hasPraised = localPraise.upvotedBy.includes(user?.email);

  const handlePraise = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user?.email) return;

    const previousPraise = localPraise;
    const nextPraise = {
      upvotes: hasPraised ? Math.max(localPraise.upvotes - 1, 0) : localPraise.upvotes + 1,
      upvotedBy: hasPraised
        ? localPraise.upvotedBy.filter((e) => e !== user.email)
        : [...localPraise.upvotedBy, user.email],
    };

    setLocalPraise(nextPraise);
    if (!hasPraised) {
      setPraiseBurst((value) => value + 1);
      window.setTimeout(() => setPraiseBurst(0), 900);
    }

    try {
      await base44.entities.Blessing.update(blessing.id, {
        upvotes: nextPraise.upvotes,
        upvoted_by: nextPraise.upvotedBy,
      });
      if (!hasPraised) awardPoints(user, "upvote_blessing").then(checkLevelUp);
      window.setTimeout(() => onRefresh?.({ silent: true }), 700);
    } catch {
      setLocalPraise(previousPraise);
      onRefresh?.({ silent: true });
    }
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
      author_name: user.display_name || user.full_name || user.email,
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
  const imageDownloadName = downloadNameFor(blessing.title);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/70">
      {isImage && (
        <div className="group relative bg-background/70">
          <img src={blessing.media_url} alt={blessing.title || "Blessing image"} className="max-h-80 w-full object-cover" />
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setShowFullImage(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-background/85 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              View full image
            </button>
            <a
              href={blessing.media_url}
              download={imageDownloadName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-background/85 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
            >
              <Download className="h-3.5 w-3.5" />
              Save image
            </a>
          </div>
        </div>
      )}
      {isVideo && (
        <video src={blessing.media_url} controls className="max-h-80 w-full object-cover" />
      )}

      <div className="p-4">
        <h3 className="font-heading text-base font-semibold">{blessing.title}</h3>
        {blessing.content && (
          <UserMarkdown className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {blessing.content}
          </UserMarkdown>
        )}

        {blessing.codex_entry_id && (
          <Link
            to="/codex"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span>{blessing.codex_entry_emoji || "Book"}</span>
            <span className="max-w-[160px] truncate">{blessing.codex_entry_title}</span>
          </Link>
        )}

        {blessing.link_url && (
          <a
            href={blessing.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{blessing.link_preview_title || blessing.link_url}</span>
          </a>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePraise}
            disabled={!user?.email}
            className={`praise-button flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              hasPraised ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
            } ${praiseBurst ? "is-praising" : ""}`}
          >
            <PraiseBurst key={praiseBurst} active={praiseBurst > 0} />
            <span aria-hidden="true" className="text-sm leading-none">🕯</span>
            <span>{hasPraised ? "Praised" : "Give praise"}</span>
            <span className="font-bold">{localPraise.upvotes}</span>
          </button>

          <button
            type="button"
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Comment</span>
            {blessing.comment_count || 0}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            {blessing.author_name || "Veri"}
          </span>

          {isAdmin && (
            <button type="button" onClick={handleDelete} className="text-muted-foreground transition-colors hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showComments && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">No comments yet. Leave the first blessing.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {(comment.author_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">{comment.author_name || "Anonymous"} </span>
                    <UserMarkdown className="inline text-xs text-muted-foreground" inline>
                      {comment.message}
                    </UserMarkdown>
                  </div>
                </div>
              ))
            )}

            {user ? (
              <div className="mt-2 flex gap-2">
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
                  disabled={!commentText.trim() || submitting}
                  className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Sign in to comment on this blessing.</p>
            )}
          </div>
        )}
      </div>

      {isImage && (
        <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
          <DialogContent className="max-h-[90vh] border-border bg-card p-4 sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-base">{blessing.title || "Blessing image"}</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 justify-center overflow-hidden rounded-lg bg-background/70">
              <img src={blessing.media_url} alt={blessing.title || "Blessing image"} className="max-h-[72vh] w-auto max-w-full object-contain" />
            </div>
            <div className="flex justify-end">
              <a
                href={blessing.media_url}
                download={imageDownloadName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
              >
                <Download className="h-3.5 w-3.5" />
                Save image
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
