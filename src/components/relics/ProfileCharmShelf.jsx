import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";
import { RELIC_RARITY_META } from "@/lib/relicCharms";

const RARITY_ORDER = ["mythic", "epic", "rare", "uncommon", "common"];

function formatAcquiredDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function ProfileCharmShelf({ charms = [], groupedCharms = {}, equippingId = "", onToggleCharm }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Trophy Case</p>
          <h2 className="mt-1 font-heading text-lg font-bold">Charm shelf</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            View, equip, and compare obtained charms. One charm can be attached per relic slot.
          </p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {charms.length} owned
        </span>
      </div>

      {charms.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/25 p-6 text-center text-xs text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
          No charms yet. Charm rolls open while Veri is live.
        </div>
      ) : (
        <div className="mt-4 max-h-[38rem] space-y-5 overflow-y-auto pr-1">
          {RARITY_ORDER.map((rarity) => {
            const items = groupedCharms[rarity] || [];
            if (items.length === 0) return null;
            return (
              <div key={rarity}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {RELIC_RARITY_META[rarity].label}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((charm) => (
                    <CharmShelfCard
                      key={charm.id || charm.instance_id || charm.charm_key}
                      charm={charm}
                      busy={equippingId === charm.id}
                      onToggle={() => onToggleCharm(charm)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CharmShelfCard({ charm, busy, onToggle }) {
  const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;

  return (
    <article className={`min-h-56 rounded-lg border p-3 ${rarity.className}`}>
      <div className="grid h-full grid-cols-[4.75rem_minmax(0,1fr)] gap-3">
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border/60 bg-background/35">
            <RelicCharmIcon charm={charm} className="h-16 w-16" />
          </div>
          {charm.equipped && (
            <span className="mt-2 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              Equipped
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold">{charm.name}</h3>
            <span className="rounded-full bg-background/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {rarity.label}
            </span>
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] opacity-75">{charm.slot} slot</p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 opacity-80">{charm.description}</p>
          <p className="mt-3 text-[11px] opacity-70">Acquired {formatAcquiredDate(charm.acquired_at)}</p>
          <Button type="button" size="sm" variant={charm.equipped ? "default" : "outline"} onClick={onToggle} disabled={busy} className="mt-3 w-full">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : charm.equipped ? "Unequip" : "Equip"}
          </Button>
        </div>
      </div>
    </article>
  );
}
