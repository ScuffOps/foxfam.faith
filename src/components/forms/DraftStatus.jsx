import { Check, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DraftStatus({ hasDraft, restored = false, onDiscard, hasUnsavedFiles = false }) {
  if (!hasDraft && !hasUnsavedFiles) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
      <span className="inline-flex items-center gap-1.5">
        {restored ? <RotateCcw className="h-3.5 w-3.5 text-primary" /> : <Check className="h-3.5 w-3.5 text-success" />}
        {restored ? "Draft restored" : "Saved locally"}
      </span>
      {hasUnsavedFiles ? <span className="text-warning">Attachments must be reselected after a reload.</span> : null}
      {hasDraft && onDiscard ? (
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard} className="h-7 gap-1 px-2 text-xs text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" /> Discard draft
        </Button>
      ) : null}
    </div>
  );
}
