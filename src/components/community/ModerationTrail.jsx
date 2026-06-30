import { useState } from "react";
import { ClipboardList, Loader2, Save } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appendModerationHistory, formatModerationStatus, getModerationHistory } from "@/lib/moderation";

export default function ModerationTrail({ item, entityName, isAdmin = false, actorName = "Staff", onRefresh }) {
  const history = getModerationHistory(item);
  const [note, setNote] = useState(item?.resolution_note || "");
  const [saving, setSaving] = useState(false);
  const hasVisibleTrail = history.length > 0 || item?.resolution_note || isAdmin;

  if (!hasVisibleTrail) return null;

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await communityClient.entities[entityName].update(item.id, {
        resolution_note: note.trim(),
        moderation_history: appendModerationHistory(item, {
          status: item?.status || "noted",
          actorName,
          note: note.trim() ? "Resolution note updated" : "Resolution note cleared",
        }),
      });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-secondary/25 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        Moderation
      </div>

      {isAdmin && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Public resolution note. Keep private staff context out of this field."
            className="min-h-20 bg-background/45 text-xs"
          />
          <Button size="sm" variant="outline" className="h-8 gap-2 text-xs" onClick={handleSaveNote} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save note
          </Button>
        </div>
      )}

      {item?.resolution_note && (
        <p className="mt-3 rounded-md border border-border/60 bg-background/40 p-2 text-xs leading-relaxed text-foreground">
          {item.resolution_note}
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {history.slice(0, 3).map((entry, index) => (
            <div key={`${entry.created_at || "entry"}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{formatModerationStatus(entry.status)}</span>
              <span>by {entry.actor_name || "Staff"}</span>
              {entry.created_at && <span>{new Date(entry.created_at).toLocaleDateString()}</span>}
              {entry.note && <span className="basis-full text-foreground/80">{entry.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
