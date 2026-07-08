import { Gem, Sparkles } from "lucide-react";

const TILE_CLASS = {
  1: "border-sky-200/30 bg-sky-200/12 text-sky-50",
  2: "border-amber-200/35 bg-amber-200/14 text-amber-50",
  3: "border-emerald-200/35 bg-emerald-200/14 text-emerald-50",
  4: "border-violet-200/35 bg-violet-200/14 text-violet-50",
  5: "border-rose-200/35 bg-rose-200/14 text-rose-50",
};

export default function MatchMergeBoard({ state, onSelectCell }) {
  return (
    <section className="foxcard rounded-xl p-4" aria-labelledby="match-merge-board-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-amber-100/65">Reliquary Bench</p>
          <h2 id="match-merge-board-heading" className="mt-1 font-heading text-lg font-bold">
            Match & Merge
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Select neighboring twins to forge higher-tier materials.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-bold text-amber-100">
          <Sparkles className="h-3.5 w-3.5" />
          Tier {state.highestTier}
        </span>
      </div>

      <div className="mt-5 grid aspect-square max-h-[36rem] grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/18 p-2">
        {state.grid.map((tile, index) => {
          const selected = state.selectedIndex === index;
          return (
            <button
              key={tile?.id || `empty-${index}`}
              type="button"
              onClick={() => onSelectCell(index)}
              className={`relative flex min-h-16 items-center justify-center rounded-xl border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tile
                  ? `${TILE_CLASS[tile.tier] || TILE_CLASS[1]} ${selected ? "scale-[0.96] ring-2 ring-white/65" : "hover:scale-[1.02]"}`
                  : "border-white/8 bg-white/[0.025] text-white/20"
              }`}
              aria-label={tile ? `${tile.label}, tier ${tile.tier}` : "Empty reliquary space"}
            >
              {tile ? (
                <span className="flex flex-col items-center gap-1 px-1">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/20 bg-black/16">
                    <Gem className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold leading-tight sm:text-xs">{tile.label}</span>
                </span>
              ) : (
                <span className="h-5 w-5 rounded-full border border-current/30" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
