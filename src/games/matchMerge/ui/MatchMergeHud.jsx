import { Hammer, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMatchMergeBoardLocked } from "@/games/matchMerge/simulation/matchMergeRules";

export default function MatchMergeHud({ state, rewardIntent, rewardLog = [], onClaim, onReset }) {
  const unclaimedScore = Math.max(0, state.score - state.claimedScore);
  const locked = isMatchMergeBoardLocked(state.grid);

  return (
    <div className="space-y-3">
      <section className="foxcard rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-amber-100/65">Forge Sort</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Material chain</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Build combos for Moonwax, Charm Cord, and Sigil Shards.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold text-cyan-100">
            <Trophy className="h-3.5 w-3.5" />
            {state.moves} merges
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Score" value={state.score} />
          <Stat label="Chain" value={state.mergeStreak} />
          <Stat label="Ready" value={unclaimedScore} />
        </div>

        {locked && (
          <div className="mt-4 rounded-lg border border-amber-200/25 bg-amber-200/10 p-3 text-sm text-amber-100">
            No neighboring twins remain. Claim the bench and reset for a fresh shelf.
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={onClaim} disabled={unclaimedScore <= 0} className="min-h-12 gap-2">
            <Hammer className="h-4 w-4" />
            Claim preview
          </Button>
          <Button type="button" variant="outline" onClick={onReset} className="min-h-12 gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset bench
          </Button>
        </div>
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
            Preview only. Phase 2 will validate forge grants server-side.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local log</p>
        {rewardLog.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No forge claims logged yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rewardLog.slice(0, 5).map((intent) => (
              <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">{intent.eventType}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    {intent.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
