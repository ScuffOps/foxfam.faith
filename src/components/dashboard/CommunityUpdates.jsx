import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Newspaper } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import GlassCard from "../GlassCard";
import { getRichTextPlainText } from "../RichTextContent";

export default function CommunityUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await communityClient.entities.CommunityPost.filter(
          { type: "update", status: "approved" },
          "-created_date",
          4
        );
        setUpdates(all);
      } catch {
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Newspaper className="h-4 w-4 text-accent" />
          </div>
          <h3 className="font-heading text-sm font-semibold">Community Updates</h3>
        </div>
        <Link to="/updates" className="group flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
          View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : updates.length === 0 ? (
        <p className="dashboard-empty rounded-lg py-5 text-center text-sm text-muted-foreground">
          No updates yet. The announcement desk is pretending to be organized.
        </p>
      ) : (
        <div className="space-y-2.5">
          {updates.map((update) => {
            const preview = getRichTextPlainText(update.description).slice(0, 120);
            return (
              <Link
                key={update.id}
                to="/updates"
                className="dashboard-list-row group block rounded-lg px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{update.title}</p>
                    {preview && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {preview}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {update.created_date
                    ? `${formatDistanceToNow(new Date(update.created_date), { addSuffix: true })}`
                    : "Just now"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
