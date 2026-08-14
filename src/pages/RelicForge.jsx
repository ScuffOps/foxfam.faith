import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Circle, Gem, Hammer, Lamp, Loader2, LogIn, Music, RefreshCw, Save, Shield, Sparkles, Stars, VenetianMask, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import CharmForgeWorkbench from "@/components/relics/CharmForgeWorkbench";
import RelicPreview from "@/components/relics/RelicPreview";
import { useAuth } from "@/lib/AuthContext";
import { communityClient } from "@/api/communityClient";
import { getOrCreateUserRelic, loadRelicRollGate, saveUserRelic } from "@/lib/relicService";
import { normalizeRelic, RELIC_BASES, RELIC_EFFECTS, RELIC_THEMES } from "@/lib/relicCharms";
import { canManageRoles } from "@/lib/roles";
import { getPrivateUserKey } from "@/lib/communityActor";
import { relicForgeService } from "@/lib/relicForgeService";
import { applyForgeReceipt, formatForgeReceipt } from "@/lib/relicForgeUiModel";
import { RELIC_FORGE_GUEST_PREVIEW } from "@/lib/relicForgePreviewState";

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
const GUEST_OWNER_ID = "guest-preview";

function getRelicLoadMessage(error) {
  if (error?.status === 401 || error?.message === "Authentication required") {
    return "Sign in to tune your relic.";
  }
  if (error?.message?.includes("Supabase is not configured")) {
    return "Relic storage is not configured in this local preview.";
  }
  return "Relic could not be loaded.";
}

function SelectionTile({ item, active, onClick }) {
  const Icon = BASE_ICONS[item.id] || Shield;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        active
          ? "border-2 border-[#485365] bg-[#dfd8ab] text-[#364152] shadow-[0_3px_0_#9b9077]"
          : "border-2 border-[#707989] bg-[#faf3eb] text-[#657080] hover:bg-[#d9e6ec] hover:text-[#364152]"
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
        active ? "border-2 border-[#485365] bg-[#80adbc] text-[#24303d]" : "border-2 border-[#707989] bg-[#faf3eb] text-[#657080] hover:bg-[#d9e6ec]"
      }`}
      aria-pressed={active}
    >
      <span className="font-medium">{theme.label}</span>
      <span className="flex gap-1">
        {theme.palette.map((color) => (
          <span key={color} className="h-4 w-4 rounded-full border-2 border-[#485365]" style={{ backgroundColor: color }} />
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
          ? "border-2 border-[#485365] bg-[#dfd8ab] text-[#364152]"
          : "border-2 border-[#707989] bg-[#faf3eb] text-[#657080] hover:bg-[#f8e6e6] hover:text-[#364152]"
      }`}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" />
      {effect.label}
    </button>
  );
}

