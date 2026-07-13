import { ArrowLeft, Flower2 } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import { buildCourtyardStations } from "./quartersSceneModel";

export default function PrioryCourtyard({ worlds, familiar, onBack, onEnterWorld }) {
  const stations = buildCourtyardStations(worlds);

  return (
    <section className="courtyard-scene" aria-label="Priory Courtyard">
      <div className="courtyard-scene__water" aria-hidden="true" />
      <div className="courtyard-scene__path" aria-hidden="true" />
      <div className="courtyard-scene__priory" aria-hidden="true" />
      <div className="courtyard-scene__garden" aria-hidden="true">✿ ✦ ✿</div>
      <button type="button" className="courtyard-scene__back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Quarters
      </button>

      {stations.map((station) => (
        <button
          key={station.key}
          type="button"
          className="courtyard-gate"
          style={{ left: `${station.x}%`, top: `${station.y}%` }}
          onClick={() => onEnterWorld(station.route)}
        >
          <Flower2 aria-hidden="true" />
          <strong>{station.shortLabel}</strong>
          <small>{station.rewardFocus.split(",")[0]}</small>
        </button>
      ))}

      <div className="courtyard-scene__familiar">
        <FamiliarAvatar familiar={familiar} size="clamp(66px, 8vw, 102px)" />
      </div>
    </section>
  );
}
