import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Gem, LibraryBig, Loader2, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import IsometricRoom from "@/components/quarters/IsometricRoom";
import PrioryCourtyard from "@/components/quarters/PrioryCourtyard";
import QuartersHud from "@/components/quarters/QuartersHud";
import StationPanel from "@/components/quarters/StationPanel";
import { moveSceneCursor } from "@/components/quarters/quartersSceneModel";
import StarfishingProgressCard from "@/components/relics/StarfishingProgressCard";
import {
  classifyProgressionLoadError,
  planProgressSurfaceSession,
} from "@/components/relics/starfishingProgressModel";
import "@/components/quarters/quarters-scene.css";
import { Button } from "@/components/ui/button";
import { communityClient } from "@/api/communityClient";
import { useAuth } from "@/lib/AuthContext";
import { isAuthUnavailable } from "@/lib/authFailure";
import { getPrivateUserKey } from "@/lib/communityActor";
import { GAME_WORLD_ORDER } from "@/lib/gameHubCatalog";
import { DEFAULT_RELIC } from "@/lib/relicCharms";
import { loadRelicRollGate, loadUserRelicInventory } from "@/lib/relicService";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import { useFamiliar } from "@/games/shared/familiar/useFamiliar";
import { DEFAULT_FAMILIAR } from "@/games/shared/familiar/familiarCatalog";
import { loadPublicGameProgression } from "@/games/shared/progression/publicGameProgressionClient";
import { loadStarfishingProgression } from "@/games/starfishing/api/starfishingProgressionClient";

const STATION_ROUTES = {
  forge: "/relic-forge",
  customize: "/profile/familiar",
  trophies: "/collections",
  collections: "/collections",
};

const VISITOR_PRIVATE_STATIONS = new Set(["forge", "customize", "decorate"]);

