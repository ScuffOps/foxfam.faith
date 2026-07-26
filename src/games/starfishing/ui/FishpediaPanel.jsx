import { useMemo, useRef, useState } from "react";
import { Ruler, Sparkles } from "lucide-react";
import { STARFISHING_FISH } from "@/games/starfishing/content/fishCatalog";
import { getFishpediaRows } from "@/games/starfishing/simulation/starfishingRules";

const TABS = [
  { key: "all", label: "All stars" },
  { key: "caught", label: "Caught" },
  { key: "hidden", label: "Silhouettes" },
];
const FISH_ART_KEYS = new Set([
  "ember-mote",
  "lunar-guppy",
  "aurora-minnow",
  "comet-koi",
  "eclipse-ray",
  "veri-starwhale",
]);

function FishPortrait({ fishKey, hidden }) {
  const artKey = FISH_ART_KEYS.has(fishKey) ? fishKey : "ember-mote";
  const commonProps = {
    fill: hidden ? "#7d8795" : "#faf3eb",
    stroke: "#485365",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const marks = hidden ? null : (
    <g fill="#dfd8ab" stroke="#485365" strokeWidth="1.5">
      <circle cx="30" cy="26" r="2.4" />
      <circle cx="40" cy="31" r="2.4" />
      <path d="M30 26 40 31" fill="none" />
    </g>
  );

  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false" data-fish-art={hidden ? "hidden" : artKey}>
      {artKey === "eclipse-ray" ? (
        <g {...commonProps}>
          <path d="M10 35C22 17 49 16 62 35 50 49 22 50 10 35Z" />
          <path d="M48 42c8 5 10 11 12 18" fill="none" />
          <path d="m13 34-8-7 4 14Z" />
        </g>
      ) : artKey === "veri-starwhale" ? (
        <g {...commonProps}>
          <path d="M9 39c2-17 20-26 39-18 9 4 13 11 12 20-7 12-26 17-42 9-6-3-9-6-9-11Z" />
          <path d="M51 24c7-10 13-7 14-2-5 0-8 3-10 8M13 40 5 31l1 17Z" />
          <path d="M26 21c4-8 12-10 16-5" fill="none" />
        </g>
      ) : artKey === "comet-koi" ? (
        <g {...commonProps}>
          <path d="M11 37c8-13 27-19 40-8 7 6 6 15-2 20-14 8-31 1-38-12Z" />
          <path d="m49 30 16-12-2 17 4 14-18-4Z" />
          <path d="M25 28c8 2 12 8 13 18" fill="none" />
        </g>
      ) : artKey === "aurora-minnow" ? (
        <g {...commonProps}>
          <path d="M12 37c8-12 26-16 40-5 5 4 5 9 0 13-14 10-32 5-40-8Z" />
          <path d="m51 32 14-9-3 14 3 13-14-7Z" />
          <path d="m27 30 7-10 5 12" />
        </g>
      ) : artKey === "lunar-guppy" ? (
        <g {...commonProps}>
          <ellipse cx="32" cy="37" rx="21" ry="16" />
          <path d="m50 32 15-12-2 17 2 15-16-10Z" />
          <path d="M21 24c6-6 14-6 20-1" fill="none" />
        </g>
      ) : (
        <g {...commonProps}>
          <ellipse cx="31" cy="37" rx="18" ry="12" />
          <path d="m47 34 15-10-3 13 3 12-15-9Z" />
          <path d="m29 24 5-8 4 10" />
        </g>
      )}
      {marks}
    </svg>
  );
}

export default function FishpediaPanel({ fishpedia = {}, authoritativeRows = null }) {
  const [tab, setTab] = useState("all");
  const tabRefs = useRef([]);
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

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setTab(TABS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="fishpedia" aria-labelledby="fishpedia-title">
      <header className="fishpedia__header">
        <div><p>Illustrated field ledger</p><h2 id="fishpedia-title">Fishpedia</h2></div>
        <span><Sparkles aria-hidden="true" /> {discoveredCount}/{rows.length}</span>
      </header>
      <div className="fishpedia__tabs" role="tablist" aria-label="Filter Fishpedia">
        {TABS.map((item, index) => (
          <button
            key={item.key}
            ref={(node) => { tabRefs.current[index] = node; }}
            id={`fishpedia-tab-${item.key}`}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            aria-controls="fishpedia-panel"
            tabIndex={tab === item.key ? 0 : -1}
            onClick={() => setTab(item.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id="fishpedia-panel" className="fishpedia__grid" role="tabpanel" aria-labelledby={`fishpedia-tab-${tab}`}>
        {visibleRows.map((fish) => (
          <article className="fish-entry" data-rarity={fish.discovered ? fish.rarity : "hidden"} key={fish.key}>
            <div className="fish-entry__portrait" aria-label={fish.discovered ? fish.label : "Undiscovered fish silhouette"} role="img">
              <FishPortrait fishKey={fish.key} hidden={!fish.discovered} />
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
