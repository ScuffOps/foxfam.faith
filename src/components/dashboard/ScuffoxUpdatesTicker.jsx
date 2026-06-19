import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HeartPulse, Info, Megaphone, Moon, Sparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";

const TONE_META = {
  announcement: { label: "Announcement", icon: Megaphone, className: "text-primary" },
  mood: { label: "Mood", icon: HeartPulse, className: "text-chart-5" },
  info: { label: "Info", icon: Info, className: "text-accent" },
  stream: { label: "Stream", icon: Sparkles, className: "text-chart-4" },
  quiet: { label: "Quiet", icon: Moon, className: "text-muted-foreground" },
};

function isVisibleUpdate(update) {
  if (!update || update.status !== "active") return false;
  if (!update.expires_at) return true;
  return new Date(update.expires_at) > new Date();
}

function formatUpdateAge(value) {
  if (!value) return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function ScuffoxUpdatesTicker() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    communityClient.entities.ScuffoxUpdate.list("-created_date", 12)
      .then((rows) => {
        if (alive) setUpdates(rows.filter(isVisibleUpdate).slice(0, 8));
      })
      .catch(() => {
        if (alive) setUpdates([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const tickerItems = useMemo(() => {
    if (updates.length > 0) return updates;
    return [{
      id: "fallback",
      title: loading ? "Checking the signal" : "No current Scuffox updates",
      message: loading ? "pulling the latest dashboard notes..." : "the announcement channel is quiet for now",
      tone: "quiet",
      created_date: null,
    }];
  }, [loading, updates]);

  const repeatedItems = [...tickerItems, ...tickerItems];

  return (
    <section className="dashboard-updates-ticker" aria-label="Scuffox updates">
      <div className="dashboard-updates-label">
        <Megaphone className="h-4 w-4" />
        <span>SCUFFOX UPDATES</span>
      </div>
      <div className="dashboard-ticker-window" tabIndex={0}>
        <div className="dashboard-ticker-track">
          {repeatedItems.map((update, index) => {
            const tone = TONE_META[update.tone] || TONE_META.announcement;
            const Icon = tone.icon;
            return (
              <div className="dashboard-ticker-item" key={`${update.id}-${index}`}>
                <span className={`dashboard-ticker-tone ${tone.className}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {tone.label}
                </span>
                <strong>{update.title}</strong>
                {update.message && <span>{update.message}</span>}
                {update.created_date && <em>{formatUpdateAge(update.created_date)}</em>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
