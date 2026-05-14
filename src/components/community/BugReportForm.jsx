import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Clipboard, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { BUG_SEVERITY_LABELS, bugReportSchema, formatFileSize, getClientBugMetadata } from "@/lib/bugReport";
import { getPublicDisplayName } from "@/lib/userIdentity";

const INITIAL_FORM = {
  title: "",
  description: "",
  steps_to_reproduce: "",
  expected_behavior: "",
  actual_behavior: "",
  severity: "medium",
};

function getImageFiles(files) {
  return Array.from(files || []).filter((file) => file.type.startsWith("image/"));
}

export default function BugReportForm({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const { profile } = useGuestProfile();
  const inputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [attachments, setAttachments] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  };

  const uploadFiles = useCallback(async (files) => {
    const images = getImageFiles(files);
    if (images.length === 0) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of images) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          url: file_url,
          name: file.name || "clipboard-image.png",
          type: file.type,
          size: file.size,
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch {
      toast({
        title: "Image upload failed",
        description: "The screenshot could not be attached. Try a smaller image or submit without it.",
      });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePaste = (event) => {
      const files = getImageFiles(event.clipboardData?.files);
      if (files.length > 0) {
        event.preventDefault();
        uploadFiles(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, uploadFiles]);

  const handleSubmit = async () => {
    const parsed = bugReportSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check the bug report fields.");
      return;
    }

    setSaving(true);
    try {
      let submitterName = "Anonymous";
      let submitterEmail = "";
      try {
        const user = await base44.auth.me();
        submitterName = getPublicDisplayName(user, user.email || "Member");
        submitterEmail = user.email || "";
      } catch {
        if (profile.name) submitterName = profile.name + (profile.discordId ? ` (${profile.discordId})` : "");
      }

      await base44.entities.BugReport.create({
        ...parsed.data,
        status: "open",
        screenshots: attachments,
        submitted_by_name: submitterName,
        submitted_by_email: submitterEmail,
        ...getClientBugMetadata(),
      });

      setForm(INITIAL_FORM);
      setAttachments([]);
      setError("");
      onCreated?.();
      onOpenChange(false);
      toast({
        title: "Bug report submitted",
        description: "Thank you. The little broken thing is now in the tracker.",
      });
    } catch {
      toast({
        title: "Bug report could not be submitted",
        description: "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Report a Bug</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="What broke?"
                className="mt-1.5 bg-secondary"
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(value) => update("severity", value)}>
                <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BUG_SEVERITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>What happened? *</Label>
            <Textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Tell us what you saw, clicked, expected, or summoned."
              className="mt-1.5 min-h-24 bg-secondary"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Steps</Label>
              <Textarea value={form.steps_to_reproduce} onChange={(event) => update("steps_to_reproduce", event.target.value)} className="mt-1.5 min-h-24 bg-secondary" />
            </div>
            <div>
              <Label>Expected</Label>
              <Textarea value={form.expected_behavior} onChange={(event) => update("expected_behavior", event.target.value)} className="mt-1.5 min-h-24 bg-secondary" />
            </div>
            <div>
              <Label>Actual</Label>
              <Textarea value={form.actual_behavior} onChange={(event) => update("actual_behavior", event.target.value)} className="mt-1.5 min-h-24 bg-secondary" />
            </div>
          </div>

          <div>
            <Label>Screenshots / screencaps</Label>
            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                uploadFiles(event.dataTransfer.files);
              }}
              className={`mt-1.5 rounded-xl border border-dashed p-5 text-center transition-colors ${
                dragging ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => uploadFiles(event.target.files)}
              />
              <ImagePlus className="mx-auto mb-2 h-7 w-7 text-primary" />
              <p className="text-sm font-medium">Drop images here, paste from clipboard, or browse.</p>
              <p className="mt-1 text-xs text-muted-foreground">Browser, OS, resolution, URL, and timestamp are captured automatically.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose images"}
              </Button>
              <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <Clipboard className="h-3 w-3" /> Paste works while this dialog is open.
              </div>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {attachments.map((file, index) => (
                <div key={`${file.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/35 p-2">
                  <img src={file.url} alt="" className="h-12 w-16 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>
              {saving ? "Submitting..." : "Submit Bug"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
