import { useCallback, useEffect, useRef, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { AlertTriangle, Clipboard, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import { BUG_REPORT_DESCRIPTION, BUG_SEVERITY_LABELS, bugReportSchema, formatFileSize, getClientBugMetadata } from "@/lib/bugReport";
import { getPublicDisplayName } from "@/lib/userIdentity";

const AREA_OPTIONS = [
  "Dashboard",
  "Calendar",
  "Birthdays",
  "Community / Polls",
  "Codex",
  "Profile / Account",
  "Login / Auth",
  "Mobile view",
  "Other",
];

const DEVICE_OPTIONS = ["Desktop", "Laptop", "Phone", "Tablet"];
const BROWSER_OPTIONS = ["Opera", "Chrome", "Firefox", "Safari", "Edge", "Other"];
const RECURRENCE_OPTIONS = ["Yes", "Sometimes", "Only happened once", "Unsure"];

const INITIAL_FORM = {
  display_name: "",
  contact_handle: "",
  title: "",
  area: "",
  attempted_action: "",
  description: "",
  expected_behavior: "",
  severity: "medium",
  device: "",
  browser_name: "",
  recurrence: "",
  steps_to_reproduce: "",
  notes: "",
};

const FIELD_CLASS =
  "mt-1.5 border-white/10 bg-[#080a18]/75 font-mono text-[13px] text-slate-100 placeholder:text-slate-400/75 focus-visible:ring-violet-400";
const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-20 leading-relaxed`;

function getImageFiles(files) {
  return Array.from(files || []).filter((file) => file.type.startsWith("image/"));
}

function TerminalSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-[12px] font-bold uppercase tracking-[0.55em] text-slate-100">
        . ▰▰▰. {title}.
      </h3>
      <div className="space-y-3 pl-1 font-mono text-[13px] leading-relaxed text-slate-100">
        {children}
      </div>
    </section>
  );
}

function TerminalField({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block font-mono text-[13px] text-slate-100">ʚ·¦ {label} ··×</span>
      {children}
      {hint && <span className="mt-1 block pl-8 font-mono text-[12px] text-slate-400">— ʕ· {hint}〃</span>}
    </label>
  );
}

function ChoiceGrid({ label, options, value, onChange }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="font-mono text-[13px] text-slate-100">ʚ·¦ {label} ··×</legend>
      <div className="grid gap-1 pl-8 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected ? "" : option)}
              className={`w-full rounded-md px-2 py-1 text-left font-mono text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400 ${
                selected
                  ? "bg-violet-500/20 text-violet-100"
                  : "text-slate-200 hover:bg-white/5"
              }`}
              aria-pressed={selected}
            >
              — ʕ· [{selected ? "x" : " "}] {option}〃
            </button>
          );
        })}
      </div>
    </fieldset>
  );
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
        const { file_url } = await communityClient.integrations.Core.UploadFile({
          file,
          folder: "bug-reports",
        });
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
        variant: "destructive",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = bugReportSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check the bug report fields.");
      return;
    }

    setSaving(true);
    try {
      let submitterName = parsed.data.display_name || "Guest";
      try {
        const user = await communityClient.auth.me();
        submitterName = getPublicDisplayName(user, "Guest");
      } catch {
        if (!parsed.data.display_name && profile.name) {
          submitterName = profile.name + (profile.discordId ? ` (${profile.discordId})` : "");
        }
      }

      await communityClient.entities.BugReport.create({
        ...parsed.data,
        status: "open",
        screenshots: attachments,
        submitted_by_name: submitterName,
        ...getClientBugMetadata(),
      });

      setForm(INITIAL_FORM);
      setAttachments([]);
      setError("");
      onCreated?.();
      onOpenChange(false);
      toast({
        title: "Bug report submitted",
        description: "Logged in the tracker. The lore department has been notified.",
      });
    } catch (submitError) {
      console.error("Bug report submission failed", submitError);
      setError("Bug report could not be submitted. Please try again in a moment.");
      toast({
        title: "Bug report could not be submitted",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b0d1a]/95 p-0 text-slate-100 shadow-2xl sm:max-w-3xl">
        <div className="relative overflow-hidden rounded-lg">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.18),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,10,24,0.96))]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative space-y-5 p-5 sm:p-7">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm uppercase tracking-[0.45em] text-slate-100">
                Bug Report
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-300">
                {BUG_REPORT_DESCRIPTION}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <TerminalSection title="Who are you?">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TerminalField label="Display name" hint="your name / username">
                    <Input
                      value={form.display_name}
                      onChange={(event) => update("display_name", event.target.value)}
                      className={FIELD_CLASS}
                    />
                  </TerminalField>
                  <TerminalField label="Discord or Twitch username" hint="optional, but helpful">
                    <Input
                      value={form.contact_handle}
                      onChange={(event) => update("contact_handle", event.target.value)}
                      className={FIELD_CLASS}
                    />
                  </TerminalField>
                </div>
              </TerminalSection>

              <TerminalSection title="What broke?">
                <TerminalField label="Bug summary" hint="short scuff title">
                  <Input
                    value={form.title}
                    onChange={(event) => update("title", event.target.value)}
                    className={FIELD_CLASS}
                    required
                  />
                </TerminalField>

                <ChoiceGrid
                  label="Where did it happen?"
                  options={AREA_OPTIONS}
                  value={form.area}
                  onChange={(value) => update("area", value)}
                />

                <TerminalField label="What were you trying to do?" hint="what action were you taking before the scuff spawned?">
                  <Textarea
                    value={form.attempted_action}
                    onChange={(event) => update("attempted_action", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </TerminalField>

                <TerminalField label="What happened instead?" hint="what actually happened?">
                  <Textarea
                    value={form.description}
                    onChange={(event) => update("description", event.target.value)}
                    className={TEXTAREA_CLASS}
                    required
                  />
                </TerminalField>

                <TerminalField label="What should have happened?" hint="what did you expect to happen?">
                  <Textarea
                    value={form.expected_behavior}
                    onChange={(event) => update("expected_behavior", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </TerminalField>
              </TerminalSection>

              <TerminalSection title="Scuff level">
                <ChoiceGrid
                  label="How bad is it?"
                  options={Object.entries(BUG_SEVERITY_LABELS).map(([, label]) => label)}
                  value={BUG_SEVERITY_LABELS[form.severity]}
                  onChange={(label) => {
                    const match = Object.entries(BUG_SEVERITY_LABELS).find(([, optionLabel]) => optionLabel === label);
                    update("severity", match?.[0] || "medium");
                  }}
                />
              </TerminalSection>

              <TerminalSection title="Device details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceGrid
                    label="Device"
                    options={DEVICE_OPTIONS}
                    value={form.device}
                    onChange={(value) => update("device", value)}
                  />
                  <ChoiceGrid
                    label="Browser"
                    options={BROWSER_OPTIONS}
                    value={form.browser_name}
                    onChange={(value) => update("browser_name", value)}
                  />
                </div>

                <div>
                  <p className="font-mono text-[13px] text-slate-100">ʚ·¦ Screenshot / screen recording ··×</p>
                  <div
                    onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      uploadFiles(event.dataTransfer.files);
                    }}
                    className={`mt-2 rounded-lg border border-dashed p-5 text-center transition-colors ${
                      dragging ? "border-violet-300 bg-violet-500/15" : "border-white/15 bg-[#080a18]/75"
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
                    <ImagePlus className="mx-auto mb-2 h-7 w-7 text-violet-300" />
                    <p className="font-mono text-[13px] text-slate-100">— ʕ· drag/drop image/screen rec here if you have one〃</p>
                    <p className="mt-1 text-xs text-slate-400">Browser, OS, resolution, URL, and timestamp are captured automatically.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-3 gap-2 border-white/15 bg-white/5 font-mono hover:bg-white/10" onClick={() => inputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Uploading..." : "Choose images"}
                    </Button>
                    <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                      <Clipboard className="h-3 w-3" /> Paste works while this dialog is open.
                    </div>
                  </div>
                </div>
              </TerminalSection>

              <TerminalSection title="Can you repeat it?">
                <ChoiceGrid
                  label="Does it happen every time?"
                  options={RECURRENCE_OPTIONS}
                  value={form.recurrence}
                  onChange={(value) => update("recurrence", value)}
                />

                <TerminalField label="Steps to summon the bug" hint="1. / 2. / 3.">
                  <Textarea
                    value={form.steps_to_reproduce}
                    onChange={(event) => update("steps_to_reproduce", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </TerminalField>
              </TerminalSection>

              <TerminalSection title="Extra notes">
                <TerminalField label="Anything else?" hint="error messages, weird behavior, cursed vibes, or anything useful">
                  <Textarea
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                </TerminalField>
              </TerminalSection>

              {attachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {attachments.map((file, index) => (
                    <div key={`${file.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
                      <img src={file.url} alt="" className="h-12 w-16 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs text-slate-100">{file.name}</p>
                        <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                        className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                        aria-label="Remove screenshot"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-200">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <Button type="button" variant="outline" className="border-white/15 bg-white/5 font-mono hover:bg-white/10" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="font-mono" disabled={saving || uploading}>
                  {saving ? "Submitting..." : "Submit Bug"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
