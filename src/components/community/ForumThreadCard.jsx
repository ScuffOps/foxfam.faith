import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Check, ChevronDown, ChevronUp, Edit3, Lock, MessageCircle, Send, Trash2, Unlock, X } from "lucide-react";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import { getForumSection } from "@/lib/forumSections";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { useToast } from "@/components/ui/use-toast";
import PraiseBurst from "../PraiseBurst";
import { getCommunityActorKey } from "@/lib/communityActor";
import { canEditCommunityRecord } from "@/lib/editPermissions";
import { PRAISE_BURST_DURATION_MS, PRAISE_REFRESH_DELAY_MS } from "@/lib/praiseEffects";

export default function ForumThreadCard({ thread, user, isAdmin, onRefresh }) {
  const { toast } = useToast();
  const { profile } = useGuestProfile();
  const [showReplies, setShowReplies] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadForm, setEditThreadForm] = useState({ title: thread.title || "", body: thread.body || "", tags: (thread.tags || []).join(", ") });
  const [editingCommentId, setEditingCommentId] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reactionBurst, setReactionBurst] = useState(0);
  const actorId = getCommunityActorKey(user);
  const actorName = user ? getPublicDisplayName(user, "Guest") : profile.name || "Guest";
  const hasReacted = (thread.reacted_by || []).includes(actorId);
  const section = getForumSection(thread.category);
  const canEditThread = canEditCommunityRecord(user, thread, { forum: true });

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const all = await communityClient.entities.CommunityThreadComment.filter({ thread_id: thread.id });
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
      await communityClient.entities.CommunityThread.update(thread.id, {
        reactions: hasReacted ? Math.max((thread.reactions || 0) - 1, 0) : (thread.reactions || 0) + 1,
        reacted_by: hasReacted ? reactedBy.filter((id) => id !== actorId) : [...reactedBy, actorId],
      });
      if (!hasReacted) {
        setReactionBurst((value) => value + 1);
        window.setTimeout(() => setReactionBurst(0), PRAISE_BURST_DURATION_MS);
      }
      if (onRefresh) window.setTimeout(onRefresh, hasReacted ? 0 : PRAISE_REFRESH_DELAY_MS);
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
      await communityClient.entities.CommunityThreadComment.create({
        thread_id: thread.id,
        message: commentText.trim(),
        author_name: actorName,
      });
      await communityClient.entities.CommunityThread.update(thread.id, {
        comment_count: (thread.comment_count || 0) + 1,
      });
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
    await communityClient.entities.CommunityThread.delete(thread.id);
    onRefresh();
  };

  const handleSaveThread = async () => {
    if (!editThreadForm.title.trim()) return;
    await communityClient.entities.CommunityThread.update(thread.id, {
      title: editThreadForm.title.trim(),
      body: editThreadForm.body,
      tags: editThreadForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      edited_at: new Date().toISOString(),
    });
    setEditingThread(false);
    onRefresh();
  };

  const handleToggleLock = async () => {
    try {
      await communityClient.entities.CommunityThread.update(thread.id, {
        is_locked: !thread.is_locked,
      });
      onRefresh();
      toast({
        title: thread.is_locked ? "Thread unlocked" : "Thread locked",
        description: thread.is_locked
          ? "The circle may resume its scheduled emotional processing."
          : "Replies are paused. Care won over chaos for once.",
      });
    } catch {
      toast({
        title: "Thread could not be updated",
        description: "Your role may not have forum moderation access yet.",
      });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this forum reply?")) return;
    try {
      await communityClient.entities.CommunityThreadComment.delete(commentId);
      await communityClient.entities.CommunityThread.update(thread.id, {
        comment_count: Math.max((thread.comment_count || 0) - 1, 0),
      });
      await loadComments();
      onRefresh();
    } catch {
      toast({
        title: "Reply could not be deleted",
        description: "Your role may not have forum moderation access yet.",
      });
    }
  };

  const handleSaveComment = async (comment) => {
    if (!commentDraft.trim()) return;
    try {
      await communityClient.entities.CommunityThreadComment.update(comment.id, {
        message: commentDraft.trim(),
        edited_at: new Date().toISOString(),
      });
      setEditingCommentId("");
      setCommentDraft("");
      await loadComments();
    } catch {
      toast({
        title: "Reply could not be edited",
        description: "Your role may not have forum edit access yet.",
      });
    }
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {section.label}
            </span>
            {thread.is_locked && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Locked
              </span>
            )}
          </div>
          {editingThread ? (
            <input
              value={editThreadForm.title}
              onChange={(event) => setEditThreadForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 font-heading text-lg font-semibold"
            />
          ) : (
            <h3 className="font-heading text-lg font-semibold">{thread.title}</h3>
          )}
          <p className="mt-1 text-xs text-muted-foreground">by {thread.author_name || "Favored Fox"}</p>
        </div>
        {(canEditThread || isAdmin) && (
          <div className="flex shrink-0 items-center gap-1">
            {canEditThread && !editingThread && (
              <button
                type="button"
                onClick={() => setEditingThread(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Edit thread"
                aria-label="Edit thread"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title={thread.is_locked ? "Unlock thread" : "Lock thread"}
                  aria-label={thread.is_locked ? "Unlock thread" : "Lock thread"}
                >
                  {thread.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete thread"
                  aria-label="Delete thread"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editingThread ? (
        <div className="space-y-2">
          <textarea
            value={editThreadForm.body}
            onChange={(event) => setEditThreadForm((current) => ({ ...current, body: event.target.value }))}
            className="min-h-28 w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm"
          />
          <input
            value={editThreadForm.tags}
            onChange={(event) => setEditThreadForm((current) => ({ ...current, tags: event.target.value }))}
            placeholder="comma, separated, tags"
            className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditingThread(false); setEditThreadForm({ title: thread.title || "", body: thread.body || "", tags: (thread.tags || []).join(", ") }); }} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">Cancel</button>
            <button type="button" onClick={handleSaveThread} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Save</button>
          </div>
        </div>
      ) : showDetails ? (
        <>
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
        </>
      ) : (
        <RichTextContent className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {thread.body}
        </RichTextContent>
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
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={showDetails}
        >
          {showDetails ? "Collapse" : "Expand"}
          {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground">{comment.author_name || "Guest"} </span>
                      <RichTextContent className="inline text-xs text-muted-foreground" inline>
                        {comment.message}
                      </RichTextContent>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                    {canEditCommunityRecord(user, comment, { forum: true }) && editingCommentId !== comment.id && (
                      <button
                        type="button"
                        onClick={() => { setEditingCommentId(comment.id); setCommentDraft(comment.message || ""); }}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Edit reply"
                        aria-label="Edit reply"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete reply"
                        aria-label="Delete reply"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    </div>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="mt-2 flex gap-2">
                      <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background/60 px-2 py-1 text-xs" />
                      <button type="button" onClick={() => handleSaveComment(comment)} className="text-primary" aria-label="Save reply"><Check className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setEditingCommentId("")} className="text-muted-foreground" aria-label="Cancel edit"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}
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
