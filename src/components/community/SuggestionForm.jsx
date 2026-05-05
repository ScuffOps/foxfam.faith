import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = [
  { value: "bug_report", label: "🐛 Bug Report" },
  { value: "feature_request", label: "✨ Feature Request" },
  { value: "community_event_idea", label: "🎉 Community Event Idea" },
  { value: "general_question", label: "❓ General Question" },
  { value: "content_idea", label: "📝 Content Idea" },
  { value: "design_feedback", label: "🎨 Design Feedback" },
  { value: "other_feedback", label: "💬 Other Feedback" },
];

export default function SuggestionForm({ open, onOpenChange, onCreated }) {
  const { profile } = useGuestProfile();
  const [form, setForm] = useState({ title: "", description: "", category: "other_feedback" });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);

    let submitterName = "Anonymous";
    if (!isAnonymous) {
      try {
        const user = await base44.auth.me();
        submitterName = user.display_name || user.full_name || user.email;
      } catch {
        if (profile?.name) submitterName = profile.name + (profile.discordId ? ` (${profile.discordId})` : "");
      }
    }

    await base44.entities.Suggestion.create({
      ...form,
      submitted_by_name: isAnonymous ? "Anonymous" : submitterName,
      is_anonymous: isAnonymous,
      status: "pending_review",
    });

    setSaving(false);
    setForm({ title: "", description: "", category: "other_feedback" });
    setIsAnonymous(false);
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Drop a Suggestion 📬</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Give it a short title..."
              className="mt-1.5 bg-secondary"
            />
          </div>
          <div>
            <Label>Details *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe your suggestion in as much detail as you'd like..."
              className="mt-1.5 bg-secondary resize-none"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
            <Switch id="anon" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            <Label htmlFor="anon" className="cursor-pointer text-sm text-muted-foreground">
              Submit anonymously
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.description.trim()}>
              {saving ? "Sending..." : "Send Suggestion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}