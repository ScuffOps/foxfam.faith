import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ReactQuill from "react-quill";

const CATEGORIES = [
  { value: "lore",        label: "📜 Lore" },
  { value: "milestone",   label: "🏆 Milestone" },
  { value: "inside_joke", label: "😂 Inside Joke" },
  { value: "faq",         label: "❓ FAQ" },
  { value: "other",       label: "📌 Other" },
];

const DEFAULT = { title: "", content: "", category: "lore", tags: [], cover_emoji: "" };

export default function CodexEntryForm({ open, onOpenChange, entry, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({ ...DEFAULT, ...entry });
      setTagInput("");
    } else {
      setForm(DEFAULT);
      setTagInput("");
    }
  }, [entry, open]);

  const addTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags.includes(tag)) setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tag) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{entry ? "Edit Entry" : "New Codex Entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Emoji + Title */}
          <div className="flex gap-3">
            <div className="w-20">
              <Label className="text-xs text-muted-foreground">Emoji</Label>
              <Input
                value={form.cover_emoji}
                onChange={(e) => setForm((f) => ({ ...f, cover_emoji: e.target.value }))}
                placeholder="📖"
                className="mt-1 text-center text-lg"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Entry title..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs text-muted-foreground">Category *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    form.category === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <Label className="text-xs text-muted-foreground">Content *</Label>
            <div className="mt-1 rounded-md overflow-hidden border border-border">
              <ReactQuill
                theme="snow"
                value={form.content}
                onChange={(val) => setForm((f) => ({ ...f, content: val }))}
                style={{ minHeight: 180 }}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs text-muted-foreground">Tags (press Enter or comma to add)</Label>
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground/80">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive ml-0.5">×</button>
                </span>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="e.g. veri, stream, 2024"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? "Saving..." : entry ? "Save Changes" : "Add to Codex"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}