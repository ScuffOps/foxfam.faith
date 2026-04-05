import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
    recurring: event?.recurring || false,
    recurrence_type: event?.recurrence_type || "none",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.start_date) return;
    setSaving(true);
    const data = {
      ...form,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : new Date(form.start_date).toISOString(),
    };
    if (isEdit) {
      await base44.entities.Event.update(event.id, data);
    } else {
      await base44.entities.Event.create(data);
    }
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
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="collabs">Collabs / Appointments</SelectItem>
                <SelectItem value="birthdays">Birthdays</SelectItem>
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
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}