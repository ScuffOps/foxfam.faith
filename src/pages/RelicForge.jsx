import { useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  Circle,
  Coins,
  Gem,
  Hammer,
  Lamp,
  Leaf,
  MoonStar,
  Music,
  Save,
  ScrollText,
  Shield,
  Sparkles,
  Stars,
  VenetianMask,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const BASE_TYPES = [
  { id: "lantern", label: "Lantern", icon: Lamp, cost: 45 },
  { id: "tome", label: "Tome", icon: BookOpen, cost: 35 },
  { id: "mask", label: "Mask", icon: VenetianMask, cost: 55 },
  { id: "crystal", label: "Crystal", icon: Gem, cost: 40 },
  { id: "charm", label: "Charm", icon: Shield, cost: 30 },
  { id: "instrument", label: "Instrument", icon: Music, cost: 50 },
];

const THEMES = [
  { id: "celestial", label: "Celestial", palette: ["#0a1430", "#38bdf8", "#f9d77e"], accent: "text-sky-200" },
  { id: "corrupted", label: "Corrupted", palette: ["#171023", "#8b5cf6", "#9ee85f"], accent: "text-violet-200" },
  { id: "floral", label: "Floral", palette: ["#14291f", "#ec6f9b", "#f6e8b8"], accent: "text-rose-200" },
  { id: "gothic", label: "Gothic", palette: ["#111827", "#a51d43", "#cba869"], accent: "text-amber-200" },
  { id: "permafrost", label: "Permafrost", palette: ["#071424", "#93e4ff", "#ddd6fe"], accent: "text-cyan-100" },
];

const EFFECTS = [
  { id: "blue-flame", label: "Blue flame", icon: Sparkles, cost: 12 },
  { id: "star-orbit", label: "Star orbit", icon: Stars, cost: 18 },
  { id: "petal-drift", label: "Petal drift", icon: Leaf, cost: 10 },
  { id: "sigil-glow", label: "Sigil mark", icon: WandSparkles, cost: 16 },
  { id: "snow-dots", label: "Snow dots", icon: Circle, cost: 8 },
  { id: "lore-script", label: "Lore script", icon: ScrollText, cost: 14 },
];

const ATTACHMENTS = [
  { id: "oath-beads", label: "Oath beads" },
  { id: "silver-twine", label: "Silver twine" },
  { id: "tiny-charm", label: "Tiny charm" },
  { id: "root-knot", label: "Root knot" },
];

const STEPS = ["Base", "Theme", "Effects", "Name", "Lore"];

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function getRarity(totalCost, effectCount) {
  if (totalCost >= 100 || effectCount >= 4) return "Mythic";
  if (totalCost >= 75 || effectCount >= 3) return "Epic";
  if (totalCost >= 52 || effectCount >= 1) return "Rare";
  return "Common";
}

function SelectionTile({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active
          ? "border-cyan-300/55 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
          : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      <span className="flex items-center justify-between">
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{item.cost} F</span>
      </span>
      <span className="font-heading text-sm font-semibold">{item.label}</span>
    </button>
  );
}

function ThemeButton({ theme, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active ? "border-primary/60 bg-primary/15 text-foreground" : "border-white/10 bg-white/[0.035] text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      <span className="font-medium">{theme.label}</span>
      <span className="flex gap-1">
        {theme.palette.map((color) => (
          <span key={color} className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
        ))}
      </span>
    </button>
  );
}

function EffectChip({ effect, active, onClick }) {
  const Icon = effect.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active
          ? "border-amber-200/55 bg-amber-200/12 text-amber-100"
          : "border-white/10 bg-white/[0.035] text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" />
      {effect.label}
    </button>
  );
}

