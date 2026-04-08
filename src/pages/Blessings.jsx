import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlessingCard from "../components/blessings/BlessingCard";
import BlessingForm from "../components/blessings/BlessingForm";

export default function Blessings() {
  const [blessings, setBlessings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const all = await base44.entities.Blessing.list("-created_date", 50);
    setBlessings(all);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Blessings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Uplifting posts, links & media from Veri ✦</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Post Blessing
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : blessings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-16 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No blessings posted yet.</p>
          {isAdmin && (
            <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Post the first one
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {blessings.map((b) => (
            <BlessingCard key={b.id} blessing={b} user={user} isAdmin={isAdmin} onRefresh={loadData} />
          ))}
        </div>
      )}

      <BlessingForm open={showForm} onOpenChange={setShowForm} user={user} onCreated={loadData} />
    </div>
  );
}