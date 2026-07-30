import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import DateTimeFields from "@/components/ui/date-time-fields";
import GlassCard from "../components/GlassCard";
import { Archive, ArchiveRestore, Edit3, Send, Users, Clock, Gamepad2, MessageSquareMore, CheckCircle, XCircle, Hourglass, Link2, Trash2 } from "lucide-react";
import { canBookCollab, canManageRoles, canModerate } from "@/lib/roles";
import { getPublicDisplayName } from "@/lib/userIdentity";
import PublicAvatar from "@/components/PublicAvatar";
import { getRecordAuthorAvatar, getRecordAuthorName } from "@/lib/publicAuthor";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";

const DURATION_OPTIONS = ["30 min", "1 hour", "1.5 hours", "2 hours", "2+ hours", "TBD"];
const REQUEST_TYPES = {
  collab: "collab",
  oneOnOne: "one_on_one",
};

const INITIAL_REQUEST = {
  request_type: REQUEST_TYPES.collab,
  game_category: "",
  estimated_duration: "",
  preferred_time: "",
  contact_preference: "discord",
  description: "",
  shared_chat: false,
  extra_info: "",
};

const STATUS_STYLES = {
  pending: { label: "Pending", icon: Hourglass, cls: "text-warning bg-warning/10 border-warning/20" },
  approved: { label: "Approved", icon: CheckCircle, cls: "text-success bg-success/10 border-success/20" },
  rejected: { label: "Rejected", icon: XCircle, cls: "text-destructive bg-destructive/10 border-destructive/20" },
  archived: { label: "Archived", icon: Archive, cls: "text-muted-foreground bg-muted/30 border-border" },
};

