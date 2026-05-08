import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpenText, Feather, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReliquaryEntryCard from "@/components/reliquary/ReliquaryEntryCard";
import ReliquaryForm from "@/components/reliquary/ReliquaryForm";
import ParticleOverlay from "@/components/ParticleOverlay";

export default function Reliquary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
    } catch {}
    try {
      const all = await base44.entities.ReliquaryEntry.list("-created_date", 100);
      setEntries(all.filter((entry) => entry.is_published !== false));
    } catch {
      setEntries([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";
  const openNewPost = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const openEditPost = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormOpenChange = (nextOpen) => {
    setShowForm(nextOpen);
    if (!nextOpen) setEditingEntry(null);
  };

  return (
    <div className="relative mx-auto max-w-3xl animate-fade-in">
      <ParticleOverlay style={{ position: "fixed", zIndex: 50 }} />
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary/75">
            <BookOpenText className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em]">Poem Sanctuary</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">The Reliquary</h1>
          <p className="mt-1 text-sm text-muted-foreground">A quiet place for Veri's poems, notes, and community echoes.</p>
        </div>
        {isAdmin && (
          <Button onClick={openNewPost} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-14 text-center">
          <Feather className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No poems placed here yet.</p>
          {isAdmin && (
            <Button className="mt-4 gap-2" onClick={openNewPost}>
              <Plus className="h-4 w-4" /> Write the first one
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {entries.map((entry) => (
            <ReliquaryEntryCard key={entry.id} entry={entry} user={user} isAdmin={isAdmin} onEdit={openEditPost} onRefresh={loadData} />
          ))}
        </div>
      )}

      <ReliquaryForm open={showForm} onOpenChange={handleFormOpenChange} user={user} entry={editingEntry} onSaved={loadData} />
    </div>
  );
}
