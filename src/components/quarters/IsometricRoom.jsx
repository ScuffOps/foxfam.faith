import { Archive, Armchair, BookOpen, DoorOpen, Hammer, Shirt } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import { QUARTERS_STATIONS } from "./quartersSceneModel";

const STATION_ICONS = {
  forge: Hammer,
  customize: Shirt,
  decorate: Armchair,
  trophies: Archive,
  collections: BookOpen,
  courtyard: DoorOpen,
};

export default function IsometricRoom({ cursor, selectedStation, familiar, onMove, onActivate }) {
  const handleFloorClick = (event) => {
    if (event.target.closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onMove({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  return (
    <section className="quarters-scene" aria-label="Personal Quarters" onClick={handleFloorClick}>
      <div className="quarters-scene__wall quarters-scene__wall--left" aria-hidden="true" />
      <div className="quarters-scene__wall quarters-scene__wall--right" aria-hidden="true" />
      <div className="quarters-scene__window" aria-hidden="true"><span>✦</span></div>
      <div className="quarters-scene__floor" aria-hidden="true" />
      <div className="quarters-scene__rug" aria-hidden="true" />
      <div className="quarters-scene__sofa" aria-hidden="true"><i /><i /></div>
      <div className="quarters-scene__table" aria-hidden="true"><span>Tea & charms</span></div>
      <div className="quarters-scene__forge" aria-hidden="true"><span>◈</span></div>
      <div className="quarters-scene__wardrobe" aria-hidden="true" />
      <div className="quarters-scene__shelf" aria-hidden="true"><i>✦</i><i>◈</i><i>✿</i></div>
      <div className="quarters-scene__door" aria-hidden="true" />

      {QUARTERS_STATIONS.map((station) => {
        const Icon = STATION_ICONS[station.key];
        return (
          <button
            key={station.key}
            type="button"
            className={`quarters-hotspot ${selectedStation === station.key ? "is-selected" : ""}`}
            style={{ left: `${station.x}%`, top: `${station.y}%` }}
            onClick={(event) => { event.stopPropagation(); onActivate(station.key); }}
            aria-label={station.label}
            title={station.label}
          >
            <Icon aria-hidden="true" />
            <span>{station.label}</span>
          </button>
        );
      })}

      <div className="quarters-scene__familiar" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}>
        <FamiliarAvatar familiar={familiar} size="clamp(72px, 10vw, 118px)" pose="walk" />
      </div>
      <InteractionPrompt keys={["E"]} label="Interact" className="quarters-scene__prompt" />
    </section>
  );
}
