import { useState } from "react";
import { base44 } from "@/api/base44Client";
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

export default function PostForm({ open, onOpenChange, onCreated, isMod = false }) {
  const checkLevelUp = useLevelUpToast();
  const { profile } = useGuestProfile();
  const [form, setForm] = useState({ title: "", description: "", type: "idea" });
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    let submitterName = "Anonymous";
    let submitterEmail = "";
    try {
      const user = await base44.auth.me();
      submitterName = getPublicDisplayName(user, user.email || "Member");
      submitterEmail = user.email || "";
    } catch {
      if (profile.name) submitterName = profile.name + (profile.discordId ? ` (${profile.discordId})` : "");
    }

    const data = {
      ...form,
      status: "pending",
      submitted_by_name: submitterName,
      submitted_by_email: submitterEmail,
      upvotes: 0,
      upvoted_by: [],
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

    await base44.entities.CommunityPost.create(data);
    try { const u = await base44.auth.me(); awardPoints(u, "submit_post").then(checkLevelUp); } catch {}
    setSaving(false);
    setForm({ title: "", description: "", type: "idea" });
    setPollOptions(["", ""]);
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">New Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">Idea / Suggestion</SelectItem>
                {isMod && <SelectItem value="poll">Poll</SelectItem>}
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setPollOptions([...pollOptions, ""])}>
                  <Plus className="h-3 w-3" /> Add Option
                </Button>
                <p className="text-[10px] text-muted-foreground">Poll options support light Markdown too.</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title}>
              {saving ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