export default function RelicForge() {
  const { openLogin, user: authUser, isAuthenticated, isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState("Base");
  const [user, setUser] = useState(null);
  const [gate, setGate] = useState(null);
  const [relic, setRelic] = useState(null);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forgeState, setForgeState] = useState(null);
  const [forgeLoading, setForgeLoading] = useState(true);
  const [forgeError, setForgeError] = useState("");
  const [busyForgeAction, setBusyForgeAction] = useState("");
  const [retryForgeRequest, setRetryForgeRequest] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadedOwnerId, setLoadedOwnerId] = useState("");
  const loadEpochRef = useRef(0);
  const activeOwnerRef = useRef("");
  const ownerId = isAuthenticated && authUser?.id ? authUser.id : "";
  const isGuestPreview = !isLoadingAuth && !isAuthenticated;
  activeOwnerRef.current = ownerId;

  useEffect(() => {
    const loadEpoch = loadEpochRef.current + 1;
    loadEpochRef.current = loadEpoch;
    let cancelled = false;

    setLoadedOwnerId("");
    setUser(null);
    setRelic(null);
    setGate(null);
    setLevel(null);
    setForgeState(null);
    setForgeError("");
    setError("");
    setSaving(false);
    setBusyForgeAction("");
    setRetryForgeRequest(null);

    if (isLoadingAuth) {
      setLoading(true);
      setForgeLoading(true);
      return () => { cancelled = true; };
    }
    if (!isAuthenticated) {
      setUser(null);
      setRelic(RELIC_FORGE_GUEST_PREVIEW.relic);
      setGate({ enabled: true, reason: "Guest preview" });
      setLevel({ points: RELIC_FORGE_GUEST_PREVIEW.forge.balances.favor });
      setForgeState(RELIC_FORGE_GUEST_PREVIEW.forge);
      setForgeError("");
      setForgeLoading(false);
      setError("");
      setLoading(false);
      setLoadedOwnerId(GUEST_OWNER_ID);
      return () => { cancelled = true; };
    }
    const loadRelic = async () => {
      setLoading(true);
      setForgeLoading(true);
      setError("");
      try {
        const [loaded, loadedGate, loadedForge] = await Promise.all([
          getOrCreateUserRelic(),
          loadRelicRollGate(),
          relicForgeService.loadState()
            .then((state) => ({ state, error: null }))
            .catch((forgeLoadError) => ({ state: null, error: forgeLoadError })),
        ]);
        const levels = await communityClient.entities.UserLevel
          .filter({ user_key: getPrivateUserKey(authUser) })
          .catch(() => []);
        if (
          !cancelled
          && loadEpochRef.current === loadEpoch
          && activeOwnerRef.current === ownerId
        ) {
          setUser(authUser);
          setRelic(loaded);
          setGate(loadedGate);
          setLevel(levels[0] || null);
          setForgeState(loadedForge.state);
          setForgeError(loadedForge.error?.message || "");
          setForgeLoading(false);
          setLoadedOwnerId(ownerId);
        }
      } catch (loadError) {
        if (
          !cancelled
          && loadEpochRef.current === loadEpoch
          && activeOwnerRef.current === ownerId
        ) {
          setLoadedOwnerId(ownerId);
          setError(getRelicLoadMessage(loadError));
        }
      } finally {
        if (
          !cancelled
          && loadEpochRef.current === loadEpoch
          && activeOwnerRef.current === ownerId
        ) {
          setLoading(false);
          setForgeLoading(false);
        }
      }
    };
    loadRelic();
    return () => { cancelled = true; };
  }, [authUser, isAuthenticated, isLoadingAuth, loadAttempt, ownerId]);

  const hasCurrentOwnerData = isGuestPreview
    ? loadedOwnerId === GUEST_OWNER_ID
    : Boolean(ownerId) && loadedOwnerId === ownerId;
  const normalizedRelic = normalizeRelic(hasCurrentOwnerData ? relic : null);
  const canBypassGate = canManageRoles(user);
  const forgeOpen = isGuestPreview || Boolean(gate?.enabled) || canBypassGate;
  const selectedEffects = RELIC_EFFECTS.filter((item) => normalizedRelic.effects.includes(item.id));
  const currentFavor = Math.max(0, Number(forgeState?.balances.favor ?? level?.points ?? 0));
  const investedFavor = Math.max(0, Number(normalizedRelic.favor_spent || 0));
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
    if (isGuestPreview) {
      openLogin();
      return;
    }
    if (!relicReady) return;
    const actionOwnerId = ownerId;
    setSaving(true);
    try {
      const result = await saveUserRelic(normalizedRelic);
      if (activeOwnerRef.current !== actionOwnerId) return;
      const chargedFavor = Math.max(0, -result.favor.delta);
      setRelic(result.relic);
      setLevel((current) => ({ ...(current || {}), points: result.favor.balance }));
      setForgeState((current) => current ? {
        ...current,
        balances: { ...current.balances, favor: result.favor.balance },
      } : current);
      toast({
        title: result.replayed ? "Relic already saved" : "Relic saved",
        description: chargedFavor > 0
          ? `${chargedFavor} Favor invested. ${result.favor.balance} Favor remains.`
          : "Your one profile relic has been updated.",
      });
    } catch (saveError) {
      if (activeOwnerRef.current !== actionOwnerId) return;
      toast({ title: "Relic could not be saved", description: saveError?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      if (activeOwnerRef.current === actionOwnerId) setSaving(false);
    }
  };

  const runForgeAction = async (operation, charm) => {
    if (isGuestPreview) {
      openLogin();
      return;
    }
    const actionOwnerId = ownerId;
    const requestId = retryForgeRequest?.operation === operation && retryForgeRequest?.charmId === charm.id
      ? retryForgeRequest.requestId
      : crypto.randomUUID();
    setBusyForgeAction(`${operation}:${charm.id}`);
    setForgeError("");
    try {
      const receipt = operation === "awaken"
        ? await relicForgeService.upgradeCharm(charm.id, requestId)
        : await relicForgeService.convertDuplicateCharm(charm.id, requestId);
      if (activeOwnerRef.current !== actionOwnerId) return;
      setForgeState((current) => applyForgeReceipt(current, receipt));
      setRetryForgeRequest(null);
      toast({
        title: operation === "awaken" ? "Charm awakened" : "Duplicate converted",
        description: formatForgeReceipt(receipt),
      });
    } catch (forgeActionError) {
      if (activeOwnerRef.current !== actionOwnerId) return;
      setRetryForgeRequest({ operation, charmId: charm.id, requestId });
      setForgeError(forgeActionError?.message || "The Forge could not complete that action. Retry uses the same protected request.");
    } finally {
      if (activeOwnerRef.current === actionOwnerId) setBusyForgeAction("");
    }
  };

  if (loading || (!isLoadingAuth && !hasCurrentOwnerData)) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-24 text-[#485365]"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading Relic Forge</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border-2 border-[#707989] bg-[#faf3eb] p-6 text-center text-[#364152] shadow-[0_5px_0_#c7bbb0]">
        {isAuthenticated || isLoadingAuth
          ? <RefreshCw className="mx-auto h-8 w-8 text-[#80adbc]" />
          : <LogIn className="mx-auto h-8 w-8 text-[#80adbc]" />}
        <h1 className="mt-4 font-heading text-2xl font-bold">Relic Forge</h1>
        <p className="mt-2 text-sm text-[#485365]">{error}</p>
        {isAuthenticated || isLoadingAuth ? (
          <Button className="mt-5 gap-2" onClick={() => setLoadAttempt((current) => current + 1)}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        ) : (
          <Button className="mt-5 gap-2" onClick={openLogin}>
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        )}
      </div>
    );
  }

  if (!forgeOpen) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border-2 border-[#707989] bg-[#faf3eb] p-6 text-center text-[#364152] shadow-[0_5px_0_#c7bbb0]">
        <Hammer className="mx-auto h-8 w-8 text-[#80adbc]" />
        <h1 className="mt-4 font-heading text-2xl font-bold">Relic Forge Locked</h1>
        <p className="mt-2 text-sm text-[#485365]">
          {gate?.reason || "Relic charms are locked until Veri opens the forge."}
        </p>
        <Button asChild className="mt-5 gap-2">
          <Link to="/quarters"><ArrowLeft className="h-4 w-4" /> Back to Quarters</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relic-forge-page mx-auto max-w-6xl text-[#364152]">
      <div className="mb-5 flex flex-col gap-3 border-y-2 border-[#596575] bg-[#faf3eb] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#485365]">
            <Hammer className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Workshop Bench</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Relic Forge</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#485365]">
            Tune the single relic attached to your profile. Charms and accessories live in your profile collection.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/quarters"><ArrowLeft className="h-4 w-4" /> Back to Quarters</Link>
        </Button>
      </div>

      {isGuestPreview ? (
        <section className="mb-5 flex flex-col gap-3 rounded-lg border-2 border-[#596575] bg-[#dfd8ab] p-4 text-[#364152] shadow-[3px_3px_0_#9b9077] sm:flex-row sm:items-center sm:justify-between" aria-label="Guest Forge preview">
          <div>
            <p className="font-heading text-sm font-bold">Read-only Forge specimen</p>
            <p className="mt-1 text-xs leading-5">Explore a sample relic, rarity tiers, materials, and achievement charms. Nothing here is saved or awarded.</p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={openLogin}>
            <LogIn className="h-4 w-4" /> Sign in to forge
          </Button>
        </section>
      ) : null}

      <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_7px_0_#c7bbb0] lg:p-5">
        <div className="grid gap-4 md:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
          <aside className="space-y-4">
            <div className="flex rounded-lg border-2 border-[#707989] bg-[#d9e6ec] p-1">
              {STEPS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStep(item)}
                  aria-pressed={step === item}
                  className={`flex-1 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    step === item ? "bg-[#dfd8ab] text-[#364152] shadow-[0_2px_0_#9b9077]" : "text-[#485365] hover:bg-[#faf3eb] hover:text-[#364152]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rounded-lg border-2 border-[#707989] bg-[#eee8e8] p-4">
              <div className="mb-4 rounded-lg border-2 border-[#707989] bg-[#d9e6ec] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#485365]">Favor budget</p>
                    <p className="mt-1 font-heading text-2xl font-bold">{currentFavor} Favor</p>
                  </div>
                  <Gem className="h-5 w-5 text-[#80adbc]" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <span className="rounded-md border-2 border-[#707989] bg-[#faf3eb] px-2 py-1">
                    Server priced
                  </span>
                  <span className="rounded-md border-2 border-[#707989] bg-[#faf3eb] px-2 py-1">
                    No refunds
                  </span>
                  <span className="rounded-md border-2 border-[#707989] bg-[#eaeee0] px-2 py-1 text-[#364152]">
                    Atomic save
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#485365]">
                  The Forge verifies the build and charges the exact canonical cost when you save.
                </p>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-sm font-bold">{step}</h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#485365]">One relic only</span>
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
                <div>
                  <p className="mb-3 text-xs leading-5 text-[#657080]">Choose one signature visual motif. Equipped charms remain separate and never clutter the relic body.</p>
                  <div className="flex flex-wrap gap-2">
                    {RELIC_EFFECTS.map((item) => (
                      <EffectChip
                        key={item.id}
                        effect={item}
                        active={normalizedRelic.effects[0] === item.id}
                        onClick={() => updateRelic("effects", [item.id])}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === "Name" && (
                <div className="space-y-3">
                  <label className="text-sm font-bold" htmlFor="relic-name">Relic name</label>
                  <Input id="relic-name" value={normalizedRelic.name} onChange={(event) => updateRelic("name", event.target.value)} className="bg-secondary/60" />
                  <p className="text-xs leading-5 text-muted-foreground">Keep it solemn and artifact-like. The forge dislikes joke names.</p>
                </div>
              )}

              {step === "Lore" && (
                <div className="space-y-3">
                  <label className="text-sm font-bold" htmlFor="relic-lore">Relic lore</label>
                  <Textarea id="relic-lore" value={normalizedRelic.lore} onChange={(event) => updateRelic("lore", event.target.value)} className="min-h-32 bg-secondary/60 text-sm leading-6" />
                  <p className="text-xs leading-5 text-muted-foreground">One or two atmospheric lines are enough for the first pass.</p>
                </div>
              )}
            </div>
          </aside>

          <RelicPreview relic={normalizedRelic} charms={forgeState?.charms || []} />

          <aside className="space-y-4 md:col-span-2 xl:col-span-1">
            <div className="rounded-lg border-2 border-[#707989] bg-[#eee8e8] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-md border-2 border-[#707989] bg-[#d9e6ec] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#364152]">
                  Profile Relic
                </span>
                <Shield className="h-5 w-5 text-[#80adbc]" />
              </div>
              <h2 className="font-heading text-xl font-bold">{normalizedRelic.name || "Unnamed Relic"}</h2>
              <p className="mt-1 text-sm text-[#485365]">This save updates your only relic, not a new item.</p>
              <div className="my-4 rounded-lg border-2 border-[#9b9077] bg-[#f8f1df] p-3 text-sm leading-6 text-[#596575]">
                {normalizedRelic.lore || "A relic waits for its first vow."}
              </div>
              <div className="mb-4 rounded-lg border-2 border-[#707989] bg-[#faf3eb] p-3 text-xs text-[#657080]">
                <div className="flex items-center justify-between gap-3">
                  <span>Favor invested</span>
                  <strong className="text-[#364152]">{investedFavor}</strong>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>Pricing</span>
                  <strong className="text-[#364152]">Verified by Forge</strong>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>Available Favor</span>
                  <strong className="text-[#526b55]">{currentFavor}</strong>
                </div>
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${item.done ? "border-[#718a73] bg-[#eaeee0] text-[#526b55]" : "border-[#9aa2ad] text-[#707989]"}`}>
                      {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                    </span>
                    <span className={item.done ? "text-[#364152]" : "text-[#657080]"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Button onClick={handleSave} disabled={!isGuestPreview && (!relicReady || saving)} className="h-11 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isGuestPreview ? "Sign in to save" : saving ? "Saving..." : "Save Relic"}
              </Button>
              <Button asChild variant="outline" className="h-10 gap-2">
                <Link to="/profile"><Sparkles className="h-4 w-4" /> Manage Charms</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-5">
        {forgeLoading ? (
          <section className="rounded-lg border-2 border-[#4a5668] bg-[#faf3eb] p-8 text-center text-[#35404f] shadow-[4px_4px_0_#c7bbb0]" aria-live="polite">
            <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold">Counting charms and forge materials...</p>
          </section>
        ) : forgeState ? (
          <CharmForgeWorkbench
            state={forgeState}
            busyAction={busyForgeAction}
            error={forgeError}
            readOnly={isGuestPreview}
            onUpgrade={(charm) => runForgeAction("awaken", charm)}
            onConvert={(charm) => runForgeAction("convert", charm)}
          />
        ) : (
          <section className="rounded-lg border-2 border-[#9d6068] bg-[#f4dfe1] p-5 text-[#71434a]" role="alert">
            <h2 className="font-heading text-lg font-bold">Charm workbench unavailable</h2>
            <p className="mt-1 text-sm leading-6">{forgeError || "Your relic editor is safe, but charm progression could not be loaded."}</p>
          </section>
        )}
      </div>
    </div>
  );
}
