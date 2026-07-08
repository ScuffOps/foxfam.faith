import { Link } from "react-router-dom";
import { Gem, Hammer, Shield, Sparkles } from "lucide-react";
import RelicPreview from "@/components/relics/RelicPreview";
import { Button } from "@/components/ui/button";
import { getEquippedCharms, normalizeRelic } from "@/lib/relicCharms";

export default function RelicStatusPanel({ favor = 0, forgeOpen = false, gateReason = "", relic, charms = [] }) {
  const normalizedRelic = normalizeRelic(relic);
  const equippedCharms = getEquippedCharms(charms);

  return (
    <aside className="space-y-4">
      <section className="foxcard rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-100/65">Relic status</p>
            <h2 className="mt-1 font-heading text-lg font-bold">{normalizedRelic.name}</h2>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-200/10 text-cyan-100">
            <Shield className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4">
          <RelicPreview relic={normalizedRelic} charms={charms} compact />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatusStat label="Favor" value={favor} icon={Sparkles} />
          <StatusStat label="Equipped" value={equippedCharms.length} icon={Gem} />
        </div>

        <div className={`mt-4 rounded-lg border p-3 text-xs leading-5 ${
          forgeOpen
            ? "border-cyan-200/25 bg-cyan-200/10 text-cyan-100"
            : "border-amber-200/25 bg-amber-200/10 text-amber-100"
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <Hammer className="h-4 w-4" />
            <span>{forgeOpen ? "Forge actions are open." : "Forge actions are gated."}</span>
          </div>
          {!forgeOpen && gateReason && (
            <p className="mt-1 text-amber-100/75">{gateReason}</p>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/profile">Profile</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/relic-forge">Forge</Link>
          </Button>
        </div>
      </section>
    </aside>
  );
}

function StatusStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
