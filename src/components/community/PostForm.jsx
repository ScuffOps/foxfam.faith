import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { Plus, X } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";
import { useLevelUpToast } from "@/hooks/useLevelUpToast";
import { useToast } from "@/components/ui/use-toast";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import DraftStatus from "@/components/forms/DraftStatus";

const INITIAL_POST = { title: "", description: "", type: "idea" };
const INITIAL_POLL_OPTIONS = { options: ["", ""] };

export default function PostForm({ open, onOpenChange, onCreated, isMod = false }) {
  const checkLevelUp = useLevelUpToast();
  const { toast } = useToast();
  const { profile } = useGuestProfile();
  const [form, setForm, postDraft] = usePersistentDraft("community-post.new", INITIAL_POST);
  const [pollDraft, setPollDraft, pollOptionsDraft] = usePersistentDraft("community-poll-options.new", INITIAL_POLL_OPTIONS);
  const { clearDraft: clearPostDraft } = postDraft;
  const { clearDraft: clearPollDraft } = pollOptionsDraft;
  const pollOptions = pollDraft.options;
  const setPollOptions = (nextOptions) => {
    setPollDraft((current) => ({
      ...current,
      options: typeof nextOptions === "function" ? nextOptions(current.options) : nextOptions,
    }));
  };
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!form.title) return;
    setSaving(true);
    try {
      let submitterName = "Guest";
      try {
        const user = await communityClient.auth.me();
        submitterName = getPublicDisplayName(user, "Guest");
      } catch {
        if (profile.name) submitterName = profile.name + (profile.discordId ? ` (${profile.discordId})` : "");
      }

      const data = {
        ...form,
        status: isMod && form.type === "update" ? "approved" : "pending",
        submitted_by_name: submitterName,
        upvotes: 0,
        upvoted_by: [],
        comment_count: 0,
      };

      if (form.type === "poll") {
        data.poll_options = pollOptions
          .filter((o) => o.trim())
          .map((text, i) => ({
            id: `opt_${i}_${Date.now()}`,
            text,
            votes: 0,
            voted_by: [],
          }));
      }

      await communityClient.entities.CommunityPost.create(data);
      try { const u = await communityClient.auth.me(); awardPoints(u, "submit_post").then(checkLevelUp); } catch {}
      clearPostDraft(INITIAL_POST);
      clearPollDraft(INITIAL_POLL_OPTIONS);
      onCreated?.();
      onOpenChange(false);
      toast({ title: "Post submitted", description: "Your post is in the community queue." });
    } catch {
      toast({
        title: "Post could not be submitted",
        description: "Please check the fields and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">New Post</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea / Suggestion</SelectItem>
                {isMod && <SelectItem value="poll">Poll</SelectItem>}
                {isMod && <SelectItem value="update">Community Update</SelectItem>}
                <SelectItem value="feedback">Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="What's on your mind?" className="mt-1.5 bg-secondary" />
          </div>
          <div>
            <Label>Description</Label>
            <RichTextEditor
              value={form.description}
              onChange={(value) => update("description", value)}
              placeholder="Add context, links, lists, or a little emphasis..."
              minHeight={120}
            />
          </div>
          {form.type === "poll" && (
            <div>
              <Label>Poll Options</Label>
              <div className="mt-1.5 space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1} — Markdown ok`}
                      className="bg-secondary"
                    />
                    {pollOptions.length > 2 && (
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setPollOptions([...pollOptions, ""])}>
                  <Plus className="h-3 w-3" /> Add Option
                </Button>
                <p className="text-[10px] text-muted-foreground">Poll options support light Markdown too.</p>
              </div>
            </div>
          )}
          <DraftStatus
            hasDraft={postDraft.hasDraft || pollOptionsDraft.hasDraft}
            restored={postDraft.wasRestored || pollOptionsDraft.wasRestored}
            onDiscard={() => {
              clearPostDraft(INITIAL_POST);
              clearPollDraft(INITIAL_POLL_OPTIONS);
            }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title}>
              {saving ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
