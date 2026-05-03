import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, BookOpen, X } from "lucide-react";
import { awardPoints } from "@/hooks/usePoints";

export default function BlessingForm({ open, onOpenChange, user, onCreated }) {
  const [form, setForm] = useState({ title: "", content: "", link_url: "", link_preview_title: "" });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [codexEntries, setCodexEntries] = useState([]);
  const [selectedCodex, setSelectedCodex] = useState(null);
  const [codexSearch, setCodexSearch] = useState("");
  const [showCodexPicker, setShowCodexPicker] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Codex.list("-created_date", 100).then(setCodexEntries).catch(() => {});
    }
  }, [open]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let media_url = "";
    if (mediaFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaFile });
      media_url = file_url;
    }
    await base44.entities.Blessing.create({
      ...form,
      media_url,
      author_name: user?.display_name || user?.full_name || user?.email || "Veri",
      upvotes: 0,
      upvoted_by: [],
      comment_count: 0,
      codex_entry_id: selectedCodex?.id || "",
      codex_entry_title: selectedCodex?.title || "",
      codex_entry_emoji: selectedCodex?.cover_emoji || "",
    });
    if (user) awardPoints(user, "post_blessing");
    setSaving(false);
    setForm({ title: "", content: "", link_url: "", link_preview_title: "" });
    setMediaFile(null);
    setMediaPreview(null);
    setSelectedCodex(null);
    setCodexSearch("");
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">New Blessing ✦</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="What are you sharing?" className="mt-1.5 bg-secondary" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={form.content} onChange={(e) => update("content", e.target.value)} placeholder="Share something uplifting with the community..." className="mt-1.5 bg-secondary resize-none" rows={3} />
          </div>

          {/* Media Upload */}
          <div>
            <Label>Image / Video</Label>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/40 py-4 transition-colors hover:border-primary/40 hover:bg-secondary">
              {mediaPreview ? (
                <img src={mediaPreview} alt="" className="max-h-40 rounded object-contain" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Click to upload media</span>
                </>
              )}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div>
            <Label>Link URL</Label>
            <Input value={form.link_url} onChange={(e) => update("link_url", e.target.value)} placeholder="https://..." className="mt-1.5 bg-secondary" />
          </div>
          {form.link_url && (
            <div>
              <Label>Link Label (optional)</Label>
              <Input value={form.link_preview_title} onChange={(e) => update("link_preview_title", e.target.value)} placeholder="e.g. Watch on Twitch" className="mt-1.5 bg-secondary" />
            </div>
          )}

          {/* Codex Link */}
          <div>
            <Label>Link to Codex Entry (optional)</Label>
            {selectedCodex ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <span className="text-base">{selectedCodex.cover_emoji || "📖"}</span>
                <span className="flex-1 text-sm font-medium truncate">{selectedCodex.title}</span>
                <button type="button" onClick={() => setSelectedCodex(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowCodexPicker((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground w-full transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  Link a Codex entry...
                </button>
                {showCodexPicker && (
                  <div className="mt-2 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <input
                      autoFocus
                      value={codexSearch}
                      onChange={(e) => setCodexSearch(e.target.value)}
                      placeholder="Search entries..."
                      className="w-full border-b border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                    <div className="max-h-44 overflow-y-auto">
                      {codexEntries
                        .filter((e) => !codexSearch || e.title.toLowerCase().includes(codexSearch.toLowerCase()))
                        .map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => { setSelectedCodex(e); setShowCodexPicker(false); setCodexSearch(""); }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-secondary/60 transition-colors text-left"
                          >
                            <span>{e.cover_emoji || "📖"}</span>
                            <span className="truncate">{e.title}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground capitalize shrink-0">{e.category?.replace("_", " ")}</span>
                          </button>
                        ))}
                      {codexEntries.filter((e) => !codexSearch || e.title.toLowerCase().includes(codexSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-4 text-xs text-center text-muted-foreground">No entries found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Posting...</> : "Post Blessing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}