import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_META = {
  lore:         { label: "Lore",          color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20" },
  milestone:    { label: "Milestone",     color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20" },
  inside_joke:  { label: "Inside Joke",   color: "text-pink-400",    bg: "bg-pink-400/10",    border: "border-pink-400/20"   },
  faq:          { label: "FAQ",           color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20"   },
  other:        { label: "Other",         color: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/20"  },
};

export default function CodexEntryCard({ entry, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;

  return (
    <div
      className={`foxcard rounded-xl border transition-all duration-200 ${meta.border} cursor-pointer hover:border-opacity-60`}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl shrink-0 mt-0.5">{entry.cover_emoji || "📖"}</span>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-sm text-foreground leading-snug">{entry.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} font-heading tracking-wider uppercase`}>
                  {meta.label}
                </span>
                {entry.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(entry)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div
              className="prose prose-invert prose-sm max-w-none text-foreground/85 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
            <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground font-heading tracking-wide">
              <span>✦ Added by {entry.author_name || "unknown"}</span>
              {entry.last_edited_by && <span>· Edited by {entry.last_edited_by}</span>}
              {entry.created_date && <span>· {format(new Date(entry.created_date), "MMM d, yyyy")}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}