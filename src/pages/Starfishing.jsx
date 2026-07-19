import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Fish, Sparkles } from "lucide-react";
import GameCanvasHost from "@/games/shared/ui/GameCanvasHost";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import GameShell from "@/games/shared/ui/GameShell";
import { createSceneBridge } from "@/games/shared/phaser/sceneBridge";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { useGameControls } from "@/games/shared/input/useGameControls";
import StarfishingScene from "@/games/starfishing/phaser/StarfishingScene";
import FishpediaPanel from "@/games/starfishing/ui/FishpediaPanel";
import StarfishingHud from "@/games/starfishing/ui/StarfishingHud";
import { communityClient } from "@/api/communityClient";
import {
  claimStarfishingCatch,
  loadStarfishingProgression,
  startStarfishingCast,
} from "@/games/starfishing/api/starfishingProgressionClient";
import {
  abandonServerClaim,
  applyStarfishingAction,
  beginServerCast,
  beginServerClaim,
  buildCatchRewardIntent,
  createInitialStarfishingState,
  failServerCast,
  failServerClaim,
  FISHPEDIA_STORAGE_KEY,
  readLocalJson,
  receiveServerClaim,
  receiveServerTicket,
  REWARD_LOG_STORAGE_KEY,
  STARFISHING_PHASES,
  tickStarfishing,
  updateFishpedia,
  writeLocalJson,
} from "@/games/starfishing/simulation/starfishingRules";
import { DUPLICATE_POLICIES } from "@/lib/gameRewards";
import "@/games/starfishing/ui/starfishing.css";

const DUPLICATE_CHOICES = [
  { key: DUPLICATE_POLICIES.keep, label: "Keep the star", description: "Preserve this catch in your Fishpedia." },
  { key: DUPLICATE_POLICIES.release, label: "Release for Favor", description: "Return it gently for an authoritative Favor reward." },
  { key: DUPLICATE_POLICIES.convert, label: "Distill to Star Glass", description: "Convert it into authoritative forge materials." },
];

const AUTH_MODES = {
  checking: "checking",
  guest: "guest",
  signedIn: "signed-in",
};

function buildFishpediaLookup(rows = []) {
  return Object.fromEntries(rows.map((record) => [
    record.fishKey,
    {
      caught: true,
      count: record.caughtCount,
      biggestSize: record.largestSize,
      smallestSize: record.smallestSize,
    },
  ]));
}

function mergeClaimProgression(current, claim) {
  const baseline = current || {
    fishpedia: [],
    recentCatches: [],
    favorBalance: 0,
    materials: [],
    achievements: [],
    trophies: [],
  };
  const fishpedia = baseline.fishpedia.filter((row) => row.fishKey !== claim.fishpedia.fishKey);
  const materials = new Map(baseline.materials.map((material) => [material.materialKey, material]));
  claim.materials.forEach((material) => {
    materials.set(material.key, {
      materialKey: material.key,
      balance: material.balance,
      updatedAt: claim.catch.caughtAt,
    });
  });
  const achievements = new Map(
    baseline.achievements.map((achievement) => [achievement.achievementKey, achievement]),
  );
  claim.achievements.forEach((achievement) => {
    achievements.set(achievement.achievementKey, {
      ...achievement,
      sourceCatchId: claim.catch.id,
      unlockedAt: claim.catch.caughtAt,
    });
  });

  return {
    ...baseline,
    fishpedia: [...fishpedia, claim.fishpedia],
    recentCatches: [claim.catch, ...baseline.recentCatches].slice(0, 20),
    favorBalance: claim.favor.balance,
    materials: [...materials.values()],
    achievements: [...achievements.values()],
    recentCharms: claim.charms,
  };
}

function friendlyProgressionError(error, action) {
  if (error?.code === "STARFISHING_REQUEST_REJECTED") {
    return {
      code: error.code,
      message: action === "cast"
        ? "Portal catch rewards are not available yet. Your local preview remains untouched."
        : "Portal catch rewards are not available yet. This catch was not granted.",
      retryable: false,
    };
  }
  return {
    code: error?.code || "STARFISHING_REQUEST_FAILED",
    message: error?.message || "Starfishing progress could not be synced.",
    retryable: Boolean(error?.retryable),
  };
}

