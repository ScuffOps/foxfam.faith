import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../GlassCard";
import { Cake, Send } from "lucide-react";

export default function BirthdaySubmitForm({ onSubmitted }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    display_name: "",
    birthday_date: "",
    note: "",
    is_private: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.display_name || !form.birthday_date) return;
    setSubmitting(true);
    let submitterName = "Anonymous";
    let submitterEmail = "";
    try {
      const user = await base44.auth.me();
      submitterName = user.full_name || user.email;
      submitterEmail = user.email;
    } catch {}
    await base44.entities.Birthday.create({
      ...form,
      status: "pending",
      submitted_by_name: submitterName,
      submitted_by_email: submitterEmail,
    });
    toast({ title: "Birthday submitted!", description: "It will appear after approval." });
    setForm({ display_name: "", birthday_date: "", note: "", is_private: false });
    setSubmitting(false);
    onSubmitted?.();
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <GlassCard>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/15">
          <Cake className="h-4 w-4 text-chart-5" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Submit a Birthday</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Display Name *</Label>
          <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="Who's birthday?" className="mt-1 bg-secondary" />
        </div>
        <div>
          <Label>Birthday Date *</Label>
          <Input type="date" value={form.birthday_date} onChange={(e) => update("birthday_date", e.target.value)} className="mt-1 bg-secondary" />
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Favorite gift ideas, fun fact..." className="mt-1 bg-secondary" rows={2} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_private} onCheckedChange={(v) => update("is_private", v)} />
          <Label className="text-sm">Keep year/age private</Label>
        </div>
        <Button type="submit" className="w-full gap-2" disabled={submitting || !form.display_name || !form.birthday_date}>
          <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Birthday"}
        </Button>
      </form>
    </GlassCard>
  );
}