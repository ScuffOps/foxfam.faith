import { Fish, Ruler, Sparkles } from "lucide-react";
import { getFishpediaRows } from "@/games/starfishing/simulation/starfishingRules";

const RARITY_CLASS = {
  common: "border-slate-200/20 bg-slate-200/10 text-slate-100",
  uncommon: "border-emerald-200/25 bg-emerald-200/10 text-emerald-100",
  rare: "border-cyan-200/25 bg-cyan-200/10 text-cyan-100",
  epic: "border-violet-200/30 bg-violet-200/10 text-violet-100",
  mythic: "border-amber-200/35 bg-amber-200/10 text-amber-100",
};

const SILHOUETTE_CLASS = {
  "ember-mote": "h-7 w-7 rounded-full",
  "lunar-guppy": "h-6 w-10 rounded-[55%_45%_50%_50%]",
  "aurora-minnow": "h-5 w-12 rounded-[65%_35%_55%_45%]",
  "comet-koi": "h-7 w-14 rounded-[70%_30%_55%_45%]",
  "eclipse-ray": "h-8 w-14 rounded-[50%_50%_70%_70%]",
  "veri-starwhale": "h-8 w-16 rounded-[70%_35%_55%_45%]",
};

function FishSilhouette({ fish }) {
  return (
    <span
      aria-label={`${fish.rarity} fish silhouette`}
      className="relative inline-flex h-12 w-14 items-center justify-center"
      role="img"
    >
      <span className={`block bg-current opacity-45 ${SILHOUETTE_CLASS[fish.key] || SILHOUETTE_CLASS["ember-mote"]}`} />
      <span className="absolute right-1 h-4 w-4 rotate-45 rounded-sm bg-current opacity-35" />
      <span className="absolute left-4 top-1 h-2 w-2 rounded-full bg-cyan-100/45" />
    </span>
  );
}

export default function FishpediaPanel({ fishpedia = {} }) {
  const rows = getFishpediaRows(fishpedia);
  const discoveredCount = rows.filter((row) => row.discovered).length;

  return (
    <section className="foxcard rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-100/65">Fishpedia</p>
          <h2 className="mt-1 font-heading text-lg font-bold">Constellation glossary</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Track catches, biggest sizes, and silhouettes still hiding in the pond.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          {discoveredCount}/{rows.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((fish) => (
          <article
            key={fish.key}
            className={`min-h-40 rounded-xl border p-3 ${fish.discovered ? RARITY_CLASS[fish.rarity] : "border-white/10 bg-white/[0.035] text-muted-foreground"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  {fish.discovered ? fish.rarity : "Unknown"}
                </p>
                <h3 className="mt-1 text-sm font-bold">
                  {fish.discovered ? fish.label : "Undiscovered"}
                </h3>
              </div>
              <span className="inline-flex h-12 w-14 items-center justify-center rounded-xl border border-current/20 bg-black/15">
                {fish.discovered ? <Fish className="h-5 w-5" /> : <FishSilhouette fish={fish} />}
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-current/15 bg-black/15 p-3">
              {fish.discovered ? (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <Ruler className="h-3.5 w-3.5" />
                    <span>Biggest: {fish.biggestSize}"</span>
                  </div>
                  <p className="mt-1 text-xs opacity-75">{fish.caughtCount} caught</p>
                </>
              ) : (
                <p className="text-xs leading-5 opacity-70">
                  Catch this constellation to reveal its record.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
