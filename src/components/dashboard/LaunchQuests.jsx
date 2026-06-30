import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CheckCircle2, Flame, Gift, MessageSquare, Palette, Sparkles, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "foxfam.launchQuests.v1";

const QUESTS = [
  { id: "profile", label: "Tune profile", detail: "Display name, accent, bio", to: "/profile", icon: Palette },
  { id: "poll", label: "Cast a vote", detail: "Help steer the portal", to: "/polls", icon: Vote },
  { id: "reply", label: "Join a thread", detail: "Comment or reply once", to: "/forum", icon: MessageSquare },
  { id: "shrine", label: "Visit the shrine", detail: "Prayer, blessings, offerings", to: "/prayer", icon: Flame },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  if (typeof window === "undefined") return { completed: [], lastCheckIn: "", streak: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      lastCheckIn: typeof parsed.lastCheckIn === "string" ? parsed.lastCheckIn : "",
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
    };
  } catch {
    return { completed: [], lastCheckIn: "", streak: 0 };
  }
}

function saveState(nextState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export default function LaunchQuests() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const checkedInToday = state.lastCheckIn === todayKey();
  const completed = useMemo(() => new Set(state.completed), [state.completed]);
  const progress = Math.min(100, Math.round(((completed.size + Math.min(state.streak, 3)) / (QUESTS.length + 3)) * 100));

  function toggleQuest(id) {
    setState((current) => {
      const nextCompleted = new Set(current.completed);
      if (nextCompleted.has(id)) nextCompleted.delete(id);
      else nextCompleted.add(id);
      return { ...current, completed: [...nextCompleted] };
    });
  }

  function checkIn() {
    const today = todayKey();
    setState((current) => {
      if (current.lastCheckIn === today) return current;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const streak = current.lastCheckIn === yesterday.toISOString().slice(0, 10) ? current.streak + 1 : 1;
      return { ...current, lastCheckIn: today, streak };
    });
  }

  return (
    <section className="foxcard relative overflow-hidden rounded-xl p-5">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dashboard-candle text-xs font-semibold uppercase tracking-widest text-cyan-200/80">launch loop</p>
          <h2 className="font-heading text-lg font-bold text-foreground">Daily Shrine Signal</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">A tiny route through the portal while relic rolls sleep.</p>
        </div>
        <Badge variant="outline" className="border-cyan-200/35 bg-cyan-300/10 text-cyan-100">
          {state.streak || 0} day streak
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-cyan-200/20 bg-slate-950/35 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-100">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">Today&apos;s visit</p>
              <p className="text-xs text-muted-foreground">{checkedInToday ? "Signal received." : "Light the daily marker."}</p>
            </div>
          </div>
          <Button type="button" className="mt-4 w-full gap-2" disabled={checkedInToday} onClick={checkIn}>
            {checkedInToday ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {checkedInToday ? "Checked In" : "Check In"}
          </Button>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Founder cache charge</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {QUESTS.map((quest) => {
            const Icon = quest.icon;
            const done = completed.has(quest.id);
            return (
              <div key={quest.id} className={`rounded-xl border p-3 transition ${done ? "border-emerald-300/35 bg-emerald-300/10" : "border-border bg-secondary/20"}`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${done ? "border-emerald-200/60 bg-emerald-300/20 text-emerald-100" : "border-cyan-200/20 bg-slate-950/30 text-cyan-100"}`}
                    onClick={() => toggleQuest(quest.id)}
                    aria-pressed={done}
                    aria-label={`${done ? "Clear" : "Complete"} ${quest.label}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-semibold">{quest.label}</p>
                    <p className="text-xs text-muted-foreground">{quest.detail}</p>
                    <Link to={quest.to} className="mt-2 inline-flex text-xs font-semibold text-primary hover:text-primary/80">
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-lg border border-violet-200/20 bg-violet-300/10 px-3 py-2 text-xs text-violet-100/85">
        <Gift className="h-3.5 w-3.5 shrink-0" />
        Relics and charms stay locked for now. This keeps people warming up profiles, polls, and shrine habits before the live ecosystem opens.
      </p>
    </section>
  );
}
