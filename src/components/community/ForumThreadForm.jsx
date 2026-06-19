import { useEffect, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { getRichTextPlainText } from "@/components/RichTextContent";
import { FORUM_SECTIONS, normalizeForumCategory } from "@/lib/forumSections";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { useToast } from "@/components/ui/use-toast";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";

const getInitialForm = (category = "general") => ({
  title: "",
  body: "",
  category: normalizeForumCategory(category),
  tags: "",
});

export default function ForumThreadForm({ open, onOpenChange, user, onCreated, defaultCategory = "general" }) {
  const { toast } = useToast();
  const [form, setForm, { clearDraft }] = usePersistentDraft("forum-thread.new", getInitialForm(defaultCategory));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm((current) => ({ ...current, category: normalizeForumCategory(defaultCategory) }));
  }, [defaultCategory, open]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !getRichTextPlainText(form.body)) return;
    setSaving(true);
    try {
      await communityClient.entities.CommunityThread.create({
        title: form.title.trim(),
        body: form.body,
        category: normalizeForumCategory(form.category),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        author_name: getPublicDisplayName(user, "Guest"),
        comment_count: 0,
        reactions: 0,
        reacted_by: [],
        is_locked: false,
      });
      clearDraft(getInitialForm(defaultCategory));
      onCreated?.();
      onOpenChange(false);
      toast({ title: "Thread started", description: "Your forum thread is live." });
    } catch {
      toast({
        title: "Thread could not be started",
        description: "Your role may need forum access, or Supabase rejected the submission. Please try again.",
      });
    } finally {
      setSaving(false);
    }
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
              <Label>Subforum</Label>
              <Select value={form.category} onValueChange={(value) => update("category", value)}>
                <SelectTrigger className="mt-1.5 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORUM_SECTIONS.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
