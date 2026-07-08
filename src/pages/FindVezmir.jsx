import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Gift,
  Lightbulb,
  LocateFixed,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { FIND_VEZMIR_OBJECTS } from "@/games/findVezmir/content/hiddenObjects";
import {
  createInitialFindVezmirState,
  FIND_VEZMIR_PHASES,
  FIND_VEZMIR_REWARD_LOG_KEY,
  buildFindVezmirRewardIntent,
  getFindVezmirDurationMs,
  getFindVezmirTargetRows,
  markFindVezmirRewardClaimed,
  readLocalJson,
  requestFindVezmirHint,
  resolveFindVezmirTap,
  writeLocalJson,
} from "@/games/findVezmir/simulation/findVezmirRules";

const FIELD_STYLE = {
  background:
    "radial-gradient(circle at 18% 18%, rgba(255, 213, 128, 0.22), transparent 26%), linear-gradient(135deg, #171936 0%, #203c4a 48%, #542f4e 100%)",
};

export default function FindVezmir() {
  const playfieldRef = useRef(null);
  const [state, setState] = useState(() => createInitialFindVezmirState());
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, []));

  useEffect(() => {
    writeLocalJson(FIND_VEZMIR_REWARD_LOG_KEY, rewardLog.slice(0, 20));
  }, [rewardLog]);

  const targetRows = useMemo(() => getFindVezmirTargetRows(state), [state]);
  const foundCount = state.foundKeys.length;
  const complete = state.phase === FIND_VEZMIR_PHASES.complete;
  const durationSeconds = Math.round(getFindVezmirDurationMs(state) / 1000);

  const handleObjectTap = (objectKey) => {
    setState((current) => resolveFindVezmirTap(current, { objectKey }, Date.now()));
  };

  const handleFieldTap = (event) => {
    if (!playfieldRef.current || event.target !== event.currentTarget) return;
    const bounds = playfieldRef.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setState((current) => resolveFindVezmirTap(current, { x, y }, Date.now()));
  };

  const handleHint = () => {
    setState((current) => requestFindVezmirHint(current));
  };

  const handleClaim = () => {
    if (!complete || state.lastRewardIntent) return;
    const durationMs = getFindVezmirDurationMs(state);
    const intent = buildFindVezmirRewardIntent({ state, durationMs });
    if (!intent) return;

    setRewardLog((current) => [intent, ...current].slice(0, 20));
    setState((current) => markFindVezmirRewardClaimed(current, { durationMs, eventId: intent.eventId, createdAt: intent.createdAt }));
  };

  const handleReset = () => {
    setState(createInitialFindVezmirState());
  };

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/quarters"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-muted-foreground transition-all hover:border-amber-200/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quarters
          </Link>
          <div className="mb-2 mt-3 flex items-center gap-2 text-amber-100/80">
            <Search className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Hidden-object shrine nook</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Find Vezmir</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Gather every clue trinket in the cozy nook, then catch Vezmir peeking from the curtain folds.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[19rem]">
          <StatPill label="Found" value={`${foundCount}/6`} tone="amber" />
          <StatPill label="Focus" value={state.focus} tone="emerald" />
          <StatPill label="Score" value={state.score} tone="rose" />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-2xl shadow-black/25">
          <div
            ref={playfieldRef}
            className="relative aspect-[16/10] min-h-[23rem] overflow-hidden rounded-xl"
            style={FIELD_STYLE}
            onClick={handleFieldTap}
            aria-label="Find Vezmir hidden object playfield"
          >
            <ShrineScene />

            {FIND_VEZMIR_OBJECTS.map((object) => {
              const target = targetRows.find((row) => row.key === object.key);
              return (
                <button
                  key={object.key}
                  type="button"
                  aria-label={`Search for ${object.label}`}
                  aria-pressed={target?.found || false}
                  className={[
                    "absolute z-20 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200",
                    target?.found
                      ? "border-emerald-200/80 bg-emerald-300/20 shadow-[0_0_24px_rgba(110,231,183,0.35)]"
                      : "border-transparent bg-transparent hover:border-amber-100/50 hover:bg-amber-100/10",
                    target?.hinted ? "border-amber-200/90 bg-amber-200/20 shadow-[0_0_26px_rgba(251,191,36,0.45)]" : "",
                  ].join(" ")}
                  style={{
                    left: `${object.hotspot.x}%`,
                    top: `${object.hotspot.y}%`,
                    width: `${object.hotspot.width}%`,
                    height: `${object.hotspot.height}%`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleObjectTap(object.key);
                  }}
                >
                  <span className="sr-only">{object.description}</span>
                  {(target?.found || target?.hinted) && (
                    <span className="absolute -top-7 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-950/35 bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-amber-50 shadow-lg">
                      {target.found ? <CheckCircle2 className="h-3 w-3 text-emerald-200" /> : <LocateFixed className="h-3 w-3 text-amber-200" />}
                      {object.shortLabel}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pointer-events-none absolute left-4 top-4 z-30 max-w-[18rem] rounded-xl border border-slate-950/30 bg-slate-950/70 p-3 shadow-xl backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100/80">Case note</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-amber-50">{state.message}</p>
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Clue tray</p>
                <h2 className="mt-1 font-heading text-lg font-bold">Objects</h2>
              </div>
              <Eye className="h-5 w-5 text-amber-100/75" />
            </div>

            <div className="mt-4 grid gap-2">
              {targetRows.map((target) => (
                <div
                  key={target.key}
                  className={[
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    target.found
                      ? "border-emerald-200/30 bg-emerald-200/10 text-emerald-50"
                      : target.locked
                        ? "border-white/10 bg-black/15 text-muted-foreground"
                        : "border-amber-200/18 bg-amber-100/[0.06] text-foreground",
                  ].join(" ")}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/20">
                    {target.found ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : <Search className="h-4 w-4 text-amber-100/70" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{target.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{target.locked ? "Locked until the clues are found" : target.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleHint}
                disabled={complete}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lightbulb className="h-4 w-4" />
                Hint
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm font-bold text-muted-foreground transition hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

            <button
              type="button"
              onClick={handleClaim}
              disabled={!complete || Boolean(state.lastRewardIntent)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200/25 bg-emerald-300/12 px-3 py-2 text-sm font-bold text-emerald-50 transition hover:border-emerald-200/45 hover:bg-emerald-300/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Gift className="h-4 w-4" />
              {state.lastRewardIntent ? "Intent logged" : "Claim local intent"}
            </button>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <StatPill label="Misses" value={state.misses} tone="rose" />
              <StatPill label="Hints" value={state.hintsUsed} tone="amber" />
              <StatPill label="Time" value={`${durationSeconds}s`} tone="emerald" />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Recent local intents</p>
              <Sparkles className="h-4 w-4 text-emerald-100/70" />
            </div>
            {rewardLog.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No Find Vezmir clears logged yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {rewardLog.slice(0, 4).map((intent) => (
                  <article key={intent.eventId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-foreground">{intent.eventType}</p>
                      <p className="text-xs font-bold text-emerald-100">+{intent.favorPreview} Favor</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function ShrineScene() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" role="img" aria-label="Cozy shrine nook with hidden objects">
      <defs>
        <linearGradient id="vezmirWall" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#263657" />
          <stop offset="50%" stopColor="#2e6b72" />
          <stop offset="100%" stopColor="#7b3f68" />
        </linearGradient>
        <linearGradient id="vezmirFloor" x1="0" x2="1">
          <stop offset="0%" stopColor="#322649" />
          <stop offset="100%" stopColor="#183a42" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#070817" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#vezmirWall)" />
      <circle cx="270" cy="150" r="170" fill="#ffd48c" opacity="0.18" />
      <circle cx="1310" cy="170" r="120" fill="#83e6d2" opacity="0.12" />
      <path d="M0 730 C270 675 400 770 650 718 C910 662 1050 704 1600 650 L1600 1000 L0 1000 Z" fill="url(#vezmirFloor)" />

      <g filter="url(#softShadow)">
        <rect x="690" y="110" width="360" height="360" rx="38" fill="#17213d" stroke="#11162c" strokeWidth="12" />
        <rect x="730" y="150" width="280" height="280" rx="28" fill="#2b5970" />
        <circle cx="865" cy="280" r="86" fill="#ffd58a" />
        <path d="M820 288 C862 242 900 242 942 288 C920 336 842 336 820 288 Z" fill="#f9f1bd" opacity="0.72" />
        <path d="M706 104 C770 66 970 66 1040 104 L1012 152 C942 126 805 126 735 152 Z" fill="#f07378" />
      </g>

      <g filter="url(#softShadow)">
        <path d="M640 282 C690 238 760 230 816 272 L794 790 L604 790 Z" fill="#a24c69" />
        <path d="M956 272 C1016 232 1098 250 1140 304 L1048 792 L862 792 Z" fill="#e07374" />
        <path d="M781 256 C830 224 905 224 960 262 L926 805 L744 805 Z" fill="#53355d" />
        <path d="M797 462 C832 426 900 424 935 462 L923 600 L810 600 Z" fill="#251d3f" opacity="0.72" />
        <circle cx="873" cy="474" r="22" fill="#1b1832" />
        <path d="M840 505 C858 520 892 520 910 505" fill="none" stroke="#ffd58a" strokeWidth="9" strokeLinecap="round" />
      </g>

      <g filter="url(#softShadow)">
        <rect x="180" y="258" width="490" height="44" rx="18" fill="#201832" stroke="#10101f" strokeWidth="8" />
        <rect x="230" y="300" width="70" height="265" rx="18" fill="#2a2440" />
        <rect x="552" y="300" width="70" height="265" rx="18" fill="#2a2440" />
        <rect x="196" y="514" width="456" height="48" rx="18" fill="#21172c" stroke="#10101f" strokeWidth="8" />
        <circle cx="318" cy="392" r="48" fill="#ffc36d" />
        <rect x="390" y="348" width="96" height="72" rx="18" fill="#6fd0c0" />
        <path d="M560 354 C594 378 594 424 560 448 C526 424 526 378 560 354 Z" fill="#c585f4" />
        <circle cx="612" cy="392" r="20" fill="#f6e39b" />
        <path d="M575 394 L612 430 L650 388" fill="none" stroke="#17213d" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="610" cy="470" r="19" fill="#f6df8d" />
        <path d="M610 489 C592 514 628 514 610 489 Z" fill="#ef7773" />
      </g>

      <g filter="url(#softShadow)">
        <ellipse cx="900" cy="800" rx="290" ry="86" fill="#1b1830" opacity="0.44" />
        <path d="M565 762 C650 674 778 666 870 756 C792 822 644 840 565 762 Z" fill="#f3bf80" />
        <path d="M720 756 C800 682 925 690 1006 768 C932 828 790 836 720 756 Z" fill="#83d9ce" />
        <path d="M962 746 C1058 660 1200 686 1278 782 C1180 842 1036 830 962 746 Z" fill="#f58b83" />
        <circle cx="996" cy="760" r="34" fill="#ffd98b" />
        <path d="M968 754 C988 730 1018 732 1038 754 C1014 786 992 786 968 754 Z" fill="#7b3f68" />
      </g>

      <g filter="url(#softShadow)">
        <rect x="1226" y="536" width="212" height="58" rx="22" fill="#27314d" />
        <rect x="1260" y="408" width="146" height="150" rx="34" fill="#214b4f" />
        <path d="M1290 410 C1314 352 1362 352 1386 410 Z" fill="#83d9ce" />
        <circle cx="1336" cy="478" r="42" fill="#ffcf82" />
        <path d="M1298 642 C1336 600 1400 604 1432 650 L1414 814 L1276 814 Z" fill="#80cfa7" />
        <path d="M1320 674 L1394 714 L1318 742 Z" fill="#f1cf75" />
      </g>

      <g filter="url(#softShadow)">
        <rect x="165" y="694" width="218" height="116" rx="34" fill="#443251" />
        <rect x="194" y="666" width="132" height="84" rx="26" fill="#f2c37a" />
        <path d="M325 698 C374 686 380 746 330 746" fill="none" stroke="#f2c37a" strokeWidth="24" strokeLinecap="round" />
        <rect x="214" y="650" width="92" height="26" rx="13" fill="#fff0b8" opacity="0.68" />
      </g>

      <g>
        <path d="M1232 300 L1260 270 L1288 300 L1260 330 Z" fill="#ffd98b" opacity="0.72" />
        <path d="M1380 228 L1402 204 L1424 228 L1402 252 Z" fill="#9ae6d3" opacity="0.72" />
        <path d="M118 214 L142 190 L166 214 L142 238 Z" fill="#ff9aa2" opacity="0.72" />
        <path d="M478 182 L500 158 L522 182 L500 206 Z" fill="#f8dc88" opacity="0.72" />
      </g>
    </svg>
  );
}

function StatPill({ label, value, tone }) {
  const toneClasses = {
    amber: "border-amber-200/20 bg-amber-200/10 text-amber-50",
    emerald: "border-emerald-200/20 bg-emerald-200/10 text-emerald-50",
    rose: "border-rose-200/20 bg-rose-200/10 text-rose-50",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClasses[tone] || toneClasses.amber}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 font-heading text-base font-bold">{value}</p>
    </div>
  );
}

