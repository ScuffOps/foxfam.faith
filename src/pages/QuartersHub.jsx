import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import IsometricRoom from "@/components/quarters/IsometricRoom";
import PrioryCourtyard from "@/components/quarters/PrioryCourtyard";
import QuartersHud from "@/components/quarters/QuartersHud";
import StationPanel from "@/components/quarters/StationPanel";
import { moveSceneCursor } from "@/components/quarters/quartersSceneModel";
import StarfishingProgressCard from "@/components/relics/StarfishingProgressCard";
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
  const { openLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState(null);
  const [relicInventory, setRelicInventory] = useState({ relic: null, charms: [] });
  const [starfishingProgression, setStarfishingProgression] = useState(null);
  const [starfishingStatus, setStarfishingStatus] = useState("loading");
  const [gate, setGate] = useState(null);
  const [scene, setScene] = useState("quarters");
  const [cursor, setCursor] = useState({ x: 50, y: 65 });
  const [selectedStation, setSelectedStation] = useState("forge");
  const familiar = DEFAULT_FAMILIAR;

  useEffect(() => {
    let mounted = true;

    async function loadQuarters() {
      setLoading(true);
      setNotice("");
      try {
        const me = await communityClient.auth.me().catch(() => null);
        const [inventory, loadedGate, starfishingResult] = await Promise.all([
          me ? loadUserRelicInventory().catch(() => ({ relic: DEFAULT_RELIC, charms: [] })) : Promise.resolve({ relic: DEFAULT_RELIC, charms: [] }),
          loadRelicRollGate().catch(() => null),
          me
            ? loadStarfishingProgression()
              .then((progression) => ({ progression, available: true }))
              .catch(() => ({ progression: null, available: false }))
            : Promise.resolve({ progression: null, available: false }),
        ]);
        const userKey = getPrivateUserKey(me);
        const levels = userKey ? await communityClient.entities.UserLevel.filter({ user_key: userKey }).catch(() => []) : [];

        if (!mounted) return;
        setUser(me);
        setRelicInventory(inventory);
        setStarfishingProgression(starfishingResult.progression);
        setStarfishingStatus(me ? (starfishingResult.available ? "ready" : "unavailable") : "signed-out");
        setGate(loadedGate);
        setLevel(levels[0] || null);
        if (!me) setNotice("Guest preview: real Favor, forge grants, and saved decor unlock after sign-in.");
      } catch (loadError) {
        if (!mounted) return;
        setRelicInventory({ relic: DEFAULT_RELIC, charms: [] });
        setStarfishingProgression(null);
        setStarfishingStatus("unavailable");
        setGate(null);
        setNotice(loadError?.message || "Local preview: live Quarters storage is unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuarters();
    return () => { mounted = false; };
  }, []);

  const worlds = useMemo(() => GAME_WORLD_ORDER, []);
  const favor = Math.max(0, Number(level?.points || 0));

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
          progression={starfishingProgression}
          charms={relicInventory.charms}
          status={starfishingStatus}
          compact
        />
      </div>

      <p className="sr-only">
        Forge access is {gate?.enabled ? "open" : "restricted"}. Loaded {relicInventory.charms.length} charms.
      </p>
    </main>
  );
}
