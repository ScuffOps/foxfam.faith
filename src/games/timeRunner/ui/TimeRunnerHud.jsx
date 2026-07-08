import {
  ChevronsRight,
  Clock3,
  HeartCrack,
  Hourglass,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";

const PHASE_COPY = {
  [TIME_RUNNER_PHASES.ready]: "The clocktower is waiting.",
  [TIME_RUNNER_PHASES.running]: "Time is folding under your feet.",
  [TIME_RUNNER_PHASES.finished]: "The loop has settled.",
};

const FINISH_COPY = {
  "clock-fractured": "The run fractured. The shards are still yours locally.",
  "tower-cleared": "Clocktower cleared. The hourglass hums softly.",
};

export default function TimeRunnerHud({
  state,
  rewardIntent,
  onStart,
  onReset,
  onAction,
  onClaimReward,
}) {
  const progress = Math.min(100, Math.round((state.elapsedMs / 45000) * 100));
  const canClaim = state.score > state.claimedScore || (state.completed && !rewardIntent);

  return (
    <div className="space-y-3">
      <section className="foxcard rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-amber-100/70">Time Runner</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Clocktower sprint</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {state.finishReason ? FINISH_COPY[state.finishReason] : PHASE_COPY[state.phase]}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-bold text-amber-100">
            <Clock3 className="h-3.5 w-3.5" />
            {progress}%
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={onStart}
            disabled={state.phase === TIME_RUNNER_PHASES.running}
            className="min-h-12 gap-2"
          >
            <ChevronsRight className="h-4 w-4" />
            {state.phase === TIME_RUNNER_PHASES.finished ? "Run again" : "Start run"}
          </Button>
          <Button type="button" variant="outline" onClick={onReset} className="min-h-12 gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <RunnerActionButton
            label="Leap"
            active={state.posture === TIME_RUNNER_POSTURES.jump}
            disabled={state.phase !== TIME_RUNNER_PHASES.running}
            onClick={() => onAction("qte-up")}
          />
          <RunnerActionButton
            label="Duck"
            active={state.posture === TIME_RUNNER_POSTURES.duck}
            disabled={state.phase !== TIME_RUNNER_PHASES.running}
            onClick={() => onAction("qte-down")}
          />
          <RunnerActionButton
            label="Skip"
            active={state.posture === TIME_RUNNER_POSTURES.focus}
            disabled={state.phase !== TIME_RUNNER_PHASES.running || state.focus < 30}
            onClick={() => onAction("qte-right")}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <StatPill icon={Sparkles} label="Score" value={state.score} />
          <StatPill icon={Hourglass} label="Shards" value={state.clockShards} />
          <StatPill icon={ShieldCheck} label="Combo" value={state.combo} />
          <StatPill icon={HeartCrack} label="Hearts" value={state.health} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-200 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-200 transition-all"
              style={{ width: `${Math.min(100, Math.round(state.focus))}%` }}
            />
          </div>
        </div>

        {state.lastMoment && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-muted-foreground">
            {state.lastMoment.label}
          </div>
        )}

        {state.phase === TIME_RUNNER_PHASES.finished && (
          <Button
            type="button"
            onClick={onClaimReward}
            disabled={!canClaim}
            className="mt-4 min-h-12 w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Preview local reward
          </Button>
        )}
      </section>

      {rewardIntent && (
        <section className="rounded-xl border border-emerald-200/25 bg-emerald-200/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-100/70">Local reward intent</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-emerald-50">
            <span className="rounded-full border border-emerald-100/25 bg-emerald-100/10 px-3 py-1 font-bold">
              +{rewardIntent.favorPreview} Favor preview
            </span>
            {rewardIntent.items.map((item) => (
              <span key={item.key} className="rounded-full border border-emerald-100/25 bg-emerald-100/10 px-3 py-1 font-bold">
                {item.quantity} {item.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-emerald-50/65">
            Preview only. No account, Favor, charm, or database records are changed.
          </p>
        </section>
      )}
    </div>
  );
}

function RunnerActionButton({ label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-lg border px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-amber-100/45 bg-amber-100/18 text-amber-50"
          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-amber-100/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-heading text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