function AttachmentSlot({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active ? "border-rose-200/60 bg-rose-200/14 text-rose-100" : "border-white/10 bg-black/20 text-muted-foreground hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function RelicForge() {
  const [step, setStep] = useState("Base");
  const [baseType, setBaseType] = useState("lantern");
  const [theme, setTheme] = useState("celestial");
  const [effects, setEffects] = useState(["blue-flame", "star-orbit"]);
  const [attachments, setAttachments] = useState(["oath-beads", "silver-twine"]);
  const [name, setName] = useState("Ashen Promise");
  const [lore, setLore] = useState("Forged from a careful vow that learned to glow before it learned where it was going.");
  const [forged, setForged] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const selectedBase = BASE_TYPES.find((item) => item.id === baseType) || BASE_TYPES[0];
  const selectedTheme = THEMES.find((item) => item.id === theme) || THEMES[0];
  const selectedEffects = EFFECTS.filter((item) => effects.includes(item.id));
  const totalCost = selectedBase.cost + selectedEffects.reduce((sum, item) => sum + item.cost, 0);
  const rarity = getRarity(totalCost, selectedEffects.length);
  const relicReady = name.trim().length >= 4 && lore.trim().length >= 18 && selectedEffects.length > 0;

  const checklist = useMemo(
    () => [
      { label: "Solemn relic name", done: name.trim().length >= 4 },
      { label: "Theme and base chosen", done: Boolean(baseType && theme) },
      { label: "At least one light FX", done: selectedEffects.length > 0 },
      { label: "Lore text prepared", done: lore.trim().length >= 18 },
    ],
    [baseType, lore, name, selectedEffects.length, theme]
  );

  const handleForge = () => {
    if (!relicReady) return;
    setDraftSaved(false);
    setForged(true);
  };

  return (
    <div className="community-dashboard mx-auto max-w-6xl animate-fade-in">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-200/70">
            <Hammer className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Workshop Bench</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Relic Forge</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Assemble a profile relic from base, theme, cosmetic effects, charms, name, and lore.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-semibold text-cyan-100">
            <Coins className="h-3.5 w-3.5" /> 260 Favor
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-xs font-semibold text-amber-100">
            <Sparkles className="h-3.5 w-3.5" /> {rarity} - {totalCost} Favor
          </span>
        </div>
      </div>

      <section className="foxcard rounded-xl p-4 lg:p-5">
        <div className="grid gap-4 md:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
          <aside className="space-y-4">
            <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
              {STEPS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStep(item)}
                  className={`flex-1 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    step === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold">{step}</h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Click to tune</span>
              </div>

              {step === "Base" && (
                <div className="grid grid-cols-2 gap-2">
                  {BASE_TYPES.map((item) => (
                    <SelectionTile key={item.id} item={item} active={baseType === item.id} onClick={() => setBaseType(item.id)} />
                  ))}
                </div>
              )}

              {step === "Theme" && (
                <div className="space-y-2">
                  {THEMES.map((item) => (
                    <ThemeButton key={item.id} theme={item} active={theme === item.id} onClick={() => setTheme(item.id)} />
                  ))}
                </div>
              )}

              {step === "Effects" && (
                <div className="flex flex-wrap gap-2">
                  {EFFECTS.map((item) => (
                    <EffectChip key={item.id} effect={item} active={effects.includes(item.id)} onClick={() => setEffects((current) => toggleListValue(current, item.id))} />
                  ))}
                </div>
              )}

              {step === "Name" && (
                <div className="space-y-3">
                  <Input value={name} onChange={(event) => setName(event.target.value)} className="bg-secondary/60" />
                  <p className="text-xs leading-5 text-muted-foreground">Keep it solemn and artifact-like. The forge dislikes joke names.</p>
                </div>
              )}

              {step === "Lore" && (
                <div className="space-y-3">
                  <Textarea value={lore} onChange={(event) => setLore(event.target.value)} className="min-h-32 bg-secondary/60 text-sm leading-6" />
                  <p className="text-xs leading-5 text-muted-foreground">One or two atmospheric lines are enough for the first pass.</p>
                </div>
              )}
            </div>
          </aside>

          <div className="min-h-[31rem] rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.15),transparent_34%),linear-gradient(180deg,rgba(10,14,34,0.88),rgba(6,8,20,0.94))] p-4">
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/55">Live Work Pad</p>
                  <h2 className="mt-1 font-heading text-lg font-bold">{selectedBase.label} - {selectedTheme.label}</h2>
                </div>
                <Bot className="h-5 w-5 text-cyan-100/60" />
              </div>

              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-cyan-100/10 bg-black/25">
                <div className="absolute inset-x-8 bottom-12 h-20 rounded-[50%] bg-[radial-gradient(ellipse,rgba(148,163,184,0.28),rgba(20,25,48,0.08)_62%,transparent_70%)]" />
                <div className="absolute top-5 flex flex-wrap justify-center gap-2 px-4">
                  {ATTACHMENTS.map((item) => (
                    <AttachmentSlot
                      key={item.id}
                      label={item.label}
                      active={attachments.includes(item.id)}
                      onClick={() => setAttachments((current) => toggleListValue(current, item.id))}
                    />
                  ))}
                </div>

                <div className="relative mt-14 flex h-72 w-72 items-center justify-center rounded-full border border-cyan-100/10 bg-[radial-gradient(circle,rgba(34,211,238,0.12),rgba(15,23,42,0.35)_54%,rgba(0,0,0,0.1))] lg:h-80 lg:w-80">
                  <div className="absolute inset-7 rounded-full border border-dashed border-cyan-100/20" />
                  <div className="absolute -left-2 top-1/2 h-8 w-8 rounded-full border border-amber-100/30 bg-amber-100/10" />
                  <div className="absolute -right-2 top-1/2 h-8 w-8 rounded-full border border-rose-100/30 bg-rose-100/10" />
                  <div className="absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 rounded-full border border-cyan-100/30 bg-cyan-100/10" />
                  <div className="absolute bottom-1 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border border-violet-100/30 bg-violet-100/10" />

                  <img
                    src="/assets/lantern-altar.png"
                    alt={`${name || "Relic"} preview`}
                    className={`relative z-10 h-64 w-48 object-contain transition-transform duration-300 ${forged ? "scale-105" : "hover:scale-[1.03]"}`}
                  />

                  {effects.includes("star-orbit") && (
                    <div className="absolute inset-10 animate-spin rounded-full border border-cyan-100/10 [animation-duration:18s]">
                      <Stars className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-amber-100" />
                    </div>
                  )}
                  {effects.includes("petal-drift") && <Leaf className="absolute bottom-20 right-16 h-5 w-5 rotate-12 text-rose-200" />}
                  {effects.includes("snow-dots") && <div className="absolute left-16 top-24 h-2 w-2 rounded-full bg-cyan-100" />}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 md:col-span-2 xl:col-span-1">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${selectedTheme.accent}`}>
                  {rarity}
                </span>
                <MoonStar className="h-5 w-5 text-cyan-100/65" />
              </div>
              <h2 className="font-heading text-xl font-bold">{name || "Unnamed Relic"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selectedTheme.label} {selectedBase.label}</p>
              <div className="my-4 rounded-lg border border-amber-100/15 bg-amber-100/[0.055] p-3 text-sm leading-6 text-amber-50/85">
                {lore || "A relic waits for its first vow."}
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${item.done ? "border-emerald-200/50 bg-emerald-200/12 text-emerald-100" : "border-white/10 text-muted-foreground"}`}>
                      {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <span className={item.done ? "text-card-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {forged && (
              <div className="rounded-xl border border-cyan-200/25 bg-cyan-200/10 p-4 text-sm text-cyan-50">
                <p className="font-heading font-bold">Relic draft forged.</p>
                <p className="mt-1 text-cyan-50/70">The panel is wired locally and ready for the next pass: saving, imagegen prompt export, or Favor spend.</p>
              </div>
            )}

            {draftSaved && (
              <div className="rounded-xl border border-emerald-200/25 bg-emerald-200/10 p-4 text-sm text-emerald-50">
                <p className="font-heading font-bold">Draft saved locally.</p>
                <p className="mt-1 text-emerald-50/70">This test panel keeps the state in the browser until storage is wired.</p>
              </div>
            )}

            <div className="grid gap-2">
              <Button onClick={handleForge} disabled={!relicReady} className="h-11 gap-2">
                <Hammer className="h-4 w-4" /> Forge Relic
              </Button>
              <Button
                variant="outline"
                className="h-10 gap-2"
                onClick={() => {
                  setForged(false);
                  setDraftSaved(true);
                }}
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
