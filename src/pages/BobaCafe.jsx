import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Coffee,
  Eraser,
  Gift,
  Heart,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BOBA_CAFE_INGREDIENT_GROUPS,
  BOBA_INGREDIENTS_BY_KEY,
  SWEETNESS_BY_KEY,
  SWEETNESS_LEVELS,
  getIngredientLabel,
} from "@/games/bobaCafe/content/bobaCatalog";
import {
  BOBA_CAFE_PHASES,
  BOBA_CAFE_REWARD_LOG_KEY,
  BOBA_CAFE_STORAGE_KEY,
  BOBA_ORDER_LIMIT,
  buildBobaCafeRewardIntent,
  clearBobaTray,
  createInitialBobaCafeState,
  getPatiencePercent,
  getTrayCompletion,
  isTrayComplete,
  markBobaCafeClaimed,
  readLocalJson,
  selectBobaIngredient,
  selectBobaSweetness,
  startNextBobaOrder,
  submitBobaDrink,
  tickBobaCafe,
  writeLocalJson,
} from "@/games/bobaCafe/simulation/bobaCafeRules";
import { cn } from "@/lib/utils";

const CAFE_SEED = "dulcis-cafe-v1";

export default function BobaCafe() {
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState(() => (
    readLocalJson(BOBA_CAFE_STORAGE_KEY, null) || createInitialBobaCafeState({ seed: CAFE_SEED })
  ));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(BOBA_CAFE_REWARD_LOG_KEY, []));

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      setState((current) => tickBobaCafe(current, currentNow));
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    writeLocalJson(BOBA_CAFE_STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    writeLocalJson(BOBA_CAFE_REWARD_LOG_KEY, rewardLog.slice(0, 20));
  }, [rewardLog]);

  const activeOrder = state.activeOrder;
  const trayCompletion = getTrayCompletion(state.tray);
  const patiencePercent = activeOrder ? getPatiencePercent(activeOrder, now) : 0;
  const shiftProgress = Math.min(100, Math.round((state.servedCount / BOBA_ORDER_LIMIT) * 100));
  const latestRewardIntent = rewardLog[0] || null;
  const canClaim = state.score > state.claimedScore;

  const recipeRows = useMemo(() => {
    if (!activeOrder) return [];
    return [
      ["Tea", activeOrder.recipe.tea],
      ["Milk", activeOrder.recipe.milk],
      ["Pearls", activeOrder.recipe.topping],
      ["Charm", activeOrder.recipe.charm],
      ["Sweet", activeOrder.recipe.sweetness],
    ];
  }, [activeOrder]);

  const handleIngredient = (ingredientKey) => {
    setState((current) => selectBobaIngredient(current, ingredientKey));
  };

  const handleSweetness = (sweetnessKey) => {
    setState((current) => selectBobaSweetness(current, sweetnessKey));
  };

  const handleSubmit = () => {
    setState((current) => submitBobaDrink(current));
  };

  const handleNext = () => {
    setState((current) => startNextBobaOrder(current));
  };

  const handleClear = () => {
    setState((current) => clearBobaTray(current));
  };

  const handleRestart = () => {
    const nextState = createInitialBobaCafeState({ seed: CAFE_SEED });
    setState(nextState);
    setNow(Date.now());
  };

  const handleClaim = () => {
    const intent = buildBobaCafeRewardIntent({
      state,
      durationMs: Math.max(0, Date.now() - new Date(state.startedAt).getTime()),
    });
    if (!intent) return;

    setRewardLog((current) => [intent, ...current].slice(0, 20));
    setState((current) => markBobaCafeClaimed(current));
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/quarters"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-pink-200/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quarters
          </Link>
          <div className="mb-2 mt-3 flex items-center gap-2 text-pink-100/80">
            <Coffee className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Priory pop-up counter</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Boba Shop Cafe</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Serve cozy capsule drinks, keep the counter moving, and bank local reward intents for later portal economy wiring.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/25 bg-pink-300/10 px-3 py-1 text-xs font-bold text-pink-50">
          <Sparkles className="h-3.5 w-3.5" />
          Local prototype rewards
        </div>
      </header>

      <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#211833] shadow-[0_24px_80px_rgba(8,5,20,0.42)]">
          <div className="relative min-h-[34rem] overflow-hidden bg-[linear-gradient(180deg,#513257_0%,#2d2345_52%,#171827_100%)]">
            <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_22%_18%,rgba(251,207,232,0.4),transparent_24%),radial-gradient(circle_at_78%_8%,rgba(125,211,252,0.34),transparent_22%)]" />
            <div className="absolute left-6 right-6 top-7 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#291e3e]/85 p-3 shadow-[0_14px_30px_rgba(0,0,0,0.24)] backdrop-blur">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-pink-100/70">Ticket {Math.min(state.servedCount + 1, BOBA_ORDER_LIMIT)} / {BOBA_ORDER_LIMIT}</p>
                <h2 className="mt-1 truncate font-heading text-xl font-bold text-white">{activeOrder?.label || "Shift wrapped"}</h2>
              </div>
              <div className="flex min-w-[8rem] items-center gap-2 text-right text-sm font-bold text-amber-100">
                <Timer className="h-4 w-4" />
                <Progress value={patiencePercent} className="h-2 bg-white/15 [&>div]:bg-[linear-gradient(90deg,#86efac,#fde68a,#fb7185)]" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-36 bg-[#37213d] shadow-[0_-16px_60px_rgba(0,0,0,0.22)]">
              <div className="absolute inset-x-0 top-0 h-3 bg-[repeating-linear-gradient(90deg,#f9a8d4_0_42px,#fef3c7_42px_84px,#a7f3d0_84px_126px,#93c5fd_126px_168px)]" />
            </div>

            <CustomerStage order={activeOrder} result={state.lastResult} />
            <DrinkPreview tray={state.tray} activeOrder={activeOrder} phase={state.phase} />

            <div className="absolute bottom-8 left-5 right-5 grid gap-3 lg:grid-cols-[1fr_20rem]">
              <div className="rounded-xl border border-white/15 bg-[#120d1f]/78 p-3 shadow-[0_16px_36px_rgba(0,0,0,0.25)] backdrop-blur">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recipeRows.map(([label, key]) => (
                    <RecipeChip
                      key={`${label}-${key}`}
                      label={label}
                      expectedKey={key}
                      selectedKey={state.tray[label === "Sweet" ? "sweetness" : label.toLowerCase() === "pearls" ? "topping" : label.toLowerCase()]}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-[#120d1f]/78 p-3 shadow-[0_16px_36px_rgba(0,0,0,0.25)] backdrop-blur">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Tray</span>
                  <span>{trayCompletion}%</span>
                </div>
                <Progress value={trayCompletion} className="h-2 bg-white/15 [&>div]:bg-[linear-gradient(90deg,#f9a8d4,#67e8f9)]" />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClear} disabled={state.phase !== BOBA_CAFE_PHASES.serving}>
                    <Eraser className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={state.phase !== BOBA_CAFE_PHASES.serving || !isTrayComplete(state.tray)}>
                    <Send className="h-4 w-4" />
                    Serve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="grid grid-cols-2 gap-3">
              <StatPill label="Score" value={state.score} />
              <StatPill label="Combo" value={state.bestCombo} />
              <StatPill label="Perfect" value={state.perfectCount} />
              <StatPill label="Served" value={`${state.servedCount}/${BOBA_ORDER_LIMIT}`} />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Shift</span>
                <span>{shiftProgress}%</span>
              </div>
              <Progress value={shiftProgress} className="h-2 bg-white/15 [&>div]:bg-[linear-gradient(90deg,#a7f3d0,#f9a8d4)]" />
            </div>
          </section>

          {state.phase === BOBA_CAFE_PHASES.result && (
            <section className="rounded-xl border border-pink-200/20 bg-pink-200/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-pink-100/70">Counter result</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-white">{state.lastResult?.message}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                +{state.lastResult?.score || 0} score, {state.lastResult?.matches.length || 0}/5 matches.
              </p>
              <Button className="mt-3 w-full" onClick={handleNext}>
                <Check className="h-4 w-4" />
                Next ticket
              </Button>
            </section>
          )}

          {state.phase === BOBA_CAFE_PHASES.shiftComplete && (
            <section className="rounded-xl border border-emerald-200/20 bg-emerald-200/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-100/70">Shift complete</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-white">Cafe lights are warm.</h2>
              <div className="mt-3 grid gap-2">
                <Button onClick={handleClaim} disabled={!canClaim}>
                  <Gift className="h-4 w-4" />
                  Claim local intent
                </Button>
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4" />
                  New shift
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Ingredients</p>
            <div className="mt-3 space-y-4">
              {BOBA_CAFE_INGREDIENT_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-xs font-bold text-pink-50/80">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((option) => (
                      <IngredientButton
                        key={option.key}
                        option={option}
                        selected={state.tray[group.key] === option.key}
                        disabled={state.phase !== BOBA_CAFE_PHASES.serving}
                        onClick={() => handleIngredient(option.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-2 text-xs font-bold text-pink-50/80">Sweetness</p>
                <div className="grid grid-cols-3 gap-2">
                  {SWEETNESS_LEVELS.map((level) => (
                    <button
                      key={level.key}
                      type="button"
                      disabled={state.phase !== BOBA_CAFE_PHASES.serving}
                      onClick={() => handleSweetness(level.key)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                        state.tray.sweetness === level.key
                          ? "border-amber-200/75 bg-amber-200/25 text-amber-50"
                          : "border-white/10 bg-black/15 text-muted-foreground hover:border-amber-200/40 hover:text-foreground",
                      )}
                    >
                      {level.value}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local log</p>
              {latestRewardIntent && <span className="text-xs font-bold text-emerald-100">+{latestRewardIntent.favorPreview} Favor</span>}
            </div>
            {rewardLog.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No local cafe claims yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {rewardLog.slice(0, 4).map((intent) => (
                  <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{intent.eventType}</span>
                      <span className="text-xs font-bold text-pink-100">{intent.score} score</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

function CustomerStage({ order, result }) {
  const palette = order?.customer?.palette || ["#f9a8d4", "#93c5fd"];

  return (
    <div className="absolute left-8 top-28 flex items-end gap-5 sm:left-14">
      <div className="relative h-44 w-32">
        <div className="absolute left-1/2 top-5 h-20 w-20 -translate-x-1/2 rounded-full border-4 border-[#2d1c34] shadow-[inset_0_-10px_0_rgba(0,0,0,0.12)]" style={{ background: palette[0] }} />
        <div className="absolute left-1/2 top-20 h-20 w-28 -translate-x-1/2 rounded-t-[2rem] border-4 border-[#2d1c34] shadow-[inset_0_12px_0_rgba(255,255,255,0.16)]" style={{ background: palette[1] }} />
        <div className="absolute left-8 top-14 h-3 w-3 rounded-full bg-[#2d1c34]" />
        <div className="absolute right-8 top-14 h-3 w-3 rounded-full bg-[#2d1c34]" />
        <div className="absolute left-12 top-[4.35rem] h-2 w-8 rounded-full bg-[#2d1c34]/70" />
      </div>
      <div className="mb-12 max-w-[14rem] rounded-xl border border-white/20 bg-white/90 p-3 text-[#281735] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b4967]">{order?.customer?.label || "Last guest"}</p>
        <p className="mt-1 font-heading text-lg font-bold">{result?.message || order?.label || "Thank you"}</p>
      </div>
    </div>
  );
}

function DrinkPreview({ tray, activeOrder, phase }) {
  const tea = BOBA_INGREDIENTS_BY_KEY[tray.tea];
  const milk = BOBA_INGREDIENTS_BY_KEY[tray.milk];
  const topping = BOBA_INGREDIENTS_BY_KEY[tray.topping];
  const charm = BOBA_INGREDIENTS_BY_KEY[tray.charm];
  const sweetness = SWEETNESS_BY_KEY[tray.sweetness];
  const liquidColor = milk?.accent || tea?.accent || "#f9a8d4";
  const teaColor = tea?.accent || "#7dd3fc";

  return (
    <div className="absolute right-8 top-28 h-80 w-60 sm:right-16">
      <div className="absolute left-14 top-0 h-12 w-28 rounded-t-full border-4 border-[#2b1a32] bg-[#fef3c7]" />
      <div className="absolute left-10 top-8 h-56 w-36 overflow-hidden rounded-b-[2rem] rounded-t-lg border-4 border-[#2b1a32] bg-white/45 shadow-[inset_0_10px_0_rgba(255,255,255,0.5),0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="absolute bottom-0 left-0 right-0 h-3/4" style={{ background: liquidColor }} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-75" style={{ background: teaColor }} />
        {topping && Array.from({ length: 12 }).map((_, index) => (
          <span
            key={`${topping.key}-${index}`}
            className="absolute h-4 w-4 rounded-full border-2 border-[#2b1a32]/60"
            style={{
              left: `${16 + (index % 4) * 24}px`,
              bottom: `${12 + Math.floor(index / 4) * 18}px`,
              background: topping.accent,
            }}
          />
        ))}
      </div>
      <div className="absolute left-[7.8rem] top-2 h-48 w-5 -rotate-12 rounded-full border-4 border-[#2b1a32] bg-[#fef3c7]" />
      <div className="absolute left-[4.8rem] top-3 rounded-full border-4 border-[#2b1a32] px-5 py-2 text-xs font-black text-[#2b1a32]" style={{ background: charm?.accent || "#f9a8d4" }}>
        {charm ? charm.label.split(" ")[0] : "Cafe"}
      </div>
      <div className="absolute bottom-0 left-5 right-5 rounded-xl border border-white/15 bg-[#120d1f]/75 p-3 text-center text-xs font-bold text-pink-50 backdrop-blur">
        {phase === BOBA_CAFE_PHASES.shiftComplete ? "Closed" : sweetness ? `${sweetness.value}% sweetness` : activeOrder?.label || "Ready"}
      </div>
    </div>
  );
}

function RecipeChip({ label, expectedKey, selectedKey }) {
  const matched = selectedKey === expectedKey;

  return (
    <div className={cn(
      "min-w-24 flex-none rounded-lg border px-2 py-2 text-xs transition-all",
      matched ? "border-emerald-200/50 bg-emerald-200/15 text-emerald-50" : "border-white/10 bg-white/[0.04] text-muted-foreground",
    )}>
      <p className="font-bold text-white">{label}</p>
      <p className="mt-1 break-words leading-4">{getIngredientLabel(expectedKey)}</p>
    </div>
  );
}

function IngredientButton({ option, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        selected
          ? "border-pink-200/70 bg-pink-200/20 text-pink-50 shadow-[0_8px_20px_rgba(244,114,182,0.16)]"
          : "border-white/10 bg-black/15 text-muted-foreground hover:border-pink-200/40 hover:text-foreground",
      )}
    >
      <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{ background: option.accent }} />
      <span className="min-w-0 truncate">{option.label}</span>
    </button>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-heading text-xl font-bold text-white">
        {label === "Perfect" && <Heart className="h-4 w-4 text-pink-200" />}
        {value}
      </p>
    </div>
  );
}
