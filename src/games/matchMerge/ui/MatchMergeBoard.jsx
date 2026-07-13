import { useEffect, useRef, useState } from "react";
import {
  CircleDot,
  Flame,
  Gem,
  Grip,
  MoonStar,
  Ribbon,
  Shuffle,
  Sparkles,
  Undo2,
} from "lucide-react";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import "./match-merge.css";

const TILE_ICON = {
  1: MoonStar,
  2: Flame,
  3: Ribbon,
  4: Sparkles,
  5: Gem,
};

export default function MatchMergeBoard({
  state,
  feedback,
  canUndo,
  onSelectCell,
  onDragSwap,
  onUndo,
  onShuffle,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const tileRefs = useRef([]);
  const cursor = state.cursor || { row: 0, column: 0 };
  const cursorIndex = cursor.row * 4 + cursor.column;

  useEffect(() => {
    tileRefs.current[cursorIndex]?.focus({ preventScroll: true });
  }, [cursorIndex]);

  const handleDrop = (event, targetIndex) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onDragSwap(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <section className="reliquary-scene" aria-labelledby="match-merge-board-heading">
      <div className="reliquary-scene__wall" aria-hidden="true">
        <span className="reliquary-scene__window"><i /><i /><i /></span>
        <span className="reliquary-scene__shelf"><i /><i /><i /></span>
      </div>

      <div className="reliquary-scene__heading">
        <div>
          <p>Priory workroom</p>
          <h2 id="match-merge-board-heading">Reliquary Bench</h2>
        </div>
        <span className="reliquary-scene__tier"><Sparkles aria-hidden="true" /> Tier {state.highestTier}</span>
      </div>

      <div className="reliquary-tools" aria-label="Bench tools">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo last bench action" title="Undo">
          <Undo2 aria-hidden="true" />
        </button>
        <button type="button" onClick={onShuffle} aria-label="Shuffle offerings" title="Shuffle offerings">
          <Shuffle aria-hidden="true" />
        </button>
        <span><Grip aria-hidden="true" /> Drag matching neighbors together</span>
      </div>

      <div className="reliquary-table">
        <div className="reliquary-board" role="grid" aria-label="Four by four reliquary merge board">
          {state.grid.map((tile, index) => {
            const selected = state.selectedIndex === index;
            const focused = cursorIndex === index;
            const TileIcon = TILE_ICON[tile?.tier] || CircleDot;
            return (
              <button
                key={tile?.id || `empty-${index}`}
                ref={(node) => { tileRefs.current[index] = node; }}
                type="button"
                role="gridcell"
                draggable={Boolean(tile)}
                tabIndex={focused ? 0 : -1}
                data-tier={tile?.tier || "empty"}
                data-selected={selected || undefined}
                data-dragging={draggedIndex === index || undefined}
                aria-selected={selected}
                aria-label={tile ? `${tile.label}, tier ${tile.tier}, row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}` : `Empty space, row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}`}
                onClick={() => onSelectCell(index)}
                onDragStart={(event) => {
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
                    <span className="reliquary-tile__icon"><TileIcon aria-hidden="true" /></span>
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
