import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen } from "lucide-react";
import GlassCard from "../GlassCard";

const CATEGORY_META = {
  lore:         { label: "Lore",        color: "text-purple-400",  bg: "bg-purple-400/10"  },
  milestone:    { label: "Milestone",   color: "text-yellow-400",  bg: "bg-yellow-400/10"  },
  inside_joke:  { label: "Inside Joke", color: "text-pink-400",    bg: "bg-pink-400/10"    },
  faq:          { label: "FAQ",         color: "text-cyan-400",    bg: "bg-cyan-400/10"    },
  other:        { label: "Other",       color: "text-slate-400",   bg: "bg-slate-400/10"   },
};

export default function RecentCodexEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Codex.list("-created_date", 5)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Recent Codex Entries</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">The Codex is empty — be the first to add an entry!</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;
            return (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                <span className="text-xl shrink-0 mt-0.5">{entry.cover_emoji || "📖"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-heading uppercase tracking-wide ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                    {entry.author_name && (
                      <span className="text-xs text-muted-foreground truncate">by {entry.author_name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}