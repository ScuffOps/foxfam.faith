import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Circle, Gem, Hammer, Lamp, Loader2, LogIn, Music, Save, Shield, Sparkles, Stars, VenetianMask, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import RelicPreview from "@/components/relics/RelicPreview";
import { useAuth } from "@/lib/AuthContext";
import { getOrCreateUserRelic, saveUserRelic } from "@/lib/relicService";
import { normalizeRelic, RELIC_BASES, RELIC_EFFECTS, RELIC_THEMES } from "@/lib/relicCharms";

const BASE_ICONS = {
  lantern: Lamp,
  tome: BookOpen,
  mask: VenetianMask,
  crystal: Gem,
  instrument: Music,
};

const EFFECT_ICONS = {
  "blue-flame": Sparkles,
  "star-orbit": Stars,
  "petal-drift": WandSparkles,
  "sigil-glow": Shield,
  "snow-dots": Circle,
  "lore-script": BookOpen,
};

const STEPS = ["Base", "Theme", "Effects", "Name", "Lore"];

function getRelicLoadMessage(error) {
  if (error?.status === 401 || error?.message === "Authentication required") {
    return "Sign in to tune your relic.";
  }
  if (error?.message?.includes("Supabase is not configured")) {
    return "Relic storage is not configured in this local preview.";
  }
  return "Relic could not be loaded.";
}

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function SelectionTile({ item, active, onClick }) {
  const Icon = BASE_ICONS[item.id] || Shield;
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
  const Icon = EFFECT_ICONS[effect.id] || Sparkles;
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

export default function RelicForge() {
  const { openLogin } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState("Base");
  const [relic, setRelic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadRelic = async () => {
      setLoading(true);
      try {
        const loaded = await getOrCreateUserRelic();
        if (mounted) setRelic(loaded);
      } catch (loadError) {
        if (mounted) setError(getRelicLoadMessage(loadError));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadRelic();
    return () => { mounted = false; };
  }, []);

  const normalizedRelic = normalizeRelic(relic);
  const selectedEffects = RELIC_EFFECTS.filter((item) => normalizedRelic.effects.includes(item.id));
  const relicReady = normalizedRelic.name.trim().length >= 4 && normalizedRelic.lore.trim().length >= 18 && selectedEffects.length > 0;

  const checklist = useMemo(
    () => [
      { label: "Solemn relic name", done: normalizedRelic.name.trim().length >= 4 },
      { label: "Theme and base chosen", done: Boolean(normalizedRelic.base_type && normalizedRelic.theme) },
      { label: "At least one light FX", done: selectedEffects.length > 0 },
      { label: "Lore text prepared", done: normalizedRelic.lore.trim().length >= 18 },
    ],
    [normalizedRelic.base_type, normalizedRelic.lore, normalizedRelic.name, normalizedRelic.theme, selectedEffects.length]
  );

  const updateRelic = (field, value) => {
    setRelic((current) => normalizeRelic({ ...normalizeRelic(current), [field]: value }));
  };

  const handleSave = async () => {
    if (!relicReady) return;
    setSaving(true);
    try {
      const saved = await saveUserRelic(normalizedRelic);
      setRelic(saved);
      toast({ title: "Relic saved", description: "Your one profile relic has been updated." });
    } catch {
      toast({ title: "Relic could not be saved", description: "Refresh and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 text-center">
        <LogIn className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 font-heading text-2xl font-bold">Relic Forge</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-5 gap-2" onClick={openLogin}>
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
      </div>
    );
  }

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
            Tune the single relic attached to your profile. Charms and accessories live in your profile collection.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/profile"><Shield className="h-4 w-4" /> Back to Profile</Link>
        </Button>
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
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">One relic only</span>
              </div>

              {step === "Base" && (
                <div className="grid grid-cols-2 gap-2">
                  {RELIC_BASES.map((item) => (
                    <SelectionTile key={item.id} item={item} active={normalizedRelic.base_type === item.id} onClick={() => updateRelic("base_type", item.id)} />
                  ))}
                </div>
              )}

              {step === "Theme" && (
                <div className="space-y-2">
                  {RELIC_THEMES.map((item) => (
                    <ThemeButton key={item.id} theme={item} active={normalizedRelic.theme === item.id} onClick={() => updateRelic("theme", item.id)} />
                  ))}
                </div>
              )}

              {step === "Effects" && (
                <div className="flex flex-wrap gap-2">
                  {RELIC_EFFECTS.map((item) => (
                    <EffectChip
                      key={item.id}
                      effect={item}
                      active={normalizedRelic.effects.includes(item.id)}
                      onClick={() => updateRelic("effects", toggleListValue(normalizedRelic.effects, item.id))}
                    />
                  ))}
                </div>
              )}

              {step === "Name" && (
                <div className="space-y-3">
                  <Input value={normalizedRelic.name} onChange={(event) => updateRelic("name", event.target.value)} className="bg-secondary/60" />
                  <p className="text-xs leading-5 text-muted-foreground">Keep it solemn and artifact-like. The forge dislikes joke names.</p>
                </div>
              )}

              {step === "Lore" && (
                <div className="space-y-3">
                  <Textarea value={normalizedRelic.lore} onChange={(event) => updateRelic("lore", event.target.value)} className="min-h-32 bg-secondary/60 text-sm leading-6" />
                  <p className="text-xs leading-5 text-muted-foreground">One or two atmospheric lines are enough for the first pass.</p>
                </div>
              )}
            </div>
          </aside>

          <RelicPreview relic={normalizedRelic} />

          <aside className="space-y-4 md:col-span-2 xl:col-span-1">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                  Profile Relic
                </span>
                <Shield className="h-5 w-5 text-cyan-100/65" />
              </div>
              <h2 className="font-heading text-xl font-bold">{normalizedRelic.name || "Unnamed Relic"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">This save updates your only relic, not a new item.</p>
              <div className="my-4 rounded-lg border border-amber-100/15 bg-amber-100/[0.055] p-3 text-sm leading-6 text-amber-50/85">
                {normalizedRelic.lore || "A relic waits for its first vow."}
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

            <div className="grid gap-2">
              <Button onClick={handleSave} disabled={!relicReady || saving} className="h-11 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Relic"}
              </Button>
              <Button asChild variant="outline" className="h-10 gap-2">
                <Link to="/profile"><Sparkles className="h-4 w-4" /> Manage Charms</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
