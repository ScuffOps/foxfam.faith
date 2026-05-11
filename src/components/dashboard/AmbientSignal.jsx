import { MoonStar, Radio, Sparkles } from "lucide-react";
import GlassCard from "../GlassCard";

const SIGNAL_LINES = [
  "Soft static gathers at the edge of the shrine.",
  "A little omen is warming its hands by the dashboard.",
  "The air tastes like midnight, rain, and good trouble.",
  "Someone left the signal on. It is humming back.",
];

function getDailySignal() {
  const dayKey = Math.floor(Date.now() / 86400000);
  return SIGNAL_LINES[dayKey % SIGNAL_LINES.length];
}

export default function AmbientSignal() {
  const signal = getDailySignal();

  return (
    <GlassCard className="dashboard-ambient-card flex h-full min-h-[15rem] flex-col justify-between overflow-hidden">
      <div className="dashboard-ambient-glow" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="dashboard-icon-well flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <MoonStar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold">Midnight Signal</h3>
            <p className="text-[11px] text-muted-foreground">ambient shrine channel</p>
          </div>
        </div>
        <div className="dashboard-ambient-pulse flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent">
          <Radio className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="my-6">
        <p className="max-w-[16rem] text-sm leading-relaxed text-foreground">{signal}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["signal", "glow", "omen"].map((label, index) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary/80" />
              {label}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary/70">
              <div
                className="dashboard-ambient-meter h-full rounded-full bg-gradient-to-r from-primary via-accent to-chart-3"
                style={{ width: `${58 + index * 13}%`, animationDelay: `${index * 180}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
