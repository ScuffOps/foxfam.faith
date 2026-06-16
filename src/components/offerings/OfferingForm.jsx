import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { buildOfferingPayload, OFFERING_KIND_OPTIONS } from "@/lib/offerings";
import { getPublicDisplayName } from "@/lib/userIdentity";

const MAX_OFFERING_FILE_SIZE = 25 * 1024 * 1024;
const OFFERING_FILE_ACCEPT = "image/*,audio/*,video/*,.pdf,.txt,.md,.doc,.docx";
const initialForm = {
  title: "",
  kind: "fanart",
  creatorName: "",
  description: "",
  externalUrl: "",
};

function getFileSizeLabel(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OfferingForm({ open, onOpenChange, user, onCreated }) {
  const { toast } = useToast();
  const { profile } = useGuestProfile();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...initialForm,
      creatorName: getPublicDisplayName(user, profile.name || "Guest"),
    });
    setFile(null);
    setError("");
  }, [open, profile.name, user]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleFile = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (nextFile.size > MAX_OFFERING_FILE_SIZE) {
      setError("Please keep offering files under 25 MB for launch.");
      event.target.value = "";
      return;
    }
    setFile(nextFile);
    setError("");
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      let fileUrl = "";
      if (file) {
        const uploaded = await communityClient.integrations.Core.UploadFile({ file, folder: "offerings" });
        fileUrl = uploaded.file_url;
      }

      const payload = buildOfferingPayload({
        ...form,
        fileUrl,
        fileName: file?.name || "",
        fileType: file?.type || "",
      });

      await communityClient.entities.Offering.create(payload);
      setForm(initialForm);
      setFile(null);
      onCreated?.();
      onOpenChange(false);
      toast({
        title: "Offering submitted",
        description: "A mod or admin will approve it before it appears in the Shrine.",
      });
    } catch (submitError) {
      setError(submitError?.issues?.[0]?.message || "Offering could not be submitted. Please check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Offer Something to Veri</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Name the offering"
                className="mt-1.5 bg-secondary"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(value) => update("kind", value)}>
                <SelectTrigger className="mt-1.5 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Display name</Label>
            <Input
              value={form.creatorName}
              onChange={(event) => update("creatorName", event.target.value)}
              placeholder="Guest"
              className="mt-1.5 bg-secondary"
            />
          </div>

          <div>
            <Label>File</Label>
            <div className="mt-1.5 space-y-2">
              {file && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/45 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{getFileSizeLabel(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/35 px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground">
                <Upload className="h-4 w-4" />
                Upload fanart, song, edit, poem, or story
                <input type="file" accept={OFFERING_FILE_ACCEPT} className="hidden" onChange={handleFile} />
              </label>
            </div>
          </div>

          <div>
            <Label>External link</Label>
            <Input
              value={form.externalUrl}
              onChange={(event) => update("externalUrl", event.target.value)}
              placeholder="https://..."
              className="mt-1.5 bg-secondary"
            />
          </div>

          <div>
            <Label>Note / description</Label>
            <Textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Tell us what you made, what inspired it, or what Veri should know."
              className="mt-1.5 min-h-32 bg-secondary"
            />
          </div>

          {error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Sending...</> : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
