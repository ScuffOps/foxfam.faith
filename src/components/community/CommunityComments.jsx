import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Send, Sparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import RichTextContent from "@/components/RichTextContent";
import { getCommunityActorKey } from "@/lib/communityActor";
import { getPublicDisplayName } from "@/lib/userIdentity";

function sortOldest(items = []) {
  return [...items].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
}

function buildCommentTree(comments = []) {
  const parents = [];
  const repliesByParent = new Map();

  for (const comment of sortOldest(comments)) {
    if (comment.parent_comment_id) {
      const replies = repliesByParent.get(comment.parent_comment_id) || [];
      replies.push(comment);
      repliesByParent.set(comment.parent_comment_id, replies);
    } else {
      parents.push(comment);
    }
  }

  return parents.map((comment) => ({
    ...comment,
    replies: repliesByParent.get(comment.id) || [],
  }));
}

export default function CommunityComments({ post, user, onRefresh }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyParentId, setReplyParentId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvotingId, setUpvotingId] = useState("");
  const actorKey = getCommunityActorKey(user);
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  async function loadComments() {
    setLoading(true);
    try {
      const rows = await communityClient.entities.CommunityPostComment.filter({ post_id: post.id });
      setComments(sortOldest(rows));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && comments.length === 0) void loadComments();
  }

  async function createComment(parentId = "") {
    const text = (parentId ? replyText : commentText).trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      let actorName = "Guest";
      try {
        const currentUser = await communityClient.auth.me();
        actorName = getPublicDisplayName(currentUser, "Guest");
      } catch {
        actorName = getPublicDisplayName(user, "Guest");
      }

      await communityClient.entities.CommunityPostComment.create({
        post_id: post.id,
        parent_comment_id: parentId || "",
        message: text,
        author_name: actorName,
        upvotes: 0,
        upvoted_by: [],
      });
      await communityClient.entities.CommunityPost.update(post.id, {
        comment_count: (post.comment_count || 0) + 1,
      });
      setCommentText("");
      setReplyText("");
      setReplyParentId("");
      setOpen(true);
      await loadComments();
      onRefresh?.();
    } catch {
      toast({
        title: parentId ? "Reply could not be posted" : "Comment could not be posted",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUpvote(comment) {
    if (upvotingId) return;
    setUpvotingId(comment.id);
    try {
      const updated = await communityClient.community.toggleCommentUpvote(comment.id, actorKey);
      setComments((current) => current.map((item) => item.id === comment.id ? updated : item));
    } catch {
      toast({
        title: "Reply praise could not be saved",
        description: "Refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setUpvotingId("");
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Comment
        <span className="font-semibold">{post.comment_count || comments.length || 0}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {loading ? (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : commentTree.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No comments yet. Start the chorus.</p>
          ) : (
            commentTree.map((comment) => (
              <CommentNode
                key={comment.id}
                actorKey={actorKey}
                comment={comment}
                onReply={() => setReplyParentId(replyParentId === comment.id ? "" : comment.id)}
                onSubmitReply={() => createComment(comment.id)}
                onToggleUpvoteComment={toggleUpvote}
                replyOpen={replyParentId === comment.id}
                replyText={replyText}
                setReplyText={setReplyText}
                submitting={submitting}
                upvoting={upvotingId === comment.id}
              />
            ))
          )}

          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && createComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="button" size="icon" onClick={() => createComment()} disabled={!commentText.trim() || submitting} aria-label="Post comment">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentNode({
  actorKey,
  comment,
  onReply,
  onSubmitReply,
  onToggleUpvoteComment,
  replyOpen,
  replyText,
  setReplyText,
  submitting,
  upvoting,
}) {
  const hasUpvoted = (comment.upvoted_by || []).includes(actorKey);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
          {(comment.author_name || "G")[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 rounded-lg bg-secondary/50 px-3 py-2">
          <span className="text-xs font-semibold text-foreground">{comment.author_name || "Guest"} </span>
          <RichTextContent className="inline text-xs text-muted-foreground" inline>
            {comment.message}
          </RichTextContent>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onReply} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
              Reply
            </button>
            <button
              type="button"
              onClick={() => onToggleUpvoteComment(comment)}
              disabled={upvoting}
              className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                hasUpvoted ? "text-chart-4" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {comment.upvotes || 0}
            </button>
          </div>
        </div>
      </div>

      {replyOpen && (
        <div className="ml-8 flex gap-2">
          <input
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && onSubmitReply()}
            placeholder="Reply..."
            className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button type="button" size="icon" onClick={onSubmitReply} disabled={!replyText.trim() || submitting} aria-label="Post reply">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="ml-8 space-y-2 border-l border-border pl-3">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              actorKey={actorKey}
              comment={reply}
              onReply={onReply}
              onSubmitReply={onSubmitReply}
              onToggleUpvoteComment={onToggleUpvoteComment}
              replyOpen={false}
              replyText=""
              setReplyText={() => {}}
              submitting={submitting}
              upvoting={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
