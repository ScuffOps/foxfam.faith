import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { getRichTextPlainText } from "@/components/RichTextContent";
import { getPublicDisplayName } from "@/lib/userIdentity";

const initialForm = {
  title: "",
  body: "",
  category: "general",
  tags: "",
};

export default function ForumThreadForm({ open, onOpenChange, user, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !getRichTextPlainText(form.body)) return;
    setSaving(true);
    await base44.entities.CommunityThread.create({
      title: form.title.trim(),
      body: form.body,
      category: form.category.trim() || "general",
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      author_name: getPublicDisplayName(user, "Favored Fox"),
      author_email: user?.email || "",
      comment_count: 0,
      reactions: 0,
      reacted_by: [],
      is_locked: false,
    });
    setSaving(false);
    setForm(initialForm);
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">New Forum Thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Start a discussion..." className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="general" className="mt-1.5 bg-secondary" />
            </div>
          </div>

          <div>
            <Label>Thread *</Label>
            <RichTextEditor
              value={form.body}
              onChange={(value) => update("body", value)}
              placeholder="Start the thread with formatting, lists, links, or a quote..."
              minHeight={170}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <Input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="comma, separated, tags" className="mt-1.5 bg-secondary" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim() || !getRichTextPlainText(form.body)}>
              {saving ? "Starting..." : "Start Thread"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
