import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleDot, Fish, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DUPLICATE_POLICIES } from "@/lib/gameRewards";
import { FISH_BY_KEY } from "@/games/starfishing/content/fishCatalog";
import { STARFISHING_PHASES } from "@/games/starfishing/simulation/starfishingRules";

const ACTION_META = {
  "qte-left": { label: "Left", icon: ArrowLeft, key: "A / Left" },
  "qte-up": { label: "Up", icon: ArrowUp, key: "W / Up" },
  "qte-right": { label: "Right", icon: ArrowRight, key: "D / Right" },
  "qte-down": { label: "Down", icon: ArrowDown, key: "S / Down" },
};

function getPhaseCopy(phase) {
  if (phase === STARFISHING_PHASES.waiting) return "Line cast. Watch for a bite.";
  if (phase === STARFISHING_PHASES.qte) return "Bite. Match the constellation prompts.";
  if (phase === STARFISHING_PHASES.caught) return "Caught. Choose what to do with the glow.";
  if (phase === STARFISHING_PHASES.escaped) return "The catch escaped. Reset the line when ready.";
  return "Cast into the star pond.";
}

export default function StarfishingHud({
  state,
  rewardIntent,
  onCast,
  onQteAction,
  onDuplicateChoice,
  onReset,
}) {
  const activePrompt = state.qtePattern[state.qteIndex];
  const promptMeta = ACTION_META[activePrompt];
  const PromptIcon = promptMeta?.icon;
  const lastFish = state.lastCatch ? FISH_BY_KEY[state.lastCatch.fishKey] : null;

  return (
    <div className="space-y-3">
      <section className="foxcard rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-100/65">Starfishing</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Constellation reel</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{getPhaseCopy(state.phase)}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold text-cyan-100">
            <Fish className="h-3.5 w-3.5" />
            Streak {state.streak}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={onCast}
            disabled={![STARFISHING_PHASES.idle, STARFISHING_PHASES.escaped].includes(state.phase)}
            className="min-h-12 gap-2"
          >
            <CircleDot className="h-4 w-4" />
            Cast line
          </Button>
          <Button type="button" variant="outline" onClick={onReset} className="min-h-12 gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {state.phase === STARFISHING_PHASES.qte && promptMeta && (
          <div className="mt-4 rounded-xl border border-rose-200/25 bg-rose-200/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-100/70">QTE prompt</p>
                <p className="mt-1 text-sm font-bold text-rose-50">{promptMeta.key}</p>
              </div>
              <Button type="button" onClick={() => onQteAction(activePrompt)} className="min-h-11 gap-2">
                {PromptIcon && <PromptIcon className="h-4 w-4" />}
                Press {promptMeta.label}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Object.entries(ACTION_META).map(([action, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onQteAction(action)}
                    className={`min-h-11 rounded-lg border px-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      action === activePrompt
                        ? "border-rose-100/45 bg-rose-100/18 text-rose-50"
                        : "border-white/10 bg-white/[0.04] text-muted-foreground"
                    }`}
                  >
                    <Icon className="mx-auto h-4 w-4" />
                    <span className="mt-1 block">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {state.phase === STARFISHING_PHASES.escaped && state.escapedReason && (
          <div className="mt-4 rounded-lg border border-amber-200/25 bg-amber-200/10 p-3 text-sm text-amber-100">
            {state.escapedReason}
          </div>
        )}

        {state.phase === STARFISHING_PHASES.caught && lastFish && (
          <div className="mt-4 rounded-xl border border-cyan-200/25 bg-cyan-200/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/70">
                  {lastFish.rarity} · {lastFish.constellation}
                </p>
                <h3 className="mt-1 font-heading text-xl font-bold text-cyan-50">{lastFish.label}</h3>
                <p className="mt-1 text-sm text-cyan-50/70">{state.lastCatch.size}" starspan</p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-100/25 bg-cyan-100/15 text-cyan-100">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-cyan-50/75">{lastFish.lore}</p>

            {state.lastCatch.duplicate ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" onClick={() => onDuplicateChoice(DUPLICATE_POLICIES.keep)}>Keep</Button>
                <Button type="button" onClick={() => onDuplicateChoice(DUPLICATE_POLICIES.release)}>Release</Button>
                <Button type="button" variant="secondary" onClick={() => onDuplicateChoice(DUPLICATE_POLICIES.convert)}>Convert</Button>
              </div>
            ) : (
              <Button type="button" className="mt-4" onClick={() => onDuplicateChoice(DUPLICATE_POLICIES.none)}>
                Add to Fishpedia
              </Button>
            )}
          </div>
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
            Preview only. Real Favor and charm grants will move through the Phase 2 reward RPC.
          </p>
        </section>
      )}
    </div>
  );
}
