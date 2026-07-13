import { BookOpen, DoorOpen, Gem, ListChecks, PackageOpen } from "lucide-react";

const HUD_ACTIONS = [
  { key: "quests", label: "Quests", icon: ListChecks },
  { key: "inventory", label: "Inventory", icon: PackageOpen },
  { key: "courtyard", label: "Courtyard", icon: DoorOpen },
  { key: "charms", label: "Charms", icon: Gem },
  { key: "collections", label: "Collections", icon: BookOpen },
];

export default function QuartersHud({ name, favor, scene, onAction }) {
  return (
    <>
      <div className="quarters-hud__profile">
        <span className="quarters-hud__portrait" aria-hidden="true" />
        <span><strong>{name || "Foxfam Familiar"}</strong><small>Personal Quarters</small></span>
      </div>
      <div className="quarters-hud__favor" aria-label={`${favor} Favor`}><Gem aria-hidden="true" /> {favor}</div>
      <nav className="quarters-hud__dock" aria-label="Quarters shortcuts">
        {HUD_ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={scene === "courtyard" && key === "courtyard" ? "is-active" : ""}
            onClick={() => onAction(key)}
            aria-label={label}
            title={label}
          >
            <Icon aria-hidden="true" />
          </button>
        ))}
      </nav>
    </>
  );
}
