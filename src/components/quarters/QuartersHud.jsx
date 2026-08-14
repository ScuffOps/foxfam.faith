import { BookOpen, DoorOpen, Gem, ListChecks, PackageOpen } from "lucide-react";

const HUD_ACTIONS = [
  { key: "quests", label: "Quests", icon: ListChecks },
  { key: "inventory", label: "Inventory", icon: PackageOpen },
  { key: "courtyard", label: "Courtyard", icon: DoorOpen },
  { key: "charms", label: "Charms", icon: Gem },
  { key: "collections", label: "Collections", icon: BookOpen },
];

export default function QuartersHud({ name, favor, scene, subtitle = "Personal Quarters", onAction }) {
  return (
    <>
      {scene === "quarters" ? <div className="quarters-hud__profile">
        <span className="quarters-hud__portrait" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M11 18 7 7l12 7M37 18 41 7 29 14" />
            <path d="M10 25c0-10 6-16 14-16s14 6 14 16c0 9-5 15-14 15S10 34 10 25Z" />
            <path d="M18 27h.1M30 27h.1M21 32c2 2 4 2 6 0" />
            <path d="m19 14 5 5 5-5" />
          </svg>
        </span>
        <span><strong>{name || "Foxfam Familiar"}</strong><small>{subtitle}</small></span>
      </div> : null}
      {favor !== null && favor !== undefined ? (
        <div className="quarters-hud__favor" aria-label={`${favor} Favor`}>
          <span className="quarters-hud__favor-gem"><Gem aria-hidden="true" /></span>
          <span><small>Favor</small><strong>{favor}</strong></span>
        </div>
      ) : null}
      {scene === "quarters" ? (
        <nav className="quarters-hud__dock" aria-label="Quarters shortcuts">
          {HUD_ACTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onAction(key)}
              aria-label={label}
              title={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </>
  );
}
