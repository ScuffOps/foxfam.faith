import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lightbulb, ArrowUp } from "lucide-react";
import GlassCard from "../GlassCard";

export default function TopIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.CommunityPost.filter({ type: "idea", status: "approved" }, "-upvotes", 5);
      setIdeas(all);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/15">
          <Lightbulb className="h-4 w-4 text-chart-4" />
        </div>
        <h3 className="font-heading text-sm font-semibold">Top Ideas</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : ideas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No ideas yet</p>
      ) : (
        <div className="space-y-2.5">
          {ideas.map((idea) => (
            <div key={idea.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowUp className="h-3.5 w-3.5 text-chart-4" />
                <span className="text-xs font-bold text-chart-4">{idea.upvotes || 0}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{idea.title}</p>
                <p className="text-xs text-muted-foreground">by {idea.submitted_by_name || "Anonymous"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}