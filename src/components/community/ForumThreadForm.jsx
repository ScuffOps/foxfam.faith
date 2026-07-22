import { useEffect, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
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
import { formatUploadSize, getUploadValidationError } from "@/lib/uploadSafety";
import DraftStatus from "@/components/forms/DraftStatus";

const MAX_FORUM_ATTACHMENTS = 5;

const getInitialForm = (category = "general") => ({
  title: "",
  body: "",
  category: normalizeForumCategory(category),
  tags: "",
});

export default function ForumThreadForm({ open, onOpenChange, user, onCreated, defaultCategory = "general" }) {
  const { toast } = useToast();
  const [form, setForm, draftState] = usePersistentDraft("forum-thread.new", getInitialForm(defaultCategory));
  const { clearDraft } = draftState;
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm((current) => ({ ...current, category: normalizeForumCategory(defaultCategory) }));
  }, [defaultCategory, open]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleFiles = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (incomingFiles.length === 0) return;

    const availableSlots = MAX_FORUM_ATTACHMENTS - selectedFiles.length;
    if (availableSlots <= 0 || incomingFiles.length > availableSlots) {
      setAttachmentError(`Add up to ${MAX_FORUM_ATTACHMENTS} attachments per thread.`);
      return;
    }

    const invalidFile = incomingFiles.find((file) => getUploadValidationError(file));
    if (invalidFile) {
      setAttachmentError(getUploadValidationError(invalidFile));
      return;
    }

    setSelectedFiles((current) => [...current, ...incomingFiles]);
    setAttachmentError("");
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!form.title.trim() || !getRichTextPlainText(form.body)) return;
    setSaving(true);
    try {
      const attachments = await Promise.all(selectedFiles.map(async (file) => {
        const uploaded = await communityClient.integrations.Core.UploadFile({ file, folder: "forum-attachments" });
        return {
          url: uploaded.file_url,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        };
      }));

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
        attachments,
      });
      clearDraft(getInitialForm(defaultCategory));
      setSelectedFiles([]);
      setAttachmentError("");
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
        <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
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

          <div>
            <Label>Images and attachments</Label>
            <div className="mt-1.5 space-y-2">
              {selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/45 px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatUploadSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label={`Remove ${file.name}`}
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/35 px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground">
                <Upload className="h-4 w-4" />
                Add images or files
                <input type="file" multiple className="hidden" onChange={handleFiles} />
              </label>
              <p className="text-xs text-muted-foreground">Up to {MAX_FORUM_ATTACHMENTS} files, 25 MB each. Installers, executables, and scripts are blocked.</p>
              {attachmentError ? <p className="text-sm text-destructive">{attachmentError}</p> : null}
            </div>
          </div>

          <DraftStatus
            hasDraft={draftState.hasDraft}
            restored={draftState.wasRestored}
            hasUnsavedFiles={selectedFiles.length > 0}
            onDiscard={() => clearDraft(getInitialForm(defaultCategory))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !getRichTextPlainText(form.body)}>
              {saving ? "Uploading and starting..." : "Start Thread"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
