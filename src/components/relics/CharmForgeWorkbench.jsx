import { useMemo, useState } from "react";
import { Gem, Hammer, Loader2, Recycle, ShieldCheck, Sparkles, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";
import { MATERIAL_BY_KEY } from "@/lib/gameHubCatalog";
import { getCharmDefinition, RELIC_RARITY_META } from "@/lib/relicCharms";
import { countCharmCopies, getCharmForgeEligibility, getNextCharmTier } from "@/lib/relicForgeUiModel";

const MODES = [
  { key: "awaken", label: "Forge", icon: Hammer },
  { key: "convert", label: "Convert dupes", icon: Recycle },
];

function getCharmName(charm) {
  return charm.name || getCharmDefinition(charm.charmKey || charm.charm_key)?.name || "Unnamed charm";
}

function getMaterialLabel(key) {
  return MATERIAL_BY_KEY[key]?.label || key.replaceAll("-", " ");
}

function CostLine({ favor = 0, materials = [] }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-[#596575]">
      {favor > 0 ? <span className="rounded-md border-2 border-[#596575] bg-[#f8f1df] px-2 py-1">{favor} Favor</span> : null}
      {materials.map((material) => (
        <span key={material.key} className="rounded-md border-2 border-[#596575] bg-[#e8f0e2] px-2 py-1">
          {material.quantity} {getMaterialLabel(material.key)}
        </span>
      ))}
    </div>
  );
}

export default function CharmForgeWorkbench({
  state,
  busyAction = "",
  error = "",
  onUpgrade,
  onConvert,
}) {
  const [mode, setMode] = useState("awaken");
  const duplicateCounts = useMemo(() => countCharmCopies(state.charms), [state.charms]);

  return (
    <section className="rounded-lg border-2 border-[#4a5668] bg-[#faf3eb] p-4 text-[#35404f] shadow-[4px_4px_0_#c7bbb0]" aria-labelledby="charm-forge-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-[#707989]">Charm workbench</p>
          <h2 id="charm-forge-title" className="mt-1 font-heading text-xl font-bold">Refine or reclaim</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#657080]">
            Refine a charm through three named tiers with forge materials, or return a spare copy to the Priory stores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Forge balances">
          <BalancePill icon={Gem} label="Favor" value={state.balances.favor} />
          {state.balances.materials.map((material) => (
            <BalancePill key={material.key} icon={Sparkles} label={getMaterialLabel(material.key)} value={material.balance} />
          ))}
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-lg border-2 border-[#596575] bg-[#e5ece5] p-1" aria-label="Forge action">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80adbc] ${mode === key ? "bg-[#dfd8ab] text-[#35404f] shadow-[2px_2px_0_#9b9077]" : "text-[#657080]"}`}
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 rounded-lg border-2 border-[#9d6068] bg-[#f4dfe1] p-3 text-sm font-bold text-[#71434a]" role="alert">{error}</p> : null}

      {state.charms.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.charms.map((charm) => {
            const { recipe, salvage, canAfford, canConvert, conversionReason } = getCharmForgeEligibility({
              charm,
              state,
              copyCounts: duplicateCounts,
            });
            const busy = busyAction === `${mode}:${charm.id}`;
            const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;

            return (
              <article key={charm.id} className="rounded-lg border-2 border-[#596575] bg-[#f6f0df] p-3">
                <div className="flex gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-[#596575] bg-[#d9e6ec]">
                    <RelicCharmIcon charm={charm} className="h-16 w-16" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate font-heading text-sm font-bold">{getCharmName(charm)}</h3>
                      <span className="rounded-md border border-[#596575] bg-[#e8f0e2] px-1.5 py-0.5 text-[9px] font-bold uppercase">{rarity.label}</span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[#707989]">{charm.tier} · {charm.star}/3 stars</p>
                    <div className="mt-2 flex gap-1" aria-label={`${charm.star} of 3 stars`}>
                      {[1, 2, 3].map((star) => (
                        <Star key={star} className={`h-4 w-4 ${charm.star >= star ? "fill-[#dfc982] text-[#596575]" : "text-[#9aa2ad]"}`} aria-hidden="true" />
                      ))}
                    </div>
                  </div>
                </div>

                {mode === "awaken" ? (
                  <div className="mt-3">
                    {recipe ? (
                      <>
                        <p className="mb-2 text-xs font-bold capitalize text-[#657080]">Next tier: {getNextCharmTier(recipe)}</p>
                        <CostLine favor={recipe.favorCost} materials={recipe.materialCosts} />
                      </>
                    ) : <p className="text-xs font-bold text-[#657080]">Fully ascendant</p>}
                    <Button type="button" className="mt-3 w-full" disabled={!recipe || !canAfford || Boolean(busyAction)} onClick={() => onUpgrade(charm)}>
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Hammer className="mr-2 h-4 w-4" aria-hidden="true" />}
                      {busy ? "Forging..." : canAfford ? `Forge ${getNextCharmTier(recipe)}` : recipe ? "Materials needed" : "Ascendant"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3">
                    {salvage ? <CostLine favor={salvage.favorYield} materials={salvage.materialYields} /> : null}
                    <p className="mt-2 min-h-8 text-xs leading-4 text-[#657080]">
                      {conversionReason}
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" className="mt-2 w-full" disabled={!canConvert || Boolean(busyAction)}>
                          <Recycle className="mr-2 h-4 w-4" aria-hidden="true" /> Convert duplicate
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Convert this spare charm?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {getCharmName(charm)} will be removed permanently and its canonical Favor and materials returned.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep charm</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onConvert(charm)}>Convert spare</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border-2 border-dashed border-[#8c96a4] bg-[#eef3ed] p-6 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-[#80adbc]" aria-hidden="true" />
          <p className="mt-2 font-bold">No charms are waiting at the bench.</p>
          <p className="mt-1 text-sm text-[#657080]">Game achievements and approved charm draws will appear here.</p>
        </div>
      )}
    </section>
  );
}

function BalancePill({ icon: Icon, label, value }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#596575] bg-[#e8f0e2] px-3">
      <Icon className="h-4 w-4 text-[#80adbc]" aria-hidden="true" />
      <span><small className="block text-[9px] font-bold uppercase text-[#707989]">{label}</small><strong className="block text-sm leading-none">{value}</strong></span>
    </span>
  );
}
