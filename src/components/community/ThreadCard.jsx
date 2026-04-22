import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUp, MessageSquare, ChevronDown, ChevronUp, Send, Pin, Lock } from "lucide-react";
import GlassCard from "../GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_COLORS = {
  general: "text-muted-foreground bg-secondary",
  prayer: "text-chart-5 bg-chart-5/15",
  blessings: "text-chart-3 bg-chart-3/15",
  gaming: "text-accent bg-accent/15",
  creative: "text-chart-4 bg-chart-4/15",
};

export default function ThreadCard({ thread, user, isAdmin, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const hasUpvoted = (thread.upvoted_by || []).includes(user?.email);

  const toggleReplies = async () => {
    if (!open) {
      setLoadingReplies(true);
      const data = await base44.entities.ThreadReply.filter({ thread_id: thread.id });
      setReplies(data.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      setLoadingReplies(false);
    }
    setOpen((p) => !p);
  };

  const handleUpvote = async () => {
    if (!user?.email) return;
    const upvotedBy = thread.upvoted_by || [];
    await base44.entities.Thread.update(thread.id, {
      upvotes: hasUpvoted ? Math.max((thread.upvotes || 0) - 1, 0) : (thread.upvotes || 0) + 1,
      upvoted_by: hasUpvoted ? upvotedBy.filter((e) => e !== user.email) : [...upvotedBy, user.email],
    });
    onRefresh();
  };

  const handleReply = async () => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    const authorName = user?.display_name || user?.full_name || "Member";
    await base44.entities.ThreadReply.create({
      thread_id: thread.id,
      body: replyText.trim(),
      author_name: authorName,
      upvotes: 0,
      upvoted_by: [],
    });
    await base44.entities.Thread.update(thread.id, {
      reply_count: (thread.reply_count || 0) + 1,
    });
    setReplyText("");
    setPosting(false);
    // Refresh replies
    const data = await base44.entities.ThreadReply.filter({ thread_id: thread.id });
    setReplies(data.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    onRefresh();
  };

  const handlePin = async () => {
    await base44.entities.Thread.update(thread.id, { is_pinned: !thread.is_pinned });
    onRefresh();
  };

  const handleClose = async () => {
    await base44.entities.Thread.update(thread.id, { status: thread.status === "open" ? "closed" : "open" });
    onRefresh();
  };

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Upvote */}
        <button
          onClick={handleUpvote}
          disabled={!user?.email}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors shrink-0 ${
            hasUpvoted ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <ArrowUp className="h-4 w-4" />
          <span className="text-xs font-bold">{thread.upvotes || 0}</span>
        </button>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {thread.is_pinned && <Pin className="h-3.5 w-3.5 text-chart-4 shrink-0" />}
            <h4 className="font-semibold text-sm leading-snug">{thread.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_COLORS[thread.category] || CATEGORY_COLORS.general}`}>
              {thread.category}
            </span>
            {thread.status === "closed" && (
              <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                <Lock className="h-2.5 w-2.5" /> Closed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{thread.body}</p>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">by {thread.author_name || "Anonymous"}</span>
            <button
              onClick={toggleReplies}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {thread.reply_count || 0} {thread.reply_count === 1 ? "reply" : "replies"}
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {isAdmin && (
              <>
                <button onClick={handlePin} className="text-xs text-chart-4 hover:underline">
                  {thread.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={handleClose} className="text-xs text-destructive hover:underline">
                  {thread.status === "closed" ? "Reopen" : "Close"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Replies section */}
      {open && (
        <div className="border-t border-border pt-3 space-y-3">
          {loadingReplies ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No replies yet. Be first!</p>
          ) : (
            <div className="space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="rounded-lg bg-secondary/40 px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{r.author_name || "Member"}</p>
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}
            </div>
          )}

          {user?.email && thread.status === "open" && (
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="text-sm resize-none bg-secondary/50"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleReply(); }}
              />
              <Button size="icon" onClick={handleReply} disabled={posting || !replyText.trim()} className="shrink-0 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}