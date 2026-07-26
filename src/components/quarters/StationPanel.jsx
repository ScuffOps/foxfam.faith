import { useEffect, useRef } from "react";
import { Archive, Armchair, ArrowRight, BookOpen, Hammer, Shirt, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATION_COPY = {
  forge: { title: "Relic Forge", detail: "Evolve charms, preview material costs, and prepare passive or cosmetic loadouts.", note: "Forge station", Icon: Hammer },
  customize: { title: "Familiar Wardrobe", detail: "Choose your species, coat, markings, outfit, accessory, and equipped charm effect.", note: "Wardrobe station", Icon: Shirt },
  decorate: { title: "Decorate", detail: "Arrange furniture, plants, trophies, and collection displays around your Quarters.", note: "Home station", Icon: Armchair },
  trophies: { title: "Trophy Shelf", detail: "Display permanent milestones from every Priory world without using charm slots.", note: "Legacy station", Icon: Archive },
  collections: { title: "Collections", detail: "Review Fishpedia records, recipes, lore scraps, clock pieces, and garden blooms.", note: "Archive station", Icon: BookOpen },
};

export default function StationPanel({ stationKey, onClose, onOpen }) {
  const station = STATION_COPY[stationKey];
  const actionRef = useRef(null);

  useEffect(() => {
    if (!station) return undefined;
    const returnTarget = document.querySelector(`[data-station-key="${stationKey}"]`);
    actionRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      returnTarget?.focus();
    };
  }, [onClose, station, stationKey]);

  if (!station) return null;
  const { Icon } = station;

  return (
    <aside className="quarters-station-panel" role="dialog" aria-modal="true" aria-labelledby="quarters-station-title" aria-describedby="quarters-station-detail">
      <button type="button" className="quarters-station-panel__close" onClick={onClose} aria-label="Close station panel" title="Close">
        <X aria-hidden="true" />
      </button>
      <div className="quarters-station-panel__heading">
        <span className="quarters-station-panel__crest"><Icon aria-hidden="true" /></span>
        <span>
          <p>{station.note}</p>
          <h2 id="quarters-station-title">{station.title}</h2>
        </span>
      </div>
      <span id="quarters-station-detail" className="quarters-station-panel__detail">{station.detail}</span>
      <Button ref={actionRef} type="button" onClick={() => onOpen(stationKey)} className="quarters-station-panel__action">
        Open {station.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </aside>
  );
}
