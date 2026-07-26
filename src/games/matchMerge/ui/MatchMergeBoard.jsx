import { useEffect, useRef, useState } from "react";
import {
  CircleDot,
  Grip,
  Shuffle,
  Sparkles,
  Undo2,
} from "lucide-react";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import "./match-merge.css";

const OFFERING_ART = {
  "moon-spark": MoonSpark,
  "candle-seal": CandleSeal,
  "woven-cord": WovenCord,
  "sigil-flake": SigilFlake,
  "relic-knot": RelicKnot,
};

export default function MatchMergeBoard({
  state,
  feedback,
  canUndo,
  isBusy = false,
  allowPracticeTools = true,
  onSelectCell,
  onDragSwap,
  onUndo,
  onShuffle,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const tileRefs = useRef([]);
  const didMountRef = useRef(false);
  const cursor = state.cursor || { row: 0, column: 0 };
  const cursorIndex = cursor.row * 4 + cursor.column;

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    tileRefs.current[cursorIndex]?.focus({ preventScroll: true });
  }, [cursorIndex]);

  const handleDrop = (event, targetIndex) => {
    event.preventDefault();
    if (!isBusy && draggedIndex !== null && draggedIndex !== targetIndex) {
      onDragSwap(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <section
      className="reliquary-scene"
      aria-busy={isBusy}
      aria-labelledby="match-merge-board-heading"
    >
      <div className="reliquary-scene__wall" aria-hidden="true">
        <span className="reliquary-scene__window"><i /><i /><i /><b /></span>
        <span className="reliquary-scene__cabinet">
          <i className="reliquary-scene__bottle reliquary-scene__bottle--blue" />
          <i className="reliquary-scene__bottle reliquary-scene__bottle--rose" />
          <i className="reliquary-scene__bottle reliquary-scene__bottle--gold" />
        </span>
        <span className="reliquary-scene__hanging-tools"><i /><i /><i /></span>
      </div>

      <div className="reliquary-scene__heading">
        <div>
          <p>Priory workroom</p>
          <h2 id="match-merge-board-heading">Reliquary Bench</h2>
        </div>
        <span className="reliquary-scene__tier"><Sparkles aria-hidden="true" /> Tier {state.highestTier}</span>
      </div>

      <div className="reliquary-tools" role="group" aria-label="Bench tools">
        {allowPracticeTools ? (
          <>
            <button type="button" onClick={onUndo} disabled={isBusy || !canUndo} aria-label="Undo last bench action" title="Undo">
              <Undo2 aria-hidden="true" />
            </button>
            <button type="button" onClick={onShuffle} disabled={isBusy} aria-label="Shuffle offerings" title="Shuffle offerings">
              <Shuffle aria-hidden="true" />
            </button>
          </>
        ) : null}
        <span><Grip aria-hidden="true" /> Drag matching neighbors together</span>
      </div>

      <div className="reliquary-table">
        <div className="reliquary-table__back" aria-hidden="true">
          <span className="reliquary-table__press"><i /><b /></span>
          <span className="reliquary-table__wax"><i /><i /><i /></span>
          <span className="reliquary-table__mallet"><i /><b /></span>
        </div>
        <div className="reliquary-board" role="group" aria-busy={isBusy} aria-label="Four by four reliquary merge board">
          {state.grid.map((tile, index) => {
            const selected = state.selectedIndex === index;
            const focused = cursorIndex === index;
            const OfferingArt = OFFERING_ART[tile?.key] || MoonSpark;
            return (
              <button
                key={tile?.id || `empty-${index}`}
                ref={(node) => { tileRefs.current[index] = node; }}
                type="button"
                disabled={isBusy}
                draggable={!isBusy && Boolean(tile)}
                tabIndex={focused ? 0 : -1}
                data-tier={tile?.tier || "empty"}
                data-offering={tile?.key || undefined}
                data-selected={selected || undefined}
                data-dragging={draggedIndex === index || undefined}
                aria-pressed={selected}
                aria-label={tile ? `${tile.label}, tier ${tile.tier}, row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}` : `Empty space, row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}`}
                onClick={() => {
                  if (!isBusy) onSelectCell(index);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isBusy) onSelectCell(index);
                }}
                onDragStart={(event) => {
                  if (isBusy) {
                    event.preventDefault();
                    return;
                  }
                  setDraggedIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, index)}
              >
                {tile ? (
                  <span className="reliquary-tile__offering">
                    <span className="reliquary-tile__icon"><OfferingArt /></span>
                    <strong>{tile.label}</strong>
                    <small>Tier {tile.tier}</small>
                  </span>
                ) : (
                  <span className="reliquary-tile__empty" aria-hidden="true"><CircleDot /></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="reliquary-scene__footer" aria-live="polite">
        <InteractionPrompt keys={["WASD", "Arrows"]} label="Move" />
        <InteractionPrompt keys={["E", "Enter"]} label="Select / merge" />
        <p data-tone={feedback?.tone || "quiet"}>{feedback?.message || "Pair neighboring offerings to refine them."}</p>
      </div>
    </section>
  );
}

function OfferingSvg({ children, label }) {
  return (
    <svg viewBox="0 0 72 72" role="img" aria-label={label} focusable="false">
      <g fill="none" stroke="#35404f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5">
        {children}
      </g>
    </svg>
  );
}

function MoonSpark() {
  return (
    <OfferingSvg label="Moon Spark offering">
      <path fill="#a4c8d5" d="M18 40c0-14 10-24 23-25-7 6-9 14-5 22 4 9 13 13 22 10-5 9-14 14-24 12-10-2-16-9-16-19Z" />
      <path fill="#dfc982" d="m50 16 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
      <circle cx="18" cy="23" r="3" fill="#d9a3aa" />
    </OfferingSvg>
  );
}

function CandleSeal() {
  return (
    <OfferingSvg label="Candle Seal offering">
      <path fill="#f6f0df" d="M25 15h22v25H25z" />
      <path fill="#dfc982" d="M36 7c5 6 5 11 0 15-5-4-5-9 0-15Z" />
      <path fill="#d99a82" d="m36 33 7 5 8-1 1 8 5 7-6 6-1 8-8-1-7 4-6-5-8 1-1-8-5-6 5-7 1-8 8 1 7-4Z" />
      <path fill="#dfc982" d="m36 43 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-6Z" />
    </OfferingSvg>
  );
}

function WovenCord() {
  return (
    <OfferingSvg label="Woven Cord offering">
      <path fill="#80adbc" d="M20 18c12 0 22 8 22 19S34 57 24 57c-8 0-14-5-14-12 0-6 4-10 10-10 5 0 9 3 9 8 0 3-2 6-5 6" />
      <path fill="#b4b3cc" d="M52 15c-11 0-20 8-20 18s8 18 18 18c7 0 13-4 13-11 0-5-4-9-9-9-4 0-8 3-8 7 0 3 2 5 5 5" />
      <path fill="#dfc982" d="m27 50 9-8 9 8-9 12-9-12Z" />
    </OfferingSvg>
  );
}

function SigilFlake() {
  return (
    <OfferingSvg label="Sigil Flake offering">
      <path fill="#b4c6dc" d="m36 7 8 17 18-5-9 17 13 13-19 1-3 19-12-15-16 10 5-19-18-7 17-9-2-19 18 7Z" />
      <path fill="#f6f0df" d="m36 24 8 9-3 13-12 3-8-9 3-12 12-4Z" />
      <path fill="#80adbc" d="m36 30 5 7-5 8-5-8 5-7Z" />
    </OfferingSvg>
  );
}

function RelicKnot() {
  return (
    <OfferingSvg label="Relic Knot offering">
      <path fill="#53606d" d="M36 8 56 19l8 22-10 20-18 5-18-5L8 41l8-22L36 8Z" />
      <path fill="#dfc982" d="M20 28c7-9 17-10 24-4 7 6 8 16 2 23-5 7-14 8-20 3-5-4-6-11-2-16 3-4 9-5 13-2 3 3 4 7 1 11" />
      <path fill="#a4c8d5" d="m45 24 10 8-2 14-10 7-10-7 4-8 8-14Z" />
      <path fill="#d9a3aa" d="m44 33 5 5-5 7-5-7 5-5Z" />
    </OfferingSvg>
  );
}
