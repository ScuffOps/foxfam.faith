import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Plus, ArrowUp, Image, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GlassCard from "@/components/GlassCard";

const ENTRY_TYPES = ["poem", "artwork", "prayer", "story", "any"];

const STATUS_COLORS = {
  active: "bg-success/15 text-success",
  voting: "bg-chart-4/15 text-chart-4",
  closed: "bg-secondary text-muted-foreground",
};
const STATUS_LABELS = {
  active: "✍️ Submit Now",
  voting: "🗳️ Voting Open",
  closed: "🏆 Closed",
};

export default function Contests() {
  const [contests, setContests] = useState([]);
  const [entries, setEntries] = useState({});   // { contest_id: [entries] }
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Dialogs
  const [newContest, setNewContest] = useState(false);
  const [contestForm, setContestForm] = useState({ title: "", description: "", theme: "", entry_type: "any", ends_at: "" });
  const [savingContest, setSavingContest] = useState(false);

  const [submitDialog, setSubmitDialog] = useState(null); // contest object
  const [entryForm, setEntryForm] = useState({ title: "", content: "", media_url: "" });
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const cs = await base44.entities.Contest.list("-created_date", 50);
    setContests(cs);
    // Fetch entries for each contest
    const allEntries = await base44.entities.ContestEntry.list("-created_date", 500);
    const grouped = {};
    allEntries.forEach((e) => {
      if (!grouped[e.contest_id]) grouped[e.contest_id] = [];
      grouped[e.contest_id].push(e);
    });
    setEntries(grouped);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  // --- Contest creation ---
  const handleCreateContest = async () => {
    if (!contestForm.title.trim()) return;
    setSavingContest(true);
    await base44.entities.Contest.create({
      ...contestForm,
      status: "active",
    });
    setSavingContest(false);
    setNewContest(false);
    setContestForm({ title: "", description: "", theme: "", entry_type: "any", ends_at: "" });
    loadData();
  };

  const handleStatusChange = async (contest, status) => {
    await base44.entities.Contest.update(contest.id, { status });
    loadData();
  };

  const handlePickWinner = async (contestId, entryId) => {
    await base44.entities.Contest.update(contestId, { winner_entry_id: entryId, status: "closed" });
    loadData();
  };

  // --- Entry submission ---
  const handleSubmitEntry = async () => {
    if (!entryForm.title.trim() || !entryForm.content.trim()) return;
    setSubmittingEntry(true);
    const authorName = user?.display_name || user?.full_name || "Member";
    await base44.entities.ContestEntry.create({
      contest_id: submitDialog.id,
      title: entryForm.title.trim(),
      content: entryForm.content.trim(),
      media_url: entryForm.media_url,
      author_name: authorName,
      upvotes: 0,
      upvoted_by: [],
    });
    setSubmittingEntry(false);
    setSubmitDialog(null);
    setEntryForm({ title: "", content: "", media_url: "" });
    loadData();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEntryForm((f) => ({ ...f, media_url: file_url }));
    setUploadingImg(false);
  };

  const handleUpvoteEntry = async (entry) => {
    if (!user?.email) return;
    const upvotedBy = entry.upvoted_by || [];
    const hasVoted = upvotedBy.includes(user.email);
    await base44.entities.ContestEntry.update(entry.id, {
      upvotes: hasVoted ? Math.max((entry.upvotes || 0) - 1, 0) : (entry.upvotes || 0) + 1,
      upvoted_by: hasVoted ? upvotedBy.filter((e) => e !== user.email) : [...upvotedBy, user.email],
    });
    loadData();
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Contests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Submit creative entries — poems, prayers, artwork — and vote for your favorites</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNewContest(true)} size="sm" className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> New Contest
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : contests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-16 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No contests yet. Admins can create the first one!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {contests.map((contest) => {
            const contestEntries = (entries[contest.id] || []).sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            const winner = contest.winner_entry_id ? contestEntries.find((e) => e.id === contest.winner_entry_id) : null;

            return (
              <div key={contest.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Contest header */}
                <div className="px-5 py-4 border-b border-border bg-secondary/30">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy className="h-4 w-4 text-chart-4 shrink-0" />
                        <h3 className="font-heading font-bold">{contest.title}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[contest.status]}`}>
                          {STATUS_LABELS[contest.status]}
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                          {contest.entry_type}
                        </span>
                      </div>
                      {contest.description && <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>}
                      {contest.theme && (
                        <p className="mt-1 text-xs text-chart-4/80">
                          <span className="font-medium">Theme:</span> {contest.theme}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {user?.email && contest.status === "active" && (
                        <Button size="sm" onClick={() => { setSubmitDialog(contest); setEntryForm({ title: "", content: "", media_url: "" }); }} className="gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Submit Entry
                        </Button>
                      )}
                      {isAdmin && contest.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(contest, "voting")}>
                          Open Voting
                        </Button>
                      )}
                      {isAdmin && contest.status === "voting" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(contest, "closed")}>
                          Close Contest
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Winner banner */}
                {winner && (
                  <div className="px-5 py-3 bg-chart-4/10 border-b border-chart-4/20 flex items-center gap-3">
                    <Star className="h-4 w-4 text-chart-4 shrink-0" />
                    <p className="text-sm font-semibold text-chart-4">Winner: {winner.title} by {winner.author_name}</p>
                  </div>
                )}

                {/* Entries */}
                <div className="p-5">
                  {contestEntries.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">No entries yet. Be the first to submit!</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {contestEntries.map((entry) => {
                        const hasVoted = (entry.upvoted_by || []).includes(user?.email);
                        const isWinner = entry.id === contest.winner_entry_id;
                        return (
                          <div
                            key={entry.id}
                            className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                              isWinner ? "border-chart-4/50 bg-chart-4/5" : "border-border bg-secondary/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {isWinner && <Star className="h-3.5 w-3.5 text-chart-4 mb-1" />}
                                <h4 className="font-semibold text-sm">{entry.title}</h4>
                                <p className="text-[11px] text-muted-foreground">by {entry.author_name}</p>
                              </div>
                              <button
                                onClick={() => handleUpvoteEntry(entry)}
                                disabled={!user?.email}
                                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors shrink-0 ${
                                  hasVoted ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">{entry.upvotes || 0}</span>
                              </button>
                            </div>
                            {entry.media_url && (
                              <img src={entry.media_url} alt={entry.title} className="rounded-lg w-full object-cover max-h-48" />
                            )}
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{entry.content}</p>
                            {isAdmin && contest.status === "voting" && !contest.winner_entry_id && (
                              <button
                                onClick={() => handlePickWinner(contest.id, entry.id)}
                                className="self-end text-xs text-chart-4 hover:underline"
                              >
                                ✦ Pick as Winner
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Contest Dialog */}
      <Dialog open={newContest} onOpenChange={setNewContest}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Create Contest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title *</Label>
              <Input value={contestForm.title} onChange={(e) => setContestForm((f) => ({ ...f, title: e.target.value }))} placeholder="Contest name" className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={contestForm.description} onChange={(e) => setContestForm((f) => ({ ...f, description: e.target.value }))} placeholder="What's this contest about?" rows={2} className="mt-1.5 bg-secondary resize-none" />
            </div>
            <div>
              <Label>Theme / Prompt</Label>
              <Input value={contestForm.theme} onChange={(e) => setContestForm((f) => ({ ...f, theme: e.target.value }))} placeholder="e.g. Write a poem about hope" className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Entry Type</Label>
              <Select value={contestForm.entry_type} onValueChange={(v) => setContestForm((f) => ({ ...f, entry_type: v }))}>
                <SelectTrigger className="mt-1.5 bg-secondary capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewContest(false)}>Cancel</Button>
              <Button onClick={handleCreateContest} disabled={savingContest || !contestForm.title.trim()}>
                {savingContest ? "Creating..." : "Create Contest"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Entry Dialog */}
      <Dialog open={!!submitDialog} onOpenChange={(o) => !o && setSubmitDialog(null)}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Submit Your Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Entry Title *</Label>
              <Input value={entryForm.title} onChange={(e) => setEntryForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title of your piece" className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Your Content * {submitDialog && <span className="text-muted-foreground capitalize">({submitDialog.entry_type})</span>}</Label>
              <Textarea
                value={entryForm.content}
                onChange={(e) => setEntryForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Write your poem, prayer, story..."
                rows={6}
                className="mt-1.5 bg-secondary resize-none"
              />
            </div>
            <div>
              <Label>Image / Artwork (optional)</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                  <Image className="h-4 w-4" />
                  {uploadingImg ? "Uploading..." : "Upload Image"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {entryForm.media_url && (
                  <img src={entryForm.media_url} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-border" />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSubmitDialog(null)}>Cancel</Button>
              <Button onClick={handleSubmitEntry} disabled={submittingEntry || !entryForm.title.trim() || !entryForm.content.trim()}>
                {submittingEntry ? "Submitting..." : "Submit Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}