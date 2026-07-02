import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, HeartHandshake, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "foxfam.communityBlessing.v1";

const PROMPTS = [
  "Drop one comfort song, clip, image, or tiny note that would help someone have a softer day.",
  "Nominate someone who made chat, Discord, or the portal feel kinder this week.",
  "Share a tiny win, a survival note, or something Veri-coded that made you smile.",
];

function getWeekNumber() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  return Math.floor((Math.floor((now - firstDay) / 86400000) + firstDay.getDay()) / 7);
}

function loadJoined() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function CommunityBlessingPrompt() {
  const weekNumber = useMemo(getWeekNumber, []);
  const prompt = PROMPTS[weekNumber % PROMPTS.length];
  const weekKey = `${new Date().getFullYear()}-${weekNumber}`;
  const [joined, setJoined] = useState(loadJoined);
  const hasJoined = Boolean(joined[weekKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(joined));
  }, [joined]);

  function markJoined() {
    setJoined((current) => ({ ...current, [weekKey]: true }));
  }

  return (
    <section className="foxcard flex h-full flex-col rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200/25 bg-rose-300/15 text-rose-100">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <Badge variant="outline" className="border-rose-200/35 bg-rose-300/10 text-rose-100">
          weekly
        </Badge>
      </div>

      <div className="mt-4">
        <p className="dashboard-candle text-xs font-semibold uppercase tracking-widest text-rose-100/75">community blessing</p>
        <h2 className="font-heading text-lg font-bold text-foreground">This Week&apos;s Offering</h2>
        <p className="mt-2 rounded-xl border border-rose-200/15 bg-rose-300/10 p-3 text-sm leading-relaxed text-rose-50/90">
          {prompt}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button type="button" variant={hasJoined ? "outline" : "default"} className="flex-1 gap-2" onClick={markJoined} disabled={hasJoined}>
          {hasJoined ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {hasJoined ? "Marked" : "I joined"}
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link to="/blessings">Post blessing</Link>
        </Button>
      </div>
    </section>
  );
}
