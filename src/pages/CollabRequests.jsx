import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import { Send, Users, Clock, Gamepad2, MessageSquareMore, CheckCircle, XCircle, Hourglass } from "lucide-react";

const DURATION_OPTIONS = ["30 min", "1 hour", "1.5 hours", "2 hours", "2+ hours", "TBD"];

const STATUS_STYLES = {
  pending: { label: "Pending", icon: Hourglass, cls: "text-warning bg-warning/10 border-warning/20" },
  approved: { label: "Approved", icon: CheckCircle, cls: "text-success bg-success/10 border-success/20" },
  rejected: { label: "Rejected", icon: XCircle, cls: "text-destructive bg-destructive/10 border-destructive/20" },
};

export default function CollabRequests() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    game_category: "",
    estimated_duration: "",
    description: "",
    shared_chat: false,
    extra_info: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
    } catch {}
    const all = await base44.entities.CollabRequest.list("-created_date", 100);
    setRequests(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isCreator = user?.role === "creator";
  const isMod = user?.role === "mod" || user?.role === "admin";

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.game_category.trim() || !form.description.trim()) {
      toast({ title: "Please fill in the required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await base44.entities.CollabRequest.create({
      ...form,
      submitted_by_name: user?.display_name || user?.full_name || "",
      status: "pending",
    });
    toast({ title: "✦ Collab request submitted!", description: "The mod team will review it shortly." });
    setForm({ game_category: "", estimated_duration: "", description: "", shared_chat: false, extra_info: "" });
    loadData();
    setSubmitting(false);
  };

  const handleStatus = async (id, status) => {
    await base44.entities.CollabRequest.update(id, { status });
    toast({ title: `Request ${status}.` });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Collab Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isCreator ? "Submit a collab request to stream with Veri." : isMod ? "Review incoming collab requests." : "You need the Creator role to submit collab requests."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form — only for Creators */}
        {isCreator && (
          <div className="lg:col-span-2">
            <GlassCard>
              <h2 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> New Request
              </h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Game / Stream Category <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.game_category}
                    onChange={(e) => handleChange("game_category", e.target.value)}
                    placeholder="e.g. Minecraft, Just Chatting..."
                    className="mt-1 bg-secondary/50"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3 w-3" /> Estimated Duration</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => handleChange("estimated_duration", d)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
                          form.estimated_duration === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Brief Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="What's the vibe? What would you like to do together?"
                    className="mt-1 bg-secondary/50 resize-none min-h-[80px]"
                    maxLength={300}
                  />
                </div>

                {/* Shared Chat Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquareMore className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">Shared Chat</p>
                      <p className="text-[10px] text-muted-foreground">Combine both chats during the stream</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleChange("shared_chat", !form.shared_chat)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${form.shared_chat ? "bg-primary" : "bg-border"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.shared_chat ? "translate-x-4" : ""}`} />
                  </button>
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Gamepad2 className="h-3 w-3" /> Extra Ideas / Exciting Info</Label>
                  <Textarea
                    value={form.extra_info}
                    onChange={(e) => handleChange("extra_info", e.target.value)}
                    placeholder="Any fun ideas, special segments, or things that make this unique?"
                    className="mt-1 bg-secondary/50 resize-none min-h-[70px]"
                    maxLength={500}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                  <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Request List */}
        <div className={isCreator ? "lg:col-span-3" : "lg:col-span-5"}>
          {requests.length === 0 ? (
            <GlassCard>
              <p className="text-center text-sm text-muted-foreground py-6">No collab requests yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const s = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                const Icon = s.icon;
                return (
                  <GlassCard key={req.id}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-heading text-sm font-semibold">{req.game_category}</span>
                          {req.estimated_duration && (
                            <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{req.estimated_duration}</span>
                          )}
                          {req.shared_chat && (
                            <span className="text-[10px] rounded-full bg-accent/10 border border-accent/20 text-accent px-2 py-0.5">Shared Chat</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
                        {req.extra_info && (
                          <p className="text-xs text-muted-foreground/70 italic mb-2">"{req.extra_info}"</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          by {req.submitted_by_name || "Creator"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                          <Icon className="h-3 w-3" /> {s.label}
                        </span>
                        {isMod && req.status === "pending" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleStatus(req.id, "approved")} className="rounded px-2 py-1 text-xs bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors">Approve</button>
                            <button onClick={() => handleStatus(req.id, "rejected")} className="rounded px-2 py-1 text-xs bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}