export default function CollabRequests() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [linkedIdentities, setLinkedIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestView, setRequestView] = useState("active");
  const [editingRequest, setEditingRequest] = useState(null);
  const [managingRequest, setManagingRequest] = useState("");

  const [form, setForm, { clearDraft }] = usePersistentDraft("collab-request.new", INITIAL_REQUEST);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await communityClient.auth.me();
      setUser(me);
      try {
        const identities = await communityClient.auth.getLinkedIdentities();
        setLinkedIdentities(identities);
      } catch {
        setLinkedIdentities([]);
      }
    } catch {}
    const all = await communityClient.entities.CollabRequest.list("-created_date", 100);
    setRequests(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isCreator = canBookCollab(user);
  const isMod = canModerate(user);
  const canManageCollabs = canManageRoles(user);
  const hasDiscordOrTwitch = linkedIdentities.some((identity) => ["discord", "twitch"].includes(identity.provider));
  const canSubmitRequest = isCreator || hasDiscordOrTwitch;
  const isOneOnOne = form.request_type === REQUEST_TYPES.oneOnOne;

  const handleChange = (field, value) => setForm((current) => ({
    ...current,
    [field]: value,
    ...(field === "request_type" && value === REQUEST_TYPES.oneOnOne ? { shared_chat: false } : {}),
  }));

  const handleSubmit = async () => {
    if (!canSubmitRequest) {
      toast({
        title: "Link Discord or Twitch first.",
        description: "One-on-one requests need a connected account so Veri can actually find you.",
        variant: "destructive",
      });
      return;
    }
    if (isOneOnOne && !hasDiscordOrTwitch) {
      toast({
        title: "Discord or Twitch required.",
        description: "Connect one in Settings, then come back to book the appointment.",
        variant: "destructive",
      });
      return;
    }
    if (!form.game_category.trim() || !form.description.trim()) {
      toast({ title: "Please fill in the required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await communityClient.entities.CollabRequest.create({
        ...form,
        shared_chat: isOneOnOne ? false : form.shared_chat,
        submitted_by_name: getPublicDisplayName(user, ""),
        status: "pending",
      });
      toast({ title: isOneOnOne ? "✦ Appointment request submitted!" : "✦ Collab request submitted!", description: "The mod team will review it shortly." });
      clearDraft(INITIAL_REQUEST);
      await loadData();
    } catch (error) {
      toast({ title: "Request could not be submitted", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await communityClient.entities.CollabRequest.update(id, { status });
      toast({ title: `Request ${status}.` });
      await loadData();
    } catch (error) {
      toast({ title: "Request could not be updated", description: error?.message || "Check your role and try again.", variant: "destructive" });
    }
  };

  const handleArchive = async (request) => {
    if (!canManageCollabs) return;
    setManagingRequest(request.id);
    try {
      const restoring = request.status === "archived";
      await communityClient.entities.CollabRequest.update(request.id, restoring
        ? {
            status: request.archived_from_status || "pending",
            archived_at: "",
            archived_from_status: "",
          }
        : {
            status: "archived",
            archived_at: new Date().toISOString(),
            archived_from_status: request.status || "pending",
          });
      toast({ title: restoring ? "Collab restored" : "Collab archived" });
      await loadData();
    } catch (error) {
      toast({ title: "Archive could not be updated", description: error?.message || "Try again.", variant: "destructive" });
    } finally {
      setManagingRequest("");
    }
  };

  const handleDelete = async (request) => {
    if (!canManageCollabs || !window.confirm(`Delete "${request.game_category}" permanently?`)) return;
    setManagingRequest(request.id);
    try {
      await communityClient.entities.CollabRequest.delete(request.id);
      toast({ title: "Collab request deleted" });
      await loadData();
    } catch (error) {
      toast({ title: "Collab could not be deleted", description: error?.message || "Try again.", variant: "destructive" });
    } finally {
      setManagingRequest("");
    }
  };

  const handleSaveEdit = async (request) => {
    if (!canManageCollabs || !request?.game_category?.trim() || !request?.description?.trim()) return;
    setManagingRequest(request.id);
    try {
      await communityClient.entities.CollabRequest.update(request.id, {
        request_type: request.request_type,
        game_category: request.game_category.trim(),
        preferred_time: request.preferred_time || "",
        estimated_duration: request.estimated_duration || "",
        description: request.description.trim(),
        extra_info: request.extra_info?.trim() || "",
        shared_chat: request.request_type === REQUEST_TYPES.oneOnOne ? false : Boolean(request.shared_chat),
        edited_at: new Date().toISOString(),
      });
      setEditingRequest(null);
      toast({ title: "Collab request updated" });
      await loadData();
    } catch (error) {
      toast({ title: "Collab could not be edited", description: error?.message || "Try again.", variant: "destructive" });
    } finally {
      setManagingRequest("");
    }
  };

  const visibleRequests = requests.filter((request) => (
    canManageCollabs
      ? requestView === "archived"
        ? request.status === "archived"
        : request.status !== "archived"
      : request.status !== "archived"
  ));

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
          {isCreator
            ? "Submit a collab request to stream with Veri, or request a one-on-one slot."
            : hasDiscordOrTwitch
              ? "Request a one-on-one slot with Veri. Stream collabs still need Creator role."
              : isMod
                ? "Review incoming collab requests."
                : "Link Discord or Twitch to request a one-on-one slot."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        {canSubmitRequest && (
          <div className="lg:col-span-2">
            <GlassCard>
              <h2 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> New Request
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/35 p-1">
                  {[
                    { value: REQUEST_TYPES.collab, label: "Stream collab" },
                    { value: REQUEST_TYPES.oneOnOne, label: "1:1 with Veri" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange("request_type", option.value)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        form.request_type === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {isOneOnOne && !hasDiscordOrTwitch && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    Link Discord or Twitch in Settings before requesting a one-on-one slot.
                  </div>
                )}

                <div>
                  <Label className="text-xs">{isOneOnOne ? "Appointment Topic" : "Game / Stream Category"} <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.game_category}
                    onChange={(e) => handleChange("game_category", e.target.value)}
                    placeholder={isOneOnOne ? "e.g. lore planning, collab intro, check-in..." : "e.g. Minecraft, Just Chatting..."}
                    className="mt-1 bg-secondary/50"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3 w-3" /> Preferred Date & Time</Label>
                  <DateTimeFields
                    value={form.preferred_time}
                    onChangeValue={(value) => handleChange("preferred_time", value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3 w-3" /> Estimated Duration</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
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

                {isOneOnOne && (
                  <div>
                    <Label className="text-xs flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Best Contact</Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {["discord", "twitch"].map((provider) => {
                        const connected = linkedIdentities.some((identity) => identity.provider === provider);
                        return (
                          <button
                            key={provider}
                            type="button"
                            disabled={!connected}
                            onClick={() => handleChange("contact_preference", provider)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                              form.contact_preference === provider
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-secondary/45 text-muted-foreground hover:text-foreground"
                            } disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            {provider} {connected ? "linked" : "not linked"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                {!isOneOnOne && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <MessageSquareMore className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Shared Chat</p>
                        <p className="text-[10px] text-muted-foreground">Combine both chats during the stream</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange("shared_chat", !form.shared_chat)}
                      aria-pressed={form.shared_chat}
                      aria-label="Use shared chat"
                      className={`relative h-5 w-9 rounded-full transition-colors ${form.shared_chat ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.shared_chat ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                )}

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
                  <Send className="h-4 w-4" /> {submitting ? "Submitting..." : isOneOnOne ? "Request Appointment" : "Submit Request"}
                </Button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Request List */}
        <div className={canSubmitRequest ? "lg:col-span-3" : "lg:col-span-5"}>
          {canManageCollabs && (
            <div className="mb-3 flex items-center gap-1 rounded-lg border border-border bg-card/85 p-1" aria-label="Collab request view">
              {[
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRequestView(option.value)}
                  aria-pressed={requestView === option.value}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    requestView === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {!canSubmitRequest && !isMod && (
            <GlassCard className="mb-4">
              <p className="text-sm text-muted-foreground">
                Connect Discord or Twitch in Settings to request a one-on-one slot with Veri. Creator-role users can also submit stream collab requests.
              </p>
            </GlassCard>
          )}
          {visibleRequests.length === 0 ? (
            <GlassCard>
              <p className="text-center text-sm text-muted-foreground py-6">
                {requestView === "archived" ? "No archived collab requests." : "No collab requests yet."}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {visibleRequests.map((req) => {
                const s = STATUS_STYLES[req.status] || STATUS_STYLES.pending;
                const Icon = s.icon;
                return (
                  <GlassCard key={req.id}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-heading text-sm font-semibold">{req.game_category}</span>
                          {req.request_type === REQUEST_TYPES.oneOnOne && (
                            <span className="text-[10px] rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-primary">1:1 appointment</span>
                          )}
                          {req.estimated_duration && (
                            <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{req.estimated_duration}</span>
                          )}
                          {req.preferred_time && (
                            <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{new Date(req.preferred_time).toLocaleString()}</span>
                          )}
                          {req.request_type !== REQUEST_TYPES.oneOnOne && req.shared_chat && (
                            <span className="text-[10px] rounded-full bg-accent/10 border border-accent/20 text-accent px-2 py-0.5">Shared Chat</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
                        {req.extra_info && (
                          <p className="text-xs text-muted-foreground/70 italic mb-2">"{req.extra_info}"</p>
                        )}
                        <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <PublicAvatar src={getRecordAuthorAvatar(req)} name={getRecordAuthorName(req, "Creator")} size="xs" />
                          by {getRecordAuthorName(req, "Creator")}
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
                        {canManageCollabs && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRequest({ ...req })}
                              disabled={managingRequest === req.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                              aria-label={`Edit ${req.game_category}`}
                              title="Edit collab"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchive(req)}
                              disabled={managingRequest === req.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                              aria-label={`${req.status === "archived" ? "Restore" : "Archive"} ${req.game_category}`}
                              title={req.status === "archived" ? "Restore collab" : "Archive collab"}
                            >
                              {req.status === "archived" ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(req)}
                              disabled={managingRequest === req.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/25 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                              aria-label={`Delete ${req.game_category}`}
                              title="Delete collab permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
      <CollabEditDialog
        request={editingRequest}
        saving={Boolean(editingRequest && managingRequest === editingRequest.id)}
        onChange={setEditingRequest}
        onClose={() => setEditingRequest(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

function CollabEditDialog({ onChange, onClose, onSave, request, saving }) {
  if (!request) return null;
  const isOneOnOne = request.request_type === REQUEST_TYPES.oneOnOne;
  const update = (field, value) => onChange((current) => ({
    ...current,
    [field]: value,
    ...(field === "request_type" && value === REQUEST_TYPES.oneOnOne ? { shared_chat: false } : {}),
  }));

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Collab Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: REQUEST_TYPES.collab, label: "Stream collab" },
              { value: REQUEST_TYPES.oneOnOne, label: "1:1 with Veri" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update("request_type", option.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  request.request_type === option.value ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-xs font-medium">{isOneOnOne ? "Appointment Topic" : "Game / Stream Category"}</span>
            <Input value={request.game_category || ""} onChange={(event) => update("game_category", event.target.value)} className="mt-1 bg-secondary/50" />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Preferred Date & Time</span>
            <DateTimeFields value={request.preferred_time || ""} onChangeValue={(value) => update("preferred_time", value)} className="mt-1" />
          </label>
          <div>
            <span className="text-xs font-medium">Estimated Duration</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => update("estimated_duration", duration)}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                    request.estimated_duration === duration ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {duration}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-medium">Description</span>
            <Textarea value={request.description || ""} onChange={(event) => update("description", event.target.value)} className="mt-1 min-h-24 bg-secondary/50" maxLength={300} />
          </label>
          <label className="block">
            <span className="text-xs font-medium">Extra Info</span>
            <Textarea value={request.extra_info || ""} onChange={(event) => update("extra_info", event.target.value)} className="mt-1 min-h-20 bg-secondary/50" maxLength={500} />
          </label>
          {!isOneOnOne && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={Boolean(request.shared_chat)} onChange={(event) => update("shared_chat", event.target.checked)} />
              Use shared chat during the stream
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => onSave(request)} disabled={saving || !request.game_category?.trim() || !request.description?.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
