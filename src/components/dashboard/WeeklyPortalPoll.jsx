import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { USER_COLOR_SWATCHES } from "@/lib/userColorSwatches";

const STORAGE_KEY = "foxfam.weeklyPortalPoll.v1";
const POLL_SWATCH_LABELS = ["Charlotte", "Strikemaster", "Chambray", "Pink Swan", "Falcon"];
const POLL_SWATCHES = POLL_SWATCH_LABELS
  .map((label) => USER_COLOR_SWATCHES.find((swatch) => swatch.label === label))
  .filter(Boolean);

const WEEKLY_POLLS = [
  {
    id: "portal-vibe",
    question: "Which portal ritual should get extra polish next?",
    options: ["Daily candle streaks", "Profile status moods", "Weekly blessing prompts"],
  },
  {
    id: "stream-night",
    question: "What should the next event night lean into?",
    options: ["Cozy watch party", "Community games", "Lore and shrine chaos"],
  },
  {
    id: "profile-flex",
    question: "Which future profile flex sounds best?",
    options: ["Animated nameplate", "Custom shrine candle", "Seasonal title"],
  },
];

function getWeekKey() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const elapsedDays = Math.floor((now - firstDay) / 86400000);
  return `${now.getFullYear()}-${Math.floor((elapsedDays + firstDay.getDay()) / 7)}`;
}

function getPollForWeek() {
  const weekKey = getWeekKey();
  const weekNumber = Number(weekKey.split("-")[1]) || 0;
  return { ...WEEKLY_POLLS[weekNumber % WEEKLY_POLLS.length], weekKey };
}

function loadVotes() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function WeeklyPortalPoll() {
  const poll = useMemo(getPollForWeek, []);
  const [votes, setVotes] = useState(loadVotes);
  const selected = votes[poll.weekKey];
  const baseVotes = [12, 9, 7];
  const totals = poll.options.map((_, index) => baseVotes[index] + (selected === index ? 1 : 0));
  const totalVotes = totals.reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  }, [votes]);

  function vote(index) {
    setVotes((current) => ({ ...current, [poll.weekKey]: index }));
  }

  return (
    <section className="foxcard h-full rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-candle text-xs font-semibold uppercase tracking-widest text-cyan-100/75">weekly poll</p>
          <h2 className="font-heading text-lg font-bold text-foreground">Portal Pulse</h2>
          <p className="mt-1 text-sm text-muted-foreground">{poll.question}</p>
        </div>
        <Badge variant="outline" className="border-cyan-200/35 bg-cyan-300/10 text-cyan-100">
          week {poll.weekKey.split("-")[1]}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {poll.options.map((option, index) => {
          const isSelected = selected === index;
          const percent = totalVotes ? Math.round((totals[index] / totalVotes) * 100) : 0;
          const swatch = POLL_SWATCHES[index % POLL_SWATCHES.length] || USER_COLOR_SWATCHES[index % USER_COLOR_SWATCHES.length];
          const swatchHex = swatch.hex;
          return (
            <button
              key={option}
              type="button"
              onClick={() => vote(index)}
              className="relative w-full overflow-hidden rounded-xl border px-3 py-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                borderColor: isSelected ? `${swatchHex}d9` : `${swatchHex}5c`,
                background: `linear-gradient(90deg, ${swatchHex}${isSelected ? "24" : "12"}, rgba(2,6,23,0.28))`,
                boxShadow: isSelected
                  ? `0 0 24px ${swatchHex}33, inset 0 0 0 1px ${swatchHex}2e`
                  : `inset 0 0 0 1px ${swatchHex}12`,
              }}
            >
              <span
                className="absolute inset-y-0 left-0 transition-all"
                style={{
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${swatchHex}55, ${swatchHex}18)`,
                  opacity: isSelected ? 1 : 0.58,
                }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: swatchHex }} />
                  ) : (
                    <Vote className="h-4 w-4" style={{ color: swatchHex }} />
                  )}
                  {option}
                </span>
                <span className="text-xs font-semibold" style={{ color: swatchHex }}>{percent}%</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" /> {totalVotes} signal votes
        </span>
        <Button asChild size="sm" variant="outline">
          <Link to="/polls">Open polls</Link>
        </Button>
      </div>
    </section>
  );
}
