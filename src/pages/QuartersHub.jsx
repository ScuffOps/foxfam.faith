import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { getPrivateUserKey } from "@/lib/communityActor";
import { GAME_WORLD_ORDER } from "@/lib/gameHubCatalog";
import { DEFAULT_RELIC } from "@/lib/relicCharms";
import { loadRelicRollGate, loadUserRelicInventory } from "@/lib/relicService";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import { DEFAULT_FAMILIAR } from "@/games/shared/familiar/familiarCatalog";
import { loadStarfishingProgression } from "@/games/starfishing/api/starfishingProgressionClient";

const STATION_ROUTES = {
  forge: "/relic-forge",
  customize: "/profile",
  trophies: "/profile",
  collections: "/codex",
};

export default function QuartersHub() {
  const {
    openLogin,
    user,
    isAuthenticated,
    isLoadingAuth,
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [level, setLevel] = useState(null);
  const [relicInventory, setRelicInventory] = useState({ relic: null, charms: [] });
  const [loadedOwnerId, setLoadedOwnerId] = useState("");
  const [starfishingProgression, setStarfishingProgression] = useState(null);
  const [starfishingStatus, setStarfishingStatus] = useState("loading");
  const [gate, setGate] = useState(null);
  const [scene, setScene] = useState("quarters");
  const [cursor, setCursor] = useState({ x: 50, y: 65 });
  const [selectedStation, setSelectedStation] = useState("forge");
  const familiar = DEFAULT_FAMILIAR;
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
      setRelicInventory({ relic: DEFAULT_RELIC, charms: [] });
      setStarfishingProgression(null);
      setGate(null);
    }
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
  }, [isAuthenticated, isLoadingAuth, ownerId, privateUserKey]);

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
  const favor = Math.max(0, Number(visibleLevel?.points || 0));

  const openStation = useCallback((stationKey) => {
    if (stationKey === "decorate") {
      setNotice("Decoration placement is staged for the next persistence pass.");
      return;
    }
    const route = STATION_ROUTES[stationKey];
    if (route) navigate(route);
  }, [navigate]);

  const activateStation = useCallback((stationKey) => {
    if (stationKey === "courtyard") {
      setScene("courtyard");
      setSelectedStation("");
      return;
    }
    setSelectedStation(stationKey);
  }, []);

  const handleShortcut = useCallback((action) => {
    if (action === "courtyard") {
      setScene((current) => current === "quarters" ? "courtyard" : "quarters");
      setSelectedStation("");
      return;
    }
    if (action === "inventory") navigate("/reliquary");
    if (action === "charms") navigate("/profile");
    if (action === "quests") navigate("/");
    if (action === "collections") setSelectedStation("collections");
  }, [navigate]);

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

  useGameControls({ enabled: !loading, onAction: handleControl });

  if (loading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center">
        <div className="rounded-lg border-2 border-[#485365] bg-[#FAF3EB] p-6 text-center text-[#364152]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm font-bold">Opening your Quarters...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="quarters-home animate-fade-in">
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
            familiar={familiar}
            onMove={(position) => setCursor(moveSceneCursor(position, { x: 0, y: 0 }))}
            onActivate={activateStation}
          />
        ) : (
          <PrioryCourtyard
            worlds={worlds}
            familiar={familiar}
            onBack={() => setScene("quarters")}
            onEnterWorld={navigate}
          />
        )}

        <QuartersHud
          name={user?.display_name}
          favor={favor}
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

      <div className="mt-4 max-w-xl">
        <StarfishingProgressCard
          progression={visibleProgression}
          charms={visibleInventory.charms}
          status={visibleStarfishingStatus}
          compact
        />
      </div>

      <p className="sr-only">
        Forge access is {gate?.enabled ? "open" : "restricted"}. Loaded {visibleInventory.charms.length} charms.
      </p>
    </main>
  );
}
