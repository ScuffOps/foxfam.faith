import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Dice5, DoorOpen, Gem, Loader2, LogIn, Settings, Shield, Sparkles, WandSparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import RelicPreview from "@/components/relics/RelicPreview";
import ProfileCharmShelf from "@/components/relics/ProfileCharmShelf";
import StarfishingProgressCard from "@/components/relics/StarfishingProgressCard";
import {
  classifyProgressionLoadError,
  planProgressSurfaceSession,
} from "@/components/relics/starfishingProgressModel";
import RankBadge from "@/components/RankBadge";
import ProgressionLoop from "@/components/ProgressionLoop";
import { loadStarfishingProgression } from "@/games/starfishing/api/starfishingProgressionClient";
import { getPrivateUserKey } from "@/lib/communityActor";
import { useAuth } from "@/lib/AuthContext";
import { isAuthUnavailable } from "@/lib/authFailure";
import { getRoleLabel } from "@/lib/roles";
import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";
import { loadCharmRollEligibility, loadUserRelicInventory, rollUserRelicCharm, setEquippedCharm } from "@/lib/relicService";
import { RELIC_RARITY_META } from "@/lib/relicCharms";
import { getProfileRelicTeaser } from "@/lib/profileRelicTeasers";

export default function Profile() {
  const {
    openLogin,
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    checkUserAuth,
  } = useAuth();
  const { toast } = useToast();
  const [level, setLevel] = useState(null);
  const [relic, setRelic] = useState(null);
  const [charms, setCharms] = useState([]);
  const [loadedOwnerId, setLoadedOwnerId] = useState("");
  const [starfishingProgression, setStarfishingProgression] = useState(null);
  const [starfishingStatus, setStarfishingStatus] = useState("loading");
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [rollEligibility, setRollEligibility] = useState({ canRoll: false, reason: "Checking stream status..." });
  const [error, setError] = useState("");
  const loadEpochRef = useRef(0);
  const previousOwnerRef = useRef("");
  const activeOwnerRef = useRef("");
  const ownerId = isAuthenticated && user?.id ? user.id : "";
  const privateUserKey = getPrivateUserKey(user);
  activeOwnerRef.current = ownerId;

  useEffect(() => {
    const plan = planProgressSurfaceSession({
      isLoadingAuth,
      isAuthenticated,
      userId: ownerId,
      previousUserId: previousOwnerRef.current,
      epoch: loadEpochRef.current,
    });
    loadEpochRef.current = plan.nextEpoch;
    previousOwnerRef.current = plan.ownerId;
    const loadEpoch = plan.nextEpoch;
    let cancelled = false;

    if (plan.shouldClear) {
      setLoadedOwnerId("");
      setLevel(null);
      setRelic(null);
      setCharms([]);
      setStarfishingProgression(null);
      setRollEligibility({ canRoll: false, reason: "Checking stream status..." });
    }
    setError("");
    setStarfishingStatus(plan.status);
    setLoading(isLoadingAuth || plan.shouldLoad);

    if (!plan.shouldLoad) {
      return () => { cancelled = true; };
    }

    async function loadProfileOwner() {
      const [levelsResult, inventoryResult, eligibilityResult, starfishingResult] = await Promise.all([
        communityClient.entities.UserLevel
          .filter({ user_key: privateUserKey })
          .then((levels) => ({ data: levels, error: null }))
          .catch((loadError) => ({ data: [], error: loadError })),
        loadUserRelicInventory()
          .then((inventory) => ({ data: inventory, error: null }))
          .catch((loadError) => ({ data: null, error: loadError })),
        loadCharmRollEligibility()
          .then((eligibility) => ({ data: eligibility, error: null }))
          .catch((loadError) => ({ data: null, error: loadError })),
        loadStarfishingProgression()
          .then((progression) => ({ data: progression, error: null }))
          .catch((loadError) => ({ data: null, error: loadError })),
      ]);

      if (
        cancelled
        || loadEpochRef.current !== loadEpoch
        || activeOwnerRef.current !== ownerId
      ) return;

      setLoadedOwnerId(ownerId);
      setLevel(levelsResult.data[0] || null);
      setRelic(inventoryResult.data?.relic || null);
      setCharms(inventoryResult.data?.charms || []);
      setRollEligibility(eligibilityResult.data || {
        canRoll: false,
        reason: "The forge gate could not be checked.",
      });
      setStarfishingProgression(starfishingResult.data);
      setStarfishingStatus(
        starfishingResult.error
          ? classifyProgressionLoadError(starfishingResult.error)
          : "ready",
      );
      if (inventoryResult.error || levelsResult.error) {
        setError("Some profile relic records could not be loaded.");
      }
      setLoading(false);
    }

    loadProfileOwner();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoadingAuth, ownerId, privateUserKey]);

  const hasCurrentOwnerData = Boolean(ownerId) && loadedOwnerId === ownerId;
  const visibleCharms = hasCurrentOwnerData ? charms : [];
  const visibleLevel = hasCurrentOwnerData ? level : null;
  const visibleRelic = hasCurrentOwnerData ? relic : null;
  const visibleProgression = hasCurrentOwnerData ? starfishingProgression : null;
  const visibleStarfishingStatus = hasCurrentOwnerData
    ? starfishingStatus
    : (ownerId ? "loading" : "signed-out");
  const equippedCount = visibleCharms.filter((charm) => charm.equipped).length;
  const authoritativeFavor = Math.max(0, Number(visibleProgression?.favorBalance ?? visibleLevel?.points ?? 0));
  const equippedProfileFrame = visibleCharms.find((charm) => (
    charm.equipped && typeof charm.effects?.profile_frame === "string"
  ));
  const equippedProfileParticle = visibleCharms.find((charm) => (
    charm.equipped && typeof charm.effects?.profile_particle === "string"
  ));
  const relicTeaser = useMemo(() => user ? getProfileRelicTeaser(user) : null, [user]);
  const equipProfileCharm = (...args) => setEquippedCharm(...args);

  const handleRollCharm = async () => {
    const actionOwnerId = ownerId;
    setRolling(true);
    try {
      const charm = await rollUserRelicCharm();
      if (activeOwnerRef.current !== actionOwnerId) return;
      setCharms((current) => [charm, ...current]);
      const rarity = RELIC_RARITY_META[charm.rarity]?.label || "Charm";
      toast({ title: `${rarity} charm acquired`, description: charm.name });
    } catch (rollError) {
      toast({
        title: "Charm roll failed",
        description: rollError?.message || "The relic table rejected the draw. Try again after refreshing.",
        variant: "destructive",
      });
    } finally {
      if (activeOwnerRef.current === actionOwnerId) setRolling(false);
    }
  };

  const handleCharmsChange = (nextCharms) => {
    if (activeOwnerRef.current === loadedOwnerId) setCharms(nextCharms);
  };

  const handleCopyQuartersLink = async () => {
    const quartersUrl = new URL(`/quarters/${ownerId}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(quartersUrl);
      toast({
        title: "Quarters link copied",
        description: "Signed-in Foxfam members can now visit your public collection.",
      });
    } catch {
      toast({
        title: "Could not copy the link",
        description: "Open your public Quarters preview and copy its address from the browser.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthUnavailable(authError)) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in space-y-4">
        <section className="rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-6 text-center text-[#3f4857] shadow-[4px_4px_0_#c7bbb0]" role="alert">
          <p className="text-[10px] font-bold uppercase text-[#7c6f72]">Profile connection</p>
          <h1 className="mt-2 font-heading text-xl font-bold">Profile service unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#657080]">
            {authError.message || "Foxfam could not verify your session. Your saved profile has not been changed."}
          </p>
          <Button type="button" variant="outline" className="mt-5" onClick={checkUserAuth}>
            Retry connection
          </Button>
        </section>
        <StarfishingProgressCard status="unavailable" compact />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold">Claim Your Profile Relic</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Sign in to save your relic, roll charms, and attach collectibles."}</p>
        <Button className="mt-5 gap-2" onClick={openLogin}>
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
        <div className="mt-6 text-left">
          <StarfishingProgressCard status="signed-out" compact />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className={`relative rounded-lg bg-[#faf3eb] p-5 text-[#364152] ${equippedProfileFrame ? "border-[3px] border-[#80adbc] shadow-[0_6px_0_#b4c6dc]" : "border-2 border-[#707989] shadow-[0_5px_0_#c7bbb0]"}`}>
          {equippedProfileParticle ? (
            <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-md border-2 border-[#485365] bg-[#dfd8ab] px-2 py-1 text-[10px] font-black uppercase" title={equippedProfileParticle.name}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {equippedProfileParticle.name}
            </span>
          ) : null}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar avatar={getPublicAvatar(user)} name={getPublicDisplayName(user, "Profile")} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Profile</p>
              <h1 className="mt-1 truncate font-heading text-2xl font-bold">{getPublicDisplayName(user, "Profile")}</h1>
              <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/quarters/${ownerId}`}><DoorOpen className="h-4 w-4" /> Preview public Quarters</Link>
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleCopyQuartersLink}>
                <Copy className="h-4 w-4" /> Copy visit link
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <RankBadge
                points={visibleLevel?.points || 0}
                showProgress
                isFavored={Boolean(visibleLevel?.is_favored)}
                favoredTitle={visibleLevel?.favored_title}
              />
              <div className="mt-4">
                <ProgressionLoop
                  points={visibleLevel?.points || 0}
                  compact
                  framed={false}
                  isFavored={Boolean(visibleLevel?.is_favored)}
                  favoredTitle={visibleLevel?.favored_title}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProfileStat icon={Gem} label="Owned charms" value={visibleCharms.length} />
              <ProfileStat icon={Shield} label="Attached" value={equippedCount} />
              <ProfileStat icon={Sparkles} label="Favor" value={authoritativeFavor} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border-2 border-[#707989] bg-[#faf3eb] text-[#364152] shadow-[0_5px_0_#c7bbb0]">
          <div className="relative min-h-44 border-b-2 border-[#707989] bg-[#d9e6ec] p-5">
            <img
              src={relicTeaser?.image}
              alt=""
              className="mx-auto h-28 w-28 object-contain"
            />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Profile Relic</p>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {relicTeaser?.stage}
              </span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold">{relicTeaser?.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{relicTeaser?.omen}</p>
            <div className="mt-4 rounded-lg border border-border bg-secondary/25 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Seal ID</p>
              <p className="mt-1 font-heading text-lg font-semibold text-primary">{relicTeaser?.code}</p>
            </div>
            <Button asChild className="mt-4 w-full gap-2 border-2 border-[#485365] bg-[#80adbc] text-[#24303d]">
              <Link to="/relic-forge"><WandSparkles className="h-4 w-4" /> Open Relic Forge</Link>
            </Button>
          </div>
        </div>
      </section>

      <StarfishingProgressCard
        progression={visibleProgression}
        charms={visibleCharms}
        status={visibleStarfishingStatus}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <RelicPreview relic={visibleRelic} charms={visibleCharms} />

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Charm Draw</p>
                <h2 className="mt-1 font-heading text-lg font-bold">Relic charm roll</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Weighted rarity draw. Duplicates are still collectible instances.</p>
              </div>
              <Dice5 className="h-5 w-5 text-primary" />
            </div>
            <Button onClick={handleRollCharm} disabled={rolling || !rollEligibility.canRoll} className="mt-4 w-full gap-2">
              {rolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice5 className="h-4 w-4" />}
              {rolling ? "Drawing..." : rollEligibility.canRoll ? "Roll Charm" : "Locked"}
            </Button>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{rollEligibility.reason}</p>
          </div>
        </div>
      </section>

      <ProfileCharmShelf
        charms={visibleCharms}
        equipmentService={equipProfileCharm}
        onCharmsChange={handleCharmsChange}
      />
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Avatar({ avatar, name }) {
  if (avatar) {
    return <img src={avatar} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-primary/25 object-cover" />;
  }

  const initials = String(name || "FF").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 font-heading text-lg font-bold text-primary">
      {initials}
    </div>
  );
}
