import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { ArchiveRestore, BarChart3, CalendarPlus, Check, ChevronDown, ChevronUp, Edit3, Lock, X } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "../StatusBadge";
import GlassCard from "../GlassCard";
import RichTextContent from "../RichTextContent";
import { getCommunityActorKey } from "@/lib/communityActor";
import { canEditCommunityRecord } from "@/lib/editPermissions";
import CommunityComments from "@/components/community/CommunityComments";

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function getPollAccent(user) {
  const accent = String(user?.accent_color || "").trim();
  if (HEX_COLOR_RE.test(accent)) return accent;
  return "#31d7ff";
}

export default function PollCard({ post, isAdmin, user, onRefresh }) {
  const checkLevelUp = useLevelUpToast();
  const { toast } = useToast();
  const [voting, setVoting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: post.title || "",
    description: post.description || "",
  });
  const actorKey = getCommunityActorKey(user);
  const options = post.poll_options || [];
  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0);
  const userVotedOption = options.find((o) => (o.voted_by || []).includes(actorKey));
  const leadOption = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
  const accent = getPollAccent(user);
  const canEdit = canEditCommunityRecord(user, post);

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;
    await communityClient.entities.CommunityPost.update(post.id, {
      title: editForm.title.trim(),
      description: editForm.description,
      edited_at: new Date().toISOString(),
    });
    setEditing(false);
    onRefresh();
  };

  const handleVote = async (optionId) => {
    if (voting || userVotedOption) return;
    setVoting(true);
    try {
      checkLevelUp(await awardPoints(user, "vote-poll", post.id, optionId));
      onRefresh();
    } catch {
      toast({
        title: "Vote could not be counted",
        description: "Please make sure you are signed in and try again.",
      });
    } finally {
      setVoting(false);
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
    const topOption = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
    await communityClient.entities.Event.create({
      title: `${post.title}${topOption ? ` - ${topOption.text}` : ""}`,
      description: post.description || "",
      category: "community",
      start_date: new Date().toISOString(),
      status: "active",
    });
    await communityClient.entities.CommunityPost.update(post.id, { status: "converted" });
    onRefresh();
  };
  const handleClose = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "closed" });
    onRefresh();
  };
  const handleReopen = async () => {
    await communityClient.entities.CommunityPost.update(post.id, { status: "approved" });
    onRefresh();
  };

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-chart-2/15">
            <BarChart3 className="h-3.5 w-3.5 text-chart-2" />
          </div>
          {editing ? (
            <Input value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="h-8 bg-secondary/60" />
          ) : (
            <h4 className="font-medium">{post.title}</h4>
          )}
          <StatusBadge status={post.status} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canEdit && !editing && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} aria-label="Edit poll">
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "Open"}
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
          <Textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 bg-secondary/60 text-sm" />
          <div className="space-y-2">
            {options.map((option, index) => (
              <Input
                key={option.id || index}
                value={option.text}
                disabled
                title="Poll option labels cannot be edited here"
                className="bg-secondary/60"
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditForm({ title: post.title || "", description: post.description || "" }); }}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={!editForm.title.trim()}>Save</Button>
          </div>
        </div>
      ) : post.description && (
        <RichTextContent className="mt-2 text-sm text-muted-foreground" inline={false}>
          {post.description}
        </RichTextContent>
      )}
      {!expanded && leadOption && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-lg border px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5"
          style={{
            borderColor: `${accent}80`,
            background: `linear-gradient(90deg, ${accent}33, rgba(15,23,42,0.36))`,
            boxShadow: `0 0 24px ${accent}22`,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Currently leading</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              <RichTextContent inline>{leadOption.text}</RichTextContent>
            </span>
            <span className="shrink-0 rounded-full bg-background/70 px-2 py-1 text-xs font-bold text-foreground">
              {leadOption.votes || 0} votes
            </span>
          </div>
        </button>
      )}

      <div className="mt-3 space-y-2">
        {(expanded ? options : []).map((opt) => {
          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
          const isVoted = userVotedOption?.id === opt.id;
          const isLead = leadOption?.id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={!!userVotedOption}
              className="relative w-full overflow-hidden rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-left transition-colors hover:border-primary/30 disabled:cursor-default"
              style={isLead ? { borderColor: `${accent}90` } : undefined}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{ width: `${pct}%`, background: isLead ? `${accent}2e` : "hsl(var(--primary) / 0.1)" }}
              />
              <div className="relative flex items-center justify-between">
                <span className={`text-sm ${isVoted ? "font-semibold text-primary" : ""}`}>
                  <RichTextContent inline>{opt.text}</RichTextContent>
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {opt.votes || 0} votes ({pct}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {totalVotes} total votes · by {post.submitted_by_name || "Guest"}
        </span>
        <div className="flex gap-1">
          {isAdmin && post.status === "pending" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-success hover:bg-success/10" onClick={handleApprove}>
                <Check className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={handleReject}>
                <X className="h-3 w-3" /> Reject
              </Button>
            </>
          )}
          {isAdmin && post.status === "approved" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={handleConvert}>
              <CalendarPlus className="h-3 w-3" /> Convert to Event
            </Button>
          )}
          {isAdmin && ["approved", "converted"].includes(post.status) && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:bg-secondary" onClick={handleClose}>
              <Lock className="h-3 w-3" /> Close
            </Button>
          )}
          {isAdmin && post.status === "closed" && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-primary hover:bg-primary/10" onClick={handleReopen}>
              <ArchiveRestore className="h-3 w-3" /> Reopen
            </Button>
          )}
        </div>
      </div>
      <CommunityComments post={post} user={user} onRefresh={onRefresh} />
    </GlassCard>
  );
}
