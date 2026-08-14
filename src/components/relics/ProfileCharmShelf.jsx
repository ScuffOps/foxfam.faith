import { useMemo, useState } from "react";
import { ChevronDown, Loader2, Search, Sparkles, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";
import { getCharmPresentation, matchesCharmShelfFilters } from "@/components/relics/charmPresentation";
import { groupCharmsByRarity, RELIC_RARITY_META } from "@/lib/relicCharms";
import { setEquippedCharm } from "@/lib/relicService";

const RARITY_ORDER = ["mythic", "epic", "rare", "uncommon", "common"];

function formatAcquiredDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function ProfileCharmShelf({
  charms = [],
  equipmentService = setEquippedCharm,
  onCharmsChange,
}) {
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState("all");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [equippingId, setEquippingId] = useState("");
  const [actionError, setActionError] = useState("");
  const groupedCharms = useMemo(() => groupCharmsByRarity(charms), [charms]);
  const filteredGroupedCharms = useMemo(() => {
    return RARITY_ORDER.reduce((groups, rarity) => {
      if (rarityFilter !== "all" && rarityFilter !== rarity) {
        groups[rarity] = [];
        return groups;
      }
      const items = (groupedCharms[rarity] || []).filter((charm) => (
        matchesCharmShelfFilters(charm, { query, view: viewFilter })
      ));
      groups[rarity] = items;
      return groups;
    }, {});
  }, [groupedCharms, query, rarityFilter, viewFilter]);
  const filteredCount = Object.values(filteredGroupedCharms).reduce((sum, items) => sum + items.length, 0);

  const handleToggleCharm = async (charm) => {
    setActionError("");
    setEquippingId(charm.id);
    try {
      const authoritativeCharms = await equipmentService(charm, charms, !charm.equipped);
      onCharmsChange?.(authoritativeCharms);
    } catch {
      setActionError("The charm clasp did not settle. Refresh and try again.");
    } finally {
      setEquippingId("");
    }
  };

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

      {actionError ? (
        <p className="mt-3 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {charms.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/25 p-6 text-center text-xs text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
          No charms yet. Charm rolls open while Veri is live.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter charms..." />
            </div>
            <select
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter charms by rarity"
            >
              <option value="all">All rarities</option>
              {RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{RELIC_RARITY_META[rarity].label}</option>)}
            </select>
            <fieldset className="grid grid-cols-3 rounded-lg border border-border bg-background/35 p-1" aria-label="Charm shelf view">
              <legend className="sr-only">Charm shelf view</legend>
              {[
                ["all", "All"],
                ["equipped", "Equipped"],
                ["trophies", "Trophies"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setViewFilter(value)}
                  aria-pressed={viewFilter === value}
                  className={`min-h-8 px-2 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewFilter === value ? "rounded-md bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">{filteredCount} charm{filteredCount === 1 ? "" : "s"} shown</div>

          <div className="mt-4 max-h-[38rem] space-y-5 overflow-y-auto pr-1">
          {RARITY_ORDER.map((rarity) => {
            const items = filteredGroupedCharms[rarity] || [];
            if (items.length === 0) return null;
            const collapsed = collapsedGroups[rarity];
            return (
              <div key={rarity}>
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((current) => ({ ...current, [rarity]: !current[rarity] }))}
                  className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-secondary/25 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {RELIC_RARITY_META[rarity].label} · {items.length}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`} />
                </button>
                {!collapsed && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((charm) => (
                      <CharmShelfCard
                        key={charm.id || charm.instance_id || charm.charm_key}
                        charm={charm}
                        busy={equippingId === charm.id}
                        equipmentBusy={Boolean(equippingId)}
                        onToggle={() => handleToggleCharm(charm)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}
    </section>
  );
}

function CharmShelfCard({ charm, busy, equipmentBusy, onToggle }) {
  const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;
  const presentation = getCharmPresentation(charm);

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
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
            <span>{charm.slot} slot</span>
            <span aria-hidden="true">·</span>
            <span>{presentation.tier}</span>
          </div>
          <div className="mt-2 flex items-center gap-1" aria-label={`${presentation.star} of 3 forge stars`}>
            {[1, 2, 3].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${star <= presentation.star ? "fill-current" : "opacity-25"}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80">{charm.description}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold opacity-75">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {presentation.provenance}
          </p>
          {presentation.effectLabels.length ? (
            <div className="mt-2 flex flex-wrap gap-1" aria-label="Charm effects">
              {presentation.effectLabels.map((effect) => (
                <span key={effect} className="rounded-md border border-current/20 bg-background/35 px-1.5 py-0.5 text-[10px] font-bold">
                  {effect}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-[11px] opacity-70">Acquired {formatAcquiredDate(charm.acquired_at)}</p>
          <Button
            type="button"
            size="sm"
            variant={charm.equipped ? "default" : "outline"}
            onClick={onToggle}
            disabled={busy || equipmentBusy}
            aria-pressed={Boolean(charm.equipped)}
            className="mt-3 w-full"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {charm.equipped ? "Unequipping..." : "Equipping..."}
              </>
            ) : charm.equipped ? "Unequip" : "Equip"}
          </Button>
        </div>
      </div>
    </article>
  );
}
