import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATION_COPY = {
  forge: ["Relic Forge", "Evolve charms, preview material costs, and prepare passive or cosmetic loadouts."],
  customize: ["Familiar Wardrobe", "Choose your species, coat, markings, outfit, accessory, and equipped charm effect."],
  decorate: ["Decorate", "Arrange furniture, plants, trophies, and collection displays around your Quarters."],
  trophies: ["Trophy Shelf", "Display permanent milestones from every Priory world without using charm slots."],
  collections: ["Collections", "Review Fishpedia records, recipes, lore scraps, clock pieces, and garden blooms."],
};

export default function StationPanel({ stationKey, onClose, onOpen }) {
  const station = STATION_COPY[stationKey];
  if (!station) return null;

  return (
    <aside className="quarters-station-panel" aria-labelledby="quarters-station-title">
      <button type="button" className="quarters-station-panel__close" onClick={onClose} aria-label="Close station panel" title="Close">
        <X aria-hidden="true" />
      </button>
      <p>Quarters station</p>
      <h2 id="quarters-station-title">{station[0]}</h2>
      <span>{station[1]}</span>
      <Button type="button" onClick={() => onOpen(stationKey)}>
        Open {station[0]} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </aside>
  );
}
