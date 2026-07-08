import { Link } from "react-router-dom";
import { BookOpen, DoorOpen, Feather, Gem, Hammer, UserCircle2 } from "lucide-react";

const DOCK_ACTIONS = [
  { label: "Profile", route: "/profile", icon: UserCircle2 },
  { label: "Relic Forge", route: "/relic-forge", icon: Hammer },
  { label: "Reliquary", route: "/reliquary", icon: Feather },
  { label: "Codex", route: "/codex", icon: BookOpen },
];

export default function HubDock({ forgeOpen = false }) {
  return (
    <nav aria-label="Quarters actions" className="foxcard rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-100/65">Quick dock</p>
          <h2 className="mt-1 font-heading text-lg font-bold">Room paths</h2>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
          forgeOpen
            ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100"
            : "border-amber-200/30 bg-amber-200/10 text-amber-100"
        }`}>
          <Gem className="h-3.5 w-3.5" />
          {forgeOpen ? "Forge open" : "Forge gated"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {DOCK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.route}
              to={action.route}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-foreground transition-all hover:border-cyan-200/35 hover:bg-cyan-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-4 w-4" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
        <DoorOpen className="h-4 w-4 text-cyan-100/70" />
        <span>Minigame gates will unlock here as each world lands.</span>
      </div>
    </nav>
  );
}