function waitUntil(timestamp) {
  const delay = Math.max(0, Date.parse(timestamp || "") - Date.now());
  return delay ? new Promise((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve();
}

export default function Starfishing() {
  const [state, setState] = useState(() => createInitialStarfishingState());
  const [localFishpedia, setLocalFishpedia] = useState(() => readLocalJson(FISHPEDIA_STORAGE_KEY, {}));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(REWARD_LOG_STORAGE_KEY, []));
  const [authMode, setAuthMode] = useState(AUTH_MODES.checking);
  const [progression, setProgression] = useState(null);
  const [isProgressionLoading, setIsProgressionLoading] = useState(true);
  const [progressionError, setProgressionError] = useState("");
  const stateRef = useRef(state);
  const fishpediaRef = useRef(localFishpedia);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (authMode !== AUTH_MODES.guest) return;
    fishpediaRef.current = localFishpedia;
    writeLocalJson(FISHPEDIA_STORAGE_KEY, localFishpedia);
  }, [authMode, localFishpedia]);
  useEffect(() => {
    if (authMode === AUTH_MODES.signedIn) {
      fishpediaRef.current = buildFishpediaLookup(progression?.fishpedia);
    }
  }, [authMode, progression?.fishpedia]);
  useEffect(() => {
    if (authMode === AUTH_MODES.guest) {
      writeLocalJson(REWARD_LOG_STORAGE_KEY, rewardLog.slice(0, 25));
    }
  }, [authMode, rewardLog]);

  useEffect(() => {
    let active = true;
    async function loadSessionProgression() {
      try {
        await communityClient.auth.me();
      } catch {
        if (!active) return;
        setAuthMode(AUTH_MODES.guest);
        setIsProgressionLoading(false);
        return;
      }

      if (!active) return;
      setAuthMode(AUTH_MODES.signedIn);
      try {
        const nextProgression = await loadStarfishingProgression();
        if (active) setProgression(nextProgression);
      } catch (error) {
        if (active) {
          setProgressionError(error?.message || "Your portal Fishpedia could not be loaded.");
        }
      } finally {
        if (active) setIsProgressionLoading(false);
      }
    }
    loadSessionProgression();
    return () => { active = false; };
  }, []);

  const commitState = useCallback((nextState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const requestServerCast = useCallback(async () => {
    const requesting = beginServerCast(stateRef.current);
    if (requesting === stateRef.current) return;
    commitState(requesting);
    try {
      const ticket = await startStarfishingCast();
      commitState(receiveServerTicket(stateRef.current, ticket));
    } catch (error) {
      commitState(failServerCast(
        stateRef.current,
        friendlyProgressionError(error, "cast"),
      ));
    }
  }, [commitState]);

  const dispatchAction = useCallback((action) => {
    const isCastAction = [
      GAME_ACTIONS.primary,
      GAME_ACTIONS.confirm,
      GAME_ACTIONS.cast,
    ].includes(action);
    if (
      authMode === AUTH_MODES.signedIn
      && isCastAction
      && [STARFISHING_PHASES.idle, STARFISHING_PHASES.escaped].includes(stateRef.current.phase)
    ) {
      if (!progression) return;
      requestServerCast();
      return;
    }
    if (authMode === AUTH_MODES.checking) return;
    setState((current) => applyStarfishingAction(current, action, fishpediaRef.current));
  }, [authMode, progression, requestServerCast]);

  useEffect(() => {
    const interval = window.setInterval(() => setState((current) => tickStarfishing(current)), 120);
    return () => window.clearInterval(interval);
  }, []);

  useGameControls({
    enabled: authMode !== AUTH_MODES.checking
      && (authMode !== AUTH_MODES.signedIn || Boolean(progression))
      && ![
      STARFISHING_PHASES.caught,
      STARFISHING_PHASES.requestingCast,
      STARFISHING_PHASES.claiming,
      STARFISHING_PHASES.claimError,
    ].includes(state.phase),
    onAction: dispatchAction,
  });

  const bridge = useMemo(() => createSceneBridge({
    getState: () => stateRef.current,
    dispatchAction,
  }), [dispatchAction]);

  const applyAuthoritativeClaim = useCallback((result) => {
    setProgression((current) => mergeClaimProgression(current, result));
    commitState(receiveServerClaim(stateRef.current, result));
  }, [commitState]);

  const submitServerClaim = useCallback(async (pendingClaim) => {
    try {
      const result = await claimStarfishingCatch({
        ticketId: stateRef.current.serverTicket.ticketId,
        idempotencyKey: pendingClaim.idempotencyKey,
        duplicatePolicy: pendingClaim.duplicatePolicy,
        telemetry: pendingClaim.telemetry,
      });
      applyAuthoritativeClaim(result);
    } catch (error) {
      commitState(failServerClaim(
        stateRef.current,
        friendlyProgressionError(error, "claim"),
      ));
    }
  }, [applyAuthoritativeClaim, commitState]);

  const handleCatchChoice = useCallback(async (policy) => {
    const catchRecord = stateRef.current.lastCatch;
    if (!catchRecord || stateRef.current.phase !== STARFISHING_PHASES.caught) return;

    if (authMode === AUTH_MODES.signedIn) {
      const telemetry = {
        actionCount: stateRef.current.qtePattern.length,
        missCount: 0,
        durationMs: Math.min(
          600000,
          Math.max(0, Date.now() - stateRef.current.castStartedAt),
        ),
      };
      const claiming = beginServerClaim(
        stateRef.current,
        window.crypto.randomUUID(),
        policy,
        telemetry,
      );
      commitState(claiming);
      await waitUntil(claiming.serverTicket.notBefore);
      await submitServerClaim(claiming.pendingClaim);
      return;
    }

    const intent = buildCatchRewardIntent({
      catchRecord,
      duplicatePolicy: policy,
      durationMs: Math.max(0, Date.now() - stateRef.current.castStartedAt),
    });
    setLocalFishpedia((current) => updateFishpedia(current, catchRecord));
    if (intent) setRewardLog((current) => [intent, ...current].slice(0, 25));
    setState((current) => ({
      ...current,
      lastRewardIntent: intent,
      phase: STARFISHING_PHASES.idle,
      activeFish: null,
      qtePattern: [],
      qteIndex: 0,
    }));
  }, [authMode, commitState, submitServerClaim]);

  const handleRetryClaim = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== STARFISHING_PHASES.claimError || !current.pendingClaim) return;
    const claiming = beginServerClaim(
      current,
      current.pendingClaim.idempotencyKey,
      current.pendingClaim.duplicatePolicy,
      current.pendingClaim.telemetry,
    );
    commitState(claiming);
    submitServerClaim(claiming.pendingClaim);
  }, [commitState, submitServerClaim]);

  const handleReturnWithoutReward = useCallback(() => {
    commitState(abandonServerClaim(stateRef.current));
  }, [commitState]);

  const handleReset = useCallback(() => {
    commitState(createInitialStarfishingState());
  }, [commitState]);

  const latestRewardIntent = rewardLog[0] || null;
  const isCatchReveal = state.phase === STARFISHING_PHASES.caught && state.lastCatch;
  const choices = state.lastCatch?.duplicate
    ? DUPLICATE_CHOICES
    : [{ key: DUPLICATE_POLICIES.none, label: "Add to Fishpedia", description: "Record this new constellation catch." }];

  return (
    <GameShell
      world="starfishing"
      title="Starfishing"
      eyebrow="Moonwater Observatory"
      status={<span className="starfishing-status"><Sparkles aria-hidden="true" /> Streak {state.streak}</span>}
      actions={(
        <span
          className="starfishing-local"
          title={authMode === AUTH_MODES.signedIn ? "Portal rewards are server verified" : "Rewards remain a local preview"}
        >
          {authMode === AUTH_MODES.checking
            ? "Checking session"
            : authMode === AUTH_MODES.signedIn ? "Portal rewards" : "Local preview"}
        </span>
      )}
      sidebar={(
        <div className="starfishing-sidebar">
          {isCatchReveal ? (
            <GameResultSheet
              title={`${state.lastCatch.label} caught`}
              record={{ label: state.lastCatch.rarity, value: `${state.lastCatch.size}\" starspan` }}
              choices={choices}
              onChoose={handleCatchChoice}
            />
          ) : (
            <StarfishingHud
              state={state}
              rewardIntent={latestRewardIntent}
              authMode={authMode}
              isProgressionLoading={isProgressionLoading}
              isProgressionUnavailable={authMode === AUTH_MODES.signedIn && !isProgressionLoading && !progression}
              progression={progression}
              onCast={() => dispatchAction(GAME_ACTIONS.primary)}
              onQteAction={dispatchAction}
              onReset={handleReset}
              onRetryClaim={handleRetryClaim}
              onReturnWithoutReward={handleReturnWithoutReward}
            />
          )}
        </div>
      )}
    >
      <div className="starfishing-world">
        <GameCanvasHost
          scene={StarfishingScene}
          bridge={bridge}
          backgroundColor="#d9e6ec"
          className="starfishing-canvas"
        />
        <div className="starfishing-scene-label" aria-hidden="true">
          <Fish /> Constellation Pond
        </div>
      </div>
      <FishpediaPanel
        fishpedia={localFishpedia}
        authoritativeRows={authMode === AUTH_MODES.signedIn ? progression?.fishpedia || [] : null}
      />
      <p className="starfishing-safety-note">
        <BookOpen aria-hidden="true" />
        {authMode === AUTH_MODES.signedIn
          ? progressionError || "Signed-in catches are recorded only after the portal validates them."
          : "Catch records and reward intents stay on this device in local preview mode."}
      </p>
    </GameShell>
  );
}