export default function QuartersHub() {
  const {
    openLogin,
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    checkUserAuth,
  } = useAuth();
  const navigate = useNavigate();
  const { profileUserId = "" } = useParams();
  const { familiar } = useFamiliar();
  const [loading, setLoading] = useState(true);
  const [publicProgression, setPublicProgression] = useState(null);
  const [notice, setNotice] = useState("");
  const [level, setLevel] = useState(null);
  const [relicInventory, setRelicInventory] = useState({ relic: null, charms: [] });
  const [loadedOwnerId, setLoadedOwnerId] = useState("");
  const [starfishingProgression, setStarfishingProgression] = useState(null);
  const [starfishingStatus, setStarfishingStatus] = useState("loading");
  const [gate, setGate] = useState(null);
  const [scene, setScene] = useState("quarters");
  const [cursor, setCursor] = useState({ x: 50, y: 65 });
  const [selectedStation, setSelectedStation] = useState("");
  const loadEpochRef = useRef(0);
  const previousOwnerRef = useRef("");
  const activeOwnerRef = useRef("");
  const isVisitorMode = Boolean(profileUserId);
  const ownerId = isAuthenticated && user?.id ? user.id : "";
  const privateUserKey = getPrivateUserKey(user);
  activeOwnerRef.current = ownerId;

  useEffect(() => {
    if (isVisitorMode) {
      const loadEpoch = loadEpochRef.current + 1;
      loadEpochRef.current = loadEpoch;
      let cancelled = false;

      setLoadedOwnerId("");
      setLevel(null);
      setRelicInventory({ relic: DEFAULT_RELIC, charms: [] });
      setStarfishingProgression(null);
      setStarfishingStatus(isAuthenticated ? "loading" : "signed-out");
      setGate(null);
      setPublicProgression(null);
      setNotice(isLoadingAuth || isAuthenticated
        ? ""
        : "Sign in to visit another member's public Quarters collection.");
      setLoading(isLoadingAuth || isAuthenticated);

      if (isLoadingAuth || !isAuthenticated) {
        return () => { cancelled = true; };
      }

      loadPublicGameProgression(profileUserId)
        .then((progression) => {
          if (cancelled || loadEpochRef.current !== loadEpoch) return;
          setPublicProgression(progression);
          setLoading(false);
        })
        .catch((loadError) => {
          if (cancelled || loadEpochRef.current !== loadEpoch) return;
          setNotice(loadError?.message || "This public collection is resting for a moment.");
          setLoading(false);
        });

      return () => { cancelled = true; };
    }

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
      setRelicInventory({ relic: DEFAULT_RELIC, charms: [] });
      setStarfishingProgression(null);
      setGate(null);
    }
    setPublicProgression(null);
    setNotice(plan.status === "signed-out"
      ? "Guest preview: real Favor, forge grants, and saved decor unlock after sign-in."
      : "");
    setStarfishingStatus(plan.status);
    setLoading(isLoadingAuth || plan.shouldLoad);

    if (!plan.shouldLoad) {
      return () => { cancelled = true; };
    }

    async function loadQuartersOwner() {
      const [inventoryResult, gateResult, levelsResult, starfishingResult] = await Promise.all([
        loadUserRelicInventory()
          .then((inventory) => ({ data: inventory, error: null }))
          .catch((loadError) => ({ data: null, error: loadError })),
        loadRelicRollGate()
          .then((loadedGate) => ({ data: loadedGate, error: null }))
          .catch((loadError) => ({ data: null, error: loadError })),
        communityClient.entities.UserLevel
          .filter({ user_key: privateUserKey })
          .then((levels) => ({ data: levels, error: null }))
          .catch((loadError) => ({ data: [], error: loadError })),
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
      setRelicInventory(inventoryResult.data || { relic: DEFAULT_RELIC, charms: [] });
      setGate(gateResult.data);
      setLevel(levelsResult.data[0] || null);
      setStarfishingProgression(starfishingResult.data);
      setStarfishingStatus(
        starfishingResult.error
          ? classifyProgressionLoadError(starfishingResult.error)
          : "ready",
      );
      if (inventoryResult.error || gateResult.error || levelsResult.error) {
        setNotice("Some Quarters records are resting. Your saved data has not been replaced.");
      }
      setLoading(false);
    }

    loadQuartersOwner();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoadingAuth, isVisitorMode, ownerId, privateUserKey, profileUserId]);

  const worlds = useMemo(() => GAME_WORLD_ORDER, []);
  const hasCurrentOwnerData = Boolean(ownerId) && loadedOwnerId === ownerId;
  const visibleLevel = hasCurrentOwnerData ? level : null;
  const visibleInventory = hasCurrentOwnerData
    ? relicInventory
    : { relic: DEFAULT_RELIC, charms: [] };
  const visibleProgression = hasCurrentOwnerData ? starfishingProgression : null;
  const visibleStarfishingStatus = hasCurrentOwnerData
    ? starfishingStatus
    : (ownerId ? "loading" : "signed-out");
  const favor = Math.max(0, Number(visibleProgression?.favorBalance ?? visibleLevel?.points ?? 0));

  const openStation = useCallback((stationKey) => {
    if (isVisitorMode) {
      if (VISITOR_PRIVATE_STATIONS.has(stationKey)) {
        setNotice("That station belongs to this Quarters' owner. Your own stations are waiting back in your Quarters.");
        setSelectedStation("");
        return;
      }
      if (stationKey === "trophies" || stationKey === "collections") {
        setNotice("This member's public collection is displayed below.");
        setSelectedStation("");
        return;
      }
    }
    if (stationKey === "decorate") {
      setNotice("Decoration placement is staged for the next persistence pass.");
      return;
    }
    const route = STATION_ROUTES[stationKey];
    if (route) navigate(route);
  }, [isVisitorMode, navigate]);

  const activateStation = useCallback((stationKey) => {
    if (stationKey === "courtyard") {
      setScene("courtyard");
      setSelectedStation("");
      return;
    }
    if (isVisitorMode && VISITOR_PRIVATE_STATIONS.has(stationKey)) {
      openStation(stationKey);
      return;
    }
    setSelectedStation(stationKey);
  }, [isVisitorMode, openStation]);

  const handleShortcut = useCallback((action) => {
    if (action === "courtyard") {
      setScene((current) => current === "quarters" ? "courtyard" : "quarters");
      setSelectedStation("");
      return;
    }
    if (action === "inventory") navigate("/reliquary");
    if (action === "charms") navigate("/profile");
    if (action === "quests") navigate("/");
    if (action === "collections") {
      if (isVisitorMode) {
        openStation("collections");
      } else {
        setSelectedStation("collections");
      }
    }
  }, [isVisitorMode, navigate, openStation]);

  const handleControl = useCallback((action) => {
    if (scene !== "quarters") {
      if (action === GAME_ACTIONS.cancel) setScene("quarters");
      return;
    }

    const delta = {
      [GAME_ACTIONS.moveLeft]: { x: -4, y: 0 },
      [GAME_ACTIONS.moveRight]: { x: 4, y: 0 },
      [GAME_ACTIONS.moveUp]: { x: 0, y: -4 },
      [GAME_ACTIONS.moveDown]: { x: 0, y: 4 },
    }[action];
    if (delta) {
      setCursor((current) => moveSceneCursor(current, delta));
      return;
    }

    if ([GAME_ACTIONS.interact, GAME_ACTIONS.confirm].includes(action) && selectedStation) {
      openStation(selectedStation);
    }
    if (action === GAME_ACTIONS.cancel) setSelectedStation("");
  }, [openStation, scene, selectedStation]);

  useGameControls({
    enabled: !loading,
    onAction: handleControl,
    preserveNativeButtonActivation: true,
  });

  if (loading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center">
        <div className="rounded-lg border-2 border-[#485365] bg-[#FAF3EB] p-6 text-center text-[#364152]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm font-bold">{isVisitorMode ? "Opening public Quarters..." : "Opening your Quarters..."}</p>
        </div>
      </div>
    );
  }

  if (isAuthUnavailable(authError)) {
    return (
      <section className="mx-auto max-w-2xl animate-fade-in space-y-4">
        <section className="rounded-lg border-2 border-[#707989] bg-[#f6f3ee] p-6 text-center text-[#3f4857] shadow-[4px_4px_0_#c7bbb0]" role="alert">
          <p className="text-[10px] font-bold uppercase text-[#62575a]">Quarters connection</p>
          <h1 className="mt-2 font-heading text-xl font-bold">Quarters service unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#657080]">
            {authError.message || "Foxfam could not verify your session. Your saved Quarters have not been changed."}
          </p>
          <Button type="button" variant="outline" className="mt-5" onClick={checkUserAuth}>
            Retry connection
          </Button>
        </section>
        <StarfishingProgressCard status="unavailable" compact />
      </section>
    );
  }

  return (
    <section className="quarters-home animate-fade-in" data-game-controls tabIndex={0} aria-labelledby="quarters-heading">
      <h1 id="quarters-heading" className="sr-only">{isVisitorMode ? "Visiting Quarters" : "Personal Quarters"}</h1>
      {notice ? (
        <div className="quarters-home__notice" role="status">
          <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{notice}</span>
          {!user ? <Button type="button" size="sm" variant="outline" onClick={openLogin}>Sign in</Button> : null}
        </div>
      ) : null}

      <div className="relative">
        {scene === "quarters" ? (
          <IsometricRoom
            cursor={cursor}
            selectedStation={selectedStation}
            familiar={isVisitorMode ? DEFAULT_FAMILIAR : familiar}
            onMove={(position) => setCursor(moveSceneCursor(position, { x: 0, y: 0 }))}
            onActivate={activateStation}
          />
        ) : (
          <PrioryCourtyard
            worlds={worlds}
            familiar={isVisitorMode ? DEFAULT_FAMILIAR : familiar}
            onBack={() => setScene("quarters")}
            onEnterWorld={navigate}
          />
        )}

        <QuartersHud
          name={isVisitorMode ? "Foxfam Member" : user?.display_name}
          favor={isVisitorMode ? null : favor}
          subtitle={isVisitorMode ? "Visiting Quarters" : "Personal Quarters"}
          scene={scene}
          onAction={handleShortcut}
        />

        {scene === "quarters" && selectedStation ? (
          <StationPanel
            stationKey={selectedStation}
            onClose={() => setSelectedStation("")}
            onOpen={openStation}
          />
        ) : null}
      </div>

      {isVisitorMode ? (
        <section className="mt-4 max-w-3xl rounded-lg border-2 border-[#586577] bg-[#faf3eb] p-4 text-[#364152] shadow-[4px_4px_0_#c7bbb0]" aria-labelledby="visitor-collection-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-[#62575a]">Public collection</p>
              <h2 id="visitor-collection-title" className="font-heading text-lg font-bold">A glimpse of their journey</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-[#7da3ad] bg-[#d9e6ec] px-3 py-2 text-sm font-bold">
              <LibraryBig className="h-4 w-4" aria-hidden="true" />
              {publicProgression?.fishpedia.discoveredCount ?? 0}/{publicProgression?.fishpedia.catalogCount ?? 0} Fishpedia
            </span>
          </div>
          {publicProgression ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[#b7a9a4] bg-[#fffaf5] p-3">
                <p className="inline-flex items-center gap-2 text-sm font-bold"><Gem className="h-4 w-4" aria-hidden="true" />Equipped charms</p>
                <p className="mt-1 text-sm text-[#657080]">
                  {publicProgression.equippedCharms.length
                    ? publicProgression.equippedCharms.map((charm) => charm.label).join(", ")
                    : "No public charm loadout equipped yet."}
                </p>
              </div>
              <div className="rounded-md border border-[#b7a9a4] bg-[#fffaf5] p-3">
                <p className="inline-flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4" aria-hidden="true" />Achievement trophies</p>
                <p className="mt-1 text-sm text-[#657080]">
                  {publicProgression.trophies.length
                    ? publicProgression.trophies.map((trophy) => trophy.title).join(", ")
                    : "No public trophies displayed yet."}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#657080]">
              {isAuthenticated ? "This public collection could not be loaded." : "Sign in to view this member's public collection."}
            </p>
          )}
        </section>
      ) : (
        <div className="mt-4 max-w-xl">
          <StarfishingProgressCard
            progression={visibleProgression}
            charms={visibleInventory.charms}
            status={visibleStarfishingStatus}
            compact
          />
        </div>
      )}

      {!isVisitorMode ? <p className="sr-only">
        Forge access is {gate?.enabled ? "open" : "restricted"}. Loaded {visibleInventory.charms.length} charms.
      </p> : null}
    </section>
  );
}
