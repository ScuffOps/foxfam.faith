import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const initialForm = {
  title: "",
  subtitle: "",
  mood: "",
  tags: "",
  body: "",
};

function toForm(entry) {
  if (!entry) return initialForm;
  return {
    title: entry.title || "",
    subtitle: entry.subtitle || "",
    mood: entry.mood || "",
    tags: (entry.tags || []).join(", "),
    body: entry.body || "",
  };
}

export default function ReliquaryForm({ open, onOpenChange, user, entry, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(entry?.id);

  useEffect(() => {
    if (open) setForm(toForm(entry));
  }, [entry, open]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      mood: form.mood.trim(),
      body: form.body.trim(),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      author_name: user?.display_name || user?.full_name || "Veri",
      is_published: true,
    };

    if (isEditing) {
      await base44.entities.ReliquaryEntry.update(entry.id, payload);
    } else {
      await base44.entities.ReliquaryEntry.create({
        ...payload,
        comment_count: 0,
      });
    }

    setSaving(false);
    setForm(initialForm);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? "Edit Reliquary Post" : "New Reliquary Post"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Poem title" className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Mood</Label>
              <Input value={form.mood} onChange={(e) => update("mood", e.target.value)} placeholder="moonlit, tender, haunted..." className="mt-1.5 bg-secondary" />
            </div>
          </div>

          <div>
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Optional line under the title" className="mt-1.5 bg-secondary" />
          </div>

          <div>
            <Label>Tags</Label>
            <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="comma, separated, tags" className="mt-1.5 bg-secondary" />
          </div>

          <div>
            <Label>Poem / Entry *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              placeholder="Markdown supported: line breaks, **bold**, _italic_, links, lists..."
              className="mt-1.5 min-h-[220px] resize-y bg-secondary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Markdown supported for poems and notes.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : isEditing ? "Update Post" : "Place in Reliquary"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
