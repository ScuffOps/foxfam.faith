import { useCallback, useEffect, useState } from "react";
import { FilePenLine, Play, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import { discardSavedDraft, listSavedDrafts } from "@/lib/draftRegistry";
import { DRAFTS_CHANGED_EVENT, openCreateFlow } from "@/lib/userFlow";
import { canModerate } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

export default function Drafts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const loadDrafts = useCallback(() => setDrafts(listSavedDrafts().filter((draft) => !draft.staffOnly || canModerate(user))), [user]);

  useEffect(() => {
    loadDrafts();
    window.addEventListener("focus", loadDrafts);
    window.addEventListener("storage", loadDrafts);
    window.addEventListener(DRAFTS_CHANGED_EVENT, loadDrafts);
    return () => {
      window.removeEventListener("focus", loadDrafts);
      window.removeEventListener("storage", loadDrafts);
      window.removeEventListener(DRAFTS_CHANGED_EVENT, loadDrafts);
    };
  }, [loadDrafts]);

  const resume = (draft) => {
    navigate(draft.route);
    if (draft.action) window.setTimeout(() => openCreateFlow(draft.action), 0);
  };
  const discard = (draft) => {
    discardSavedDraft(draft.key);
    loadDrafts();
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6"><h1 className="font-heading text-2xl font-bold md:text-3xl">Draft Center</h1><p className="mt-1 text-sm text-muted-foreground">Continue unfinished contributions or clear the ones you no longer need.</p></div>
      {drafts.length === 0 ? (
        <GlassCard className="py-14 text-center"><FilePenLine className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-heading text-base font-semibold">No unfinished drafts</h2><p className="mt-1 text-sm text-muted-foreground">Anything you begin writing will wait here locally on this device.</p></GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {drafts.map((draft) => (
            <GlassCard key={draft.key} className="flex min-h-44 flex-col">
              <FilePenLine className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-heading text-base font-semibold">{draft.label}</h2>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{draft.description}</p>
              <div className="mt-4 flex gap-2">
                <Button type="button" className="flex-1 gap-2" onClick={() => resume(draft)}><Play className="h-4 w-4" /> Continue</Button>
                <Button type="button" variant="outline" size="icon" onClick={() => discard(draft)} aria-label={`Discard ${draft.label}`} title={`Discard ${draft.label}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Drafts stay on this browser only and are removed after a successful submission or when you discard them.</p>
    </div>
  );
}
