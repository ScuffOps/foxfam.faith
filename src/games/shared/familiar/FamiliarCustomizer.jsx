import { useEffect, useMemo, useState } from "react";
import FamiliarAvatar from "./FamiliarAvatar";
import {
  FAMILIAR_ACCESSORIES,
  FAMILIAR_CHARM_FX,
  FAMILIAR_COATS,
  FAMILIAR_OUTFITS,
  FAMILIAR_SPECIES,
  normalizeFamiliarSelection,
} from "./familiarCatalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFamiliar } from "./useFamiliar";

const CATEGORIES = [
  { key: "species", label: "Species" },
  { key: "coat", label: "Accent" },
  { key: "markings", label: "Sigil" },
  { key: "outfit", label: "Outfit" },
  { key: "accessory", label: "Accessory" },
  { key: "charmFx", label: "Aura" },
];

const titleCase = (value) => value.replaceAll("-", " ").replace(/^./, (character) => character.toUpperCase());

function optionsFor(category, draft) {
  const species = FAMILIAR_SPECIES[draft.species];
  if (category === "species") return Object.entries(FAMILIAR_SPECIES).map(([value, item]) => ({
    value,
    label: item.label,
    asset: item.asset,
  }));
  if (category === "coat") return species.coats.map((value) => ({ value, label: titleCase(value), color: FAMILIAR_COATS[value].base }));
  if (category === "markings") return species.markings.map((value) => ({ value, label: titleCase(value) }));
  const catalogs = { outfit: FAMILIAR_OUTFITS, accessory: FAMILIAR_ACCESSORIES, charmFx: FAMILIAR_CHARM_FX };
  return Object.entries(catalogs[category]).map(([value, item]) => ({ value, label: item.label }));
}

export default function FamiliarCustomizer({ familiar, startingFamiliar = familiar, onSave, isGuest, status, error }) {
  const { retryFamiliar } = useFamiliar();
  const [draft, setDraft] = useState(startingFamiliar);
  const [notice, setNotice] = useState("");
  useEffect(() => setDraft(startingFamiliar), [startingFamiliar]);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(familiar), [draft, familiar]);
  const isRemoteUnavailable = !isGuest && status === "error";

  const selectOption = (category, value) => {
    setNotice("");
    setDraft((current) => normalizeFamiliarSelection({ ...current, [category]: value }));
  };

  const save = async () => {
    try {
      await onSave(draft);
      setNotice(isGuest ? "Guest preview saved on this device." : "Familiar saved to your Quarters.");
    } catch {
      setNotice("");
    }
  };

  return (
    <Card className="mx-auto w-full max-w-4xl border-2 border-[#8b7b76] bg-[#fefcf7] text-[#3f4857] shadow-[5px_5px_0_#c2b7b1]">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Familiar Wardrobe</CardTitle>
        <CardDescription className="text-[#596575]">
          {isGuest ? "Guest choices stay only on this device and are never copied into an account." : "Choose the familiar who travels with you through the Priory."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
        <section className="flex min-h-52 items-center justify-center rounded-lg border-2 border-[#a8bfc2] bg-[#d9e6ec] p-4 sm:min-h-64 sm:p-6" aria-label="Familiar preview">
          <FamiliarAvatar familiar={draft} size="clamp(130px, 42vw, 180px)" />
        </section>
        <Tabs defaultValue="species" orientation="horizontal">
          <TabsList aria-label="Familiar customization categories" className="grid h-auto w-full grid-cols-3 gap-1 bg-[#eae8eb] p-1 sm:grid-cols-6">
            {CATEGORIES.map((category) => (
              <TabsTrigger key={category.key} value={category.key} className="min-h-11 px-2 text-xs text-[#485365] data-[state=active]:bg-[#faf3eb] data-[state=active]:text-[#364152]">{category.label}</TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((category) => (
            <TabsContent key={category.key} value={category.key} className="pt-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={`${category.label} choices`}>
                {optionsFor(category.key, draft).map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={draft[category.key] === option.value ? "secondary" : "outline"}
                    className="h-auto min-h-14 justify-start gap-2 whitespace-normal px-3 py-2 text-left leading-tight"
                    disabled={isRemoteUnavailable || status === "saving"}
                    aria-pressed={draft[category.key] === option.value}
                    onClick={() => selectOption(category.key, option.value)}
                  >
                    {option.asset ? <img src={option.asset} alt="" className="h-10 w-10 shrink-0 object-contain" aria-hidden="true" /> : null}
                    {option.color ? <span className="h-5 w-5 shrink-0 rounded-full border border-[#657080]" style={{ backgroundColor: option.color }} aria-hidden="true" /> : null}
                    {option.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        {error ? <p className="md:col-span-2 text-sm font-medium text-[#9a4f57]" role="alert">{error}</p> : null}
        {notice ? <p className="md:col-span-2 text-sm font-medium text-[#4e756f]" role="status">{notice}</p> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        {isRemoteUnavailable ? <Button type="button" variant="outline" className="min-h-11" onClick={retryFamiliar}>Retry</Button> : null}
        <Button type="button" variant="outline" className="min-h-11" disabled={isRemoteUnavailable || !hasChanges || status === "saving"} onClick={() => { setDraft(familiar); setNotice(""); }}>Revert</Button>
        <Button type="button" className="min-h-11" disabled={isRemoteUnavailable || !hasChanges || status === "saving"} onClick={save}>Save</Button>
      </CardFooter>
    </Card>
  );
}
