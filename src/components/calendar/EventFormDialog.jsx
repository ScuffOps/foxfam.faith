import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { pushEventToGoogle } from "@/functions/pushEventToGoogle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EVENT_CATEGORY_OPTIONS } from "@/lib/categoryColors";
import { ImagePlus, Loader2, X } from "lucide-react";

export default function EventFormDialog({ open, onOpenChange, event, onSaved }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title || "",
    description: event?.description || "",
    category: event?.category || "personal",
    start_date: event?.start_date ? event.start_date.slice(0, 16) : "",
    end_date: event?.end_date ? event.end_date.slice(0, 16) : "",
    all_day: event?.all_day || false,
    location: event?.location || "",
    image_url: event?.image_url || "",
    recurring: event?.recurring || false,
    recurrence_type: event?.recurrence_type || "none",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(event?.image_url || "");
  const [saving, setSaving] = useState(false);

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    update("image_url", "");
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date) return;
    setSaving(true);
    let imageUrl = form.image_url;
    if (imageFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      imageUrl = file_url;
    }
    const data = {
      ...form,
      image_url: imageUrl,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : new Date(form.start_date).toISOString(),
    };
    let savedEvent;
    if (isEdit) {
      await base44.entities.Event.update(event.id, data);
      savedEvent = { ...event, ...data };
    } else {
      savedEvent = await base44.entities.Event.create(data);
    }
    // Push to Google Calendar (best effort)
    try {
      const action = isEdit ? 'update' : 'create';
      const result = await pushEventToGoogle({ action, event: savedEvent });
      if (result?.data?.google_event_id && !savedEvent.google_event_id) {
        await base44.entities.Event.update(savedEvent.id, { google_event_id: result.data.google_event_id });
      }
    } catch {}
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Event title" className="mt-1.5 bg-secondary" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category.key} value={category.key}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.all_day} onCheckedChange={(v) => update("all_day", v)} />
            <Label>All-day event</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Start {form.all_day ? "Date" : "Date & Time"} *</Label>
              <Input type={form.all_day ? "date" : "datetime-local"} value={form.all_day ? form.start_date.slice(0, 10) : form.start_date} onChange={(e) => update("start_date", e.target.value)} className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>End {form.all_day ? "Date" : "Date & Time"}</Label>
              <Input type={form.all_day ? "date" : "datetime-local"} value={form.all_day ? (form.end_date || "").slice(0, 10) : form.end_date} onChange={(e) => update("end_date", e.target.value)} className="mt-1.5 bg-secondary" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Optional" className="mt-1.5 bg-secondary" />
          </div>
          <div>
            <Label>Event Image</Label>
            <div className="mt-1.5 space-y-2">
              {imagePreview && (
                <div className="relative overflow-hidden rounded-lg border border-border bg-secondary/50">
                  <img src={imagePreview} alt="Event preview" className="max-h-44 w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
                    title="Remove event image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <Input
                value={form.image_url}
                onChange={(e) => {
                  update("image_url", e.target.value);
                  setImagePreview(e.target.value);
                  setImageFile(null);
                }}
                placeholder="https://... or upload below"
                className="bg-secondary"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground">
                <ImagePlus className="h-4 w-4" />
                Upload event image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              </label>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional" className="mt-1.5 bg-secondary" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.recurring} onCheckedChange={(v) => update("recurring", v)} />
            <Label>Recurring</Label>
          </div>
          {form.recurring && (
            <div>
              <Label>Recurrence</Label>
              <Select value={form.recurrence_type} onValueChange={(v) => update("recurrence_type", v)}>
                <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.start_date}>
              {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
