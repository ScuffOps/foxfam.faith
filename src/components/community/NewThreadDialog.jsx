import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["general", "prayer", "blessings", "gaming", "creative"];

export default function NewThreadDialog({ open, onOpenChange, user, onCreated }) {
  const [form, setForm] = useState({ title: "", body: "", category: "general" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    const authorName = user?.display_name || user?.full_name || "Member";
    await base44.entities.Thread.create({
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      author_name: authorName,
      reply_count: 0,
      upvotes: 0,
      upvoted_by: [],
      is_pinned: false,
      status: "open",
    });
    setSaving(false);
    setForm({ title: "", body: "", category: "general" });
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Start a Discussion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What do you want to discuss?"
              className="mt-1.5 bg-secondary"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger className="mt-1.5 bg-secondary capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opening Message *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Share your thoughts to kick off the discussion..."
              rows={4}
              className="mt-1.5 bg-secondary resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving ? "Posting..." : "Start Thread"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}