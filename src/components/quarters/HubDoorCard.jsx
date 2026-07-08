import { Link } from "react-router-dom";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { getForgeMaterialsForWorld, HUB_UNLOCK_STATES } from "@/lib/gameHubCatalog";

const STATE_COPY = {
  [HUB_UNLOCK_STATES.open]: "Open",
  [HUB_UNLOCK_STATES.locked]: "Locked",
  [HUB_UNLOCK_STATES.comingSoon]: "Preparing",
};

export default function HubDoorCard({ world, compact = false }) {
  const materials = getForgeMaterialsForWorld(world);
  const isOpen = world.status === HUB_UNLOCK_STATES.open;
  const isLocked = world.status === HUB_UNLOCK_STATES.locked;
  const StateIcon = isOpen ? Sparkles : Lock;

  const content = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/65">
            {STATE_COPY[world.status] || "Preparing"}
          </span>
          <span className="mt-1 block font-heading text-base font-bold text-foreground">
            {world.shortLabel || world.label}
          </span>
        </span>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          isOpen
            ? "border-cyan-200/35 bg-cyan-200/15 text-cyan-100"
            : "border-white/10 bg-white/[0.04] text-muted-foreground"
        }`}>
          <StateIcon className="h-4 w-4" />
        </span>
      </span>

      {!compact && (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {world.lore}
        </p>
      )}

      <span className="mt-4 flex min-h-6 flex-wrap gap-1.5">
        {materials.length > 0 ? materials.slice(0, 2).map((material) => (
          <span
            key={material.key}
            className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2 py-0.5 text-[10px] font-bold text-amber-100"
          >
            {material.label}
          </span>
        )) : (
          <span className="rounded-full border border-violet-200/20 bg-violet-200/10 px-2 py-0.5 text-[10px] font-bold text-violet-100">
            Home base
          </span>
        )}
      </span>

      <span className="mt-4 flex items-center justify-between text-xs font-bold">
        <span className={isOpen ? "text-cyan-100" : "text-muted-foreground"}>
          {isOpen ? "Enter" : isLocked ? "Gate held" : "Coming soon"}
        </span>
        <ArrowRight className={`h-4 w-4 ${isOpen ? "text-cyan-100" : "text-muted-foreground/55"}`} />
      </span>
    </>
  );

  const className = `group flex h-full min-h-44 flex-col rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    isOpen
      ? "border-cyan-200/22 bg-cyan-200/[0.055] hover:border-cyan-200/45 hover:bg-cyan-200/[0.085]"
      : "border-white/10 bg-white/[0.035] opacity-85"
  }`;

  if (!isOpen) {
    return (
      <article className={className} aria-disabled="true">
        {content}
      </article>
    );
  }

  return (
    <Link to={world.route} className={className}>
      {content}
    </Link>
  );
}
