import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowUp, Zap, CheckCircle2, Clock, Lightbulb, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STAGES = [
  { key: "planned", label: "Planned", icon: Clock, color: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/20" },
  { key: "in_progress", label: "In Progress", icon: Zap, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
];

export default function Roadmap() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", roadmap_status: "planned" });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.CommunityPost.filter({ status: "approved" });
    setPosts(all.filter((p) => p.roadmap_status && p.roadmap_status !== "none"));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  const handleStageChange = async (postId, newStage) => {
    await base44.entities.CommunityPost.update(postId, { roadmap_status: newStage });
    loadData();
  };

  const openAdd = () => {
    setEditingPost(null);
    setForm({ title: "", description: "", roadmap_status: "planned" });
    setDialogOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setForm({ title: post.title, description: post.description || "", roadmap_status: post.roadmap_status || "planned" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editingPost) {
      await base44.entities.CommunityPost.update(editingPost.id, {
        title: form.title,
        description: form.description,
        roadmap_status: form.roadmap_status,
      });
    } else {
      await base44.entities.CommunityPost.create({
        title: form.title,
        description: form.description,
        type: "idea",
        status: "approved",
        roadmap_status: form.roadmap_status,
        upvotes: 0,
        upvoted_by: [],
        submitted_by_name: user?.display_name || user?.full_name || "Staff",
      });
    }
    setSaving(false);
    setDialogOpen(false);
    loadData();
  };

  const handleUpvote = async (post) => {
    if (!user?.email) return;
    const upvotedBy = post.upvoted_by || [];
    const hasVoted = upvotedBy.includes(user.email);
    await base44.entities.CommunityPost.update(post.id, {
      upvotes: hasVoted ? Math.max((post.upvotes || 0) - 1, 0) : (post.upvotes || 0) + 1,
      upvoted_by: hasVoted ? upvotedBy.filter((e) => e !== user.email) : [...upvotedBy, user.email],
    });
    loadData();
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Roadmap</h1>
          <p className="mt-1 text-sm text-muted-foreground">Community-driven feature requests and what's coming next</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} size="sm" className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> Add Feature
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {STAGES.map((stage) => {
            const stagePosts = posts.filter((p) => p.roadmap_status === stage.key).sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            const Icon = stage.icon;
            return (
              <div key={stage.key}>
                <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${stage.bg} ${stage.border}`}>
                  <Icon className={`h-4 w-4 ${stage.color}`} />
                  <span className={`font-heading text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{stagePosts.length}</span>
                </div>

                {stagePosts.length === 0 ? (
                  <div className="rounded-xl border border-border border-dashed bg-card/30 p-6 text-center">
                    <p className="text-xs text-muted-foreground">Nothing here yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stagePosts.map((post) => {
                      const hasVoted = (post.upvoted_by || []).includes(user?.email);
                      return (
                        <div key={post.id} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
                          <div className="flex gap-3">
                            {/* Upvote */}
                            <button
                              onClick={() => handleUpvote(post)}
                              disabled={!user?.email}
                              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[40px] transition-colors ${
                                hasVoted ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                              <span className="text-xs font-bold">{post.upvotes || 0}</span>
                            </button>

                            <div className="min-w-0 flex-1">
                               <div className="flex items-start gap-2">
                                 <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chart-4" />
                                 <h4 className="text-sm font-medium leading-snug flex-1">{post.title}</h4>
                                 {isAdmin && (
                                   <button onClick={() => openEdit(post)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                     <Pencil className="h-3.5 w-3.5" />
                                   </button>
                                 )}
                               </div>
                              {post.description && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.description}</p>
                              )}
                              {isAdmin && (
                                <div className="mt-2 flex gap-1 flex-wrap">
                                  {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                                    <button
                                      key={s.key}
                                      onClick={() => handleStageChange(post.id, s.key)}
                                      className={`rounded px-2 py-0.5 text-[10px] border transition-colors ${s.bg} ${s.border} ${s.color} hover:opacity-80`}
                                    >
                                      → {s.label}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => handleStageChange(post.id, "none")}
                                    className="rounded px-2 py-0.5 text-[10px] border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingPost ? "Edit Feature" : "Add Feature"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Feature name" className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe this feature..." className="mt-1.5 bg-secondary resize-none" rows={3} />
            </div>
            <div>
              <Label>Stage</Label>
              <div className="mt-1.5 flex gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setForm((f) => ({ ...f, roadmap_status: s.key }))}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      form.roadmap_status === s.key ? `${s.bg} ${s.border} ${s.color}` : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? "Saving..." : editingPost ? "Save Changes" : "Add to Roadmap"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!loading && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-16 text-center">
          <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No roadmap items yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Admins can promote approved ideas to the roadmap from the Community page.</p>
        </div>
      )}
    </div>
  );
}