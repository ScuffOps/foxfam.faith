import { useMemo, useState } from "react";
import { Fish, Ruler, Sparkles } from "lucide-react";
import { STARFISHING_FISH } from "@/games/starfishing/content/fishCatalog";
import { getFishpediaRows } from "@/games/starfishing/simulation/starfishingRules";

const TABS = [
  { key: "all", label: "All stars" },
  { key: "caught", label: "Caught" },
  { key: "hidden", label: "Silhouettes" },
];

export default function FishpediaPanel({ fishpedia = {}, authoritativeRows = null }) {
  const [tab, setTab] = useState("all");
  const rows = useMemo(() => {
    if (!Array.isArray(authoritativeRows)) return getFishpediaRows(fishpedia);
    const records = new Map(authoritativeRows.map((record) => [record.fishKey, record]));
    return STARFISHING_FISH.map((fish) => {
      const record = records.get(fish.key);
      return {
        ...fish,
        discovered: Boolean(record),
        caughtCount: record?.caughtCount || 0,
        biggestSize: record?.largestSize || 0,
        smallestSize: record?.smallestSize || 0,
      };
    });
  }, [authoritativeRows, fishpedia]);
  const discoveredCount = rows.filter((row) => row.discovered).length;
  const visibleRows = useMemo(() => rows.filter((fish) => (
    tab === "all" || (tab === "caught" ? fish.discovered : !fish.discovered)
  )), [rows, tab]);

  return (
    <section className="fishpedia" aria-labelledby="fishpedia-title">
      <header className="fishpedia__header">
        <div><p>Illustrated field ledger</p><h2 id="fishpedia-title">Fishpedia</h2></div>
        <span><Sparkles aria-hidden="true" /> {discoveredCount}/{rows.length}</span>
      </header>
      <div className="fishpedia__tabs" role="tablist" aria-label="Filter Fishpedia">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</button>
        ))}
      </div>
      <div className="fishpedia__grid" role="tabpanel">
        {visibleRows.map((fish) => (
          <article className="fish-entry" data-rarity={fish.discovered ? fish.rarity : "hidden"} key={fish.key}>
            <div className="fish-entry__portrait" aria-label={fish.discovered ? fish.label : "Undiscovered fish silhouette"} role="img">
              <Fish aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
            <div className="fish-entry__copy">
              <p>{fish.discovered ? `${fish.rarity} · ${fish.constellation}` : "Unknown constellation"}</p>
              <h3>{fish.discovered ? fish.label : "Uncharted star"}</h3>
              {fish.discovered ? (
                <span>
                  <Ruler aria-hidden="true" />
                  {fish.biggestSize}&quot; best
                  {fish.smallestSize ? ` · ${fish.smallestSize}" smallest` : ""}
                  {` · ${fish.caughtCount} caught`}
                </span>
              ) : <span>Its shape waits beneath the moonwater.</span>}
            </div>
          </article>
        ))}
        {!visibleRows.length ? <p className="fishpedia__empty">No entries in this page yet. The pond has plenty of patience.</p> : null}
      </div>
    </section>
  );
}
