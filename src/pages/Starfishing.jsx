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
import { communityClient, supabase } from "@/api/communityClient";
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
  createPendingClaimSnapshot,
  createInitialStarfishingState,
  failServerCast,
  failServerClaim,
  FISHPEDIA_STORAGE_KEY,
  getOwnerPendingClaimEnvelope,
  isClaimContextCurrent,
  planStarfishingSessionTransition,
  readLocalJson,
  receiveServerClaim,
  receiveServerTicket,
  removeOwnerPendingClaimEnvelope,
  REWARD_LOG_STORAGE_KEY,
  restorePendingClaimSnapshot,
  selectSignedInDuplicatePolicy,
  STARFISHING_PHASES,
  tickStarfishing,
  upsertOwnerPendingClaimEnvelope,
  updateFishpedia,
  writeLocalJson,
} from "@/games/starfishing/simulation/starfishingRules";
import { DUPLICATE_POLICIES } from "@/lib/gameRewards";
import { classifyAuthFailure, isAuthUnavailable } from "@/lib/authFailure";
import "@/games/starfishing/ui/starfishing.css";

const DUPLICATE_CHOICES = [
  { key: DUPLICATE_POLICIES.keep, label: "Keep the star", description: "Preserve this catch in your local collection." },
  { key: DUPLICATE_POLICIES.release, label: "Release for Favor", description: "Preview a gentle Favor return." },
  { key: DUPLICATE_POLICIES.convert, label: "Distill to Star Glass", description: "Preview forge material conversion." },
];
const SIGNED_IN_CLAIM_CHOICE = {
  label: "Verify this catch",
  description: "The observatory will determine its size, duplicate status, and rewards.",
};
const PENDING_CLAIM_STORAGE_KEY = "foxfam_starfishing_pending_claim_v1";

const AUTH_MODES = {
  checking: "checking",
  guest: "guest",
  signedIn: "signed-in",
  unavailable: "unavailable",
};

function readPendingClaimStore() {
  try {
    const value = window.sessionStorage.getItem(PENDING_CLAIM_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function readPendingClaimSnapshot(ownerId) {
  return getOwnerPendingClaimEnvelope(readPendingClaimStore(), ownerId);
}

function writePendingClaimSnapshot(snapshot) {
  if (!snapshot) return;
  try {
    const store = upsertOwnerPendingClaimEnvelope(readPendingClaimStore(), snapshot);
    window.sessionStorage.setItem(PENDING_CLAIM_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // The in-memory claim remains available when tab storage is unavailable.
  }
}

function clearPendingClaimSnapshot(ownerId) {
  if (!ownerId) return;
  try {
    const store = removeOwnerPendingClaimEnvelope(readPendingClaimStore(), ownerId);
    if (!store || Object.keys(store.owners || {}).length === 0) {
      window.sessionStorage.removeItem(PENDING_CLAIM_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(PENDING_CLAIM_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // No recovery state exists when tab storage is unavailable.
  }
}

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
  const code = error?.code || "STARFISHING_REQUEST_FAILED";
  if (action === "claim") {
    const definitiveNoCommit = [
      "STARFISHING_AUTH_REQUIRED",
      "STARFISHING_INVALID_INPUT",
      "STARFISHING_REQUEST_REJECTED",
    ].includes(code);
    return {
      code,
      message: definitiveNoCommit
        ? "The portal rejected this claim before recording a reward."
        : "The portal response is uncertain. Retry to reconcile this same catch safely.",
      retryable: !definitiveNoCommit || Boolean(error?.retryable),
      definitiveNoCommit,
    };
  }
  if (code === "STARFISHING_REQUEST_REJECTED") {
    return {
      code,
      message: "Portal catch rewards are not available yet. Your local preview remains untouched.",
      retryable: false,
      definitiveNoCommit: true,
    };
  }
  return {
    code,
    message: error?.message || "Starfishing progress could not be synced.",
    retryable: Boolean(error?.retryable),
    definitiveNoCommit: true,
  };
}

export default function Starfishing() {
  const [state, setState] = useState(() => createInitialStarfishingState());
  const [localFishpedia, setLocalFishpedia] = useState(() => readLocalJson(FISHPEDIA_STORAGE_KEY, {}));
  const [rewardLog, setRewardLog] = useState(() => readLocalJson(REWARD_LOG_STORAGE_KEY, []));
  const [authMode, setAuthMode] = useState(AUTH_MODES.checking);
  const [progression, setProgression] = useState(null);
  const [isProgressionLoading, setIsProgressionLoading] = useState(true);
  const [progressionError, setProgressionError] = useState("");
  const [sessionError, setSessionError] = useState(null);
  const [authRevision, setAuthRevision] = useState(0);
  const stateRef = useRef(state);
  const fishpediaRef = useRef(localFishpedia);
  const mountedRef = useRef(true);
  const sessionEpochRef = useRef(0);
  const sessionOwnerIdRef = useRef("");
  const claimDelayRef = useRef(null);
  const authLoadGenerationRef = useRef(0);

  const cancelClaimDelay = useCallback(() => {
    claimDelayRef.current?.cancel();
    claimDelayRef.current = null;
  }, []);

  const isCurrentClaimContext = useCallback((expectedEpoch) => (
    isClaimContextCurrent({
      isMounted: mountedRef.current,
      expectedEpoch,
      currentEpoch: sessionEpochRef.current,
    })
  ), []);

  const waitForClaimWindow = useCallback((timestamp, expectedEpoch) => (
    new Promise((resolve) => {
      if (!isCurrentClaimContext(expectedEpoch)) {
        resolve(false);
        return;
      }

      const delay = Math.max(0, Date.parse(timestamp || "") - Date.now());
      if (!delay) {
        resolve(true);
        return;
      }

      let settled = false;
      const finish = (isCurrent) => {
        if (settled) return;
        settled = true;
        claimDelayRef.current = null;
        resolve(isCurrent);
      };
      const timeoutId = window.setTimeout(
        () => finish(isCurrentClaimContext(expectedEpoch)),
        delay,
      );
      claimDelayRef.current = {
        cancel() {
          window.clearTimeout(timeoutId);
          finish(false);
        },
      };
    })
  ), [isCurrentClaimContext]);

  const applySessionTransition = useCallback((nextOwnerId, { scheduleReload = false } = {}) => {
    const transition = planStarfishingSessionTransition({
      currentOwnerId: sessionOwnerIdRef.current,
      nextOwnerId,
      currentEpoch: sessionEpochRef.current,
    });
    if (!transition.changed) return transition;

    sessionEpochRef.current = transition.nextEpoch;
    sessionOwnerIdRef.current = nextOwnerId;
    if (transition.shouldCancelPendingWork) cancelClaimDelay();

    if (transition.shouldResetServerState) {
      const initial = createInitialStarfishingState();
      stateRef.current = initial;
      setState(initial);
      setProgression(null);
      setProgressionError("");
      setSessionError(null);
    }

    if (nextOwnerId) {
      setAuthMode(AUTH_MODES.checking);
      setIsProgressionLoading(true);
      if (scheduleReload) setAuthRevision((revision) => revision + 1);
    } else {
      setAuthMode(AUTH_MODES.guest);
      setIsProgressionLoading(false);
    }

    return transition;
  }, [cancelClaimDelay]);

  const applyUnavailableSession = useCallback((authError) => {
    sessionEpochRef.current += 1;
    sessionOwnerIdRef.current = "";
    cancelClaimDelay();
    const initial = createInitialStarfishingState();
    stateRef.current = initial;
    setState(initial);
    setProgression(null);
    setProgressionError("");
    setSessionError(authError);
    setAuthMode(AUTH_MODES.unavailable);
    setIsProgressionLoading(false);
  }, [cancelClaimDelay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionEpochRef.current += 1;
      authLoadGenerationRef.current += 1;
      cancelClaimDelay();
    };
  }, [cancelClaimDelay]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      const nextOwnerId = session?.user?.id || "";
      if (sessionOwnerIdRef.current === nextOwnerId) return;
      authLoadGenerationRef.current += 1;
      applySessionTransition(nextOwnerId, { scheduleReload: Boolean(nextOwnerId) });
    });
    return () => data?.subscription?.unsubscribe();
  }, [applySessionTransition]);
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
    const loadGeneration = authLoadGenerationRef.current + 1;
    authLoadGenerationRef.current = loadGeneration;
    async function loadSessionProgression() {
      let profile;
      try {
        profile = await communityClient.auth.me();
      } catch (error) {
        if (!mountedRef.current || authLoadGenerationRef.current !== loadGeneration) return;
        const authError = classifyAuthFailure(error);
        if (isAuthUnavailable(authError)) {
          applyUnavailableSession(authError);
          return;
        }
        applySessionTransition("", { scheduleReload: false });
        if (!sessionOwnerIdRef.current) {
          setAuthMode(AUTH_MODES.guest);
          setIsProgressionLoading(false);
        }
        return;
      }

      if (!mountedRef.current || authLoadGenerationRef.current !== loadGeneration) return;
      applySessionTransition(profile.id, { scheduleReload: false });
      const sessionEpoch = sessionEpochRef.current;
      if (!isCurrentClaimContext(sessionEpoch)) return;
      setAuthMode(AUTH_MODES.signedIn);
      const initial = stateRef.current;
      const restored = restorePendingClaimSnapshot(
        initial,
        readPendingClaimSnapshot(profile.id),
        profile.id,
      );
      if (restored !== initial) {
        stateRef.current = restored;
        setState(restored);
      }
      try {
        const nextProgression = await loadStarfishingProgression();
        if (
          authLoadGenerationRef.current === loadGeneration
          && isCurrentClaimContext(sessionEpoch)
        ) {
          setProgression(nextProgression);
        }
      } catch (error) {
        if (
          authLoadGenerationRef.current === loadGeneration
          && isCurrentClaimContext(sessionEpoch)
        ) {
          setProgressionError(error?.message || "Your portal Fishpedia could not be loaded.");
        }
      } finally {
        if (
          authLoadGenerationRef.current === loadGeneration
          && isCurrentClaimContext(sessionEpoch)
        ) {
          setIsProgressionLoading(false);
        }
      }
    }
    loadSessionProgression();
  }, [applySessionTransition, applyUnavailableSession, authRevision, isCurrentClaimContext]);

  const retrySessionCheck = useCallback(() => {
    setSessionError(null);
    setAuthMode(AUTH_MODES.checking);
    setIsProgressionLoading(true);
    setAuthRevision((revision) => revision + 1);
  }, []);

  const commitState = useCallback((nextState) => {
    if (!mountedRef.current) return;
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const requestServerCast = useCallback(async () => {
    const sessionEpoch = sessionEpochRef.current;
    const requesting = beginServerCast(stateRef.current);
    if (requesting === stateRef.current) return;
    commitState(requesting);
    try {
      const ticket = await startStarfishingCast();
      if (!isCurrentClaimContext(sessionEpoch)) return;
      commitState(receiveServerTicket(stateRef.current, ticket));
    } catch (error) {
      if (!isCurrentClaimContext(sessionEpoch)) return;
      commitState(failServerCast(
        stateRef.current,
        friendlyProgressionError(error, "cast"),
      ));
    }
  }, [commitState, isCurrentClaimContext]);

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
    if ([AUTH_MODES.checking, AUTH_MODES.unavailable].includes(authMode)) return;
    setState((current) => applyStarfishingAction(current, action, fishpediaRef.current));
  }, [authMode, progression, requestServerCast]);

  useEffect(() => {
    const interval = window.setInterval(() => setState((current) => tickStarfishing(current)), 120);
    return () => window.clearInterval(interval);
  }, []);

  useGameControls({
    enabled: ![AUTH_MODES.checking, AUTH_MODES.unavailable].includes(authMode)
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

  const applyAuthoritativeClaim = useCallback((result, sessionEpoch) => {
    if (!isCurrentClaimContext(sessionEpoch)) return;
    clearPendingClaimSnapshot(sessionOwnerIdRef.current);
    setProgression((current) => mergeClaimProgression(current, result));
    commitState(receiveServerClaim(stateRef.current, result));
  }, [commitState, isCurrentClaimContext]);

  const submitServerClaim = useCallback(async (pendingClaim, sessionEpoch) => {
    if (!isCurrentClaimContext(sessionEpoch)) return;
    const ticketId = stateRef.current.serverTicket?.ticketId;
    if (!ticketId) return;
    try {
      const result = await claimStarfishingCatch({
        ticketId,
        idempotencyKey: pendingClaim.idempotencyKey,
        duplicatePolicy: pendingClaim.duplicatePolicy,
        telemetry: pendingClaim.telemetry,
      });
      if (!isCurrentClaimContext(sessionEpoch)) return;
      applyAuthoritativeClaim(result, sessionEpoch);
    } catch (error) {
      if (!isCurrentClaimContext(sessionEpoch)) return;
      const failed = failServerClaim(
        stateRef.current,
        friendlyProgressionError(error, "claim"),
      );
      writePendingClaimSnapshot(createPendingClaimSnapshot(
        failed,
        sessionOwnerIdRef.current,
      ));
      commitState(failed);
    }
  }, [applyAuthoritativeClaim, commitState, isCurrentClaimContext]);

  const handleCatchChoice = useCallback(async (policy) => {
    const catchRecord = stateRef.current.lastCatch;
    if (!catchRecord || stateRef.current.phase !== STARFISHING_PHASES.caught) return;

    if (authMode === AUTH_MODES.signedIn) {
      const sessionEpoch = sessionEpochRef.current;
      const telemetry = {
        actionCount: stateRef.current.qtePattern.length,
        missCount: 0,
        durationMs: stateRef.current.completionDurationMs,
      };
      const claiming = beginServerClaim(
        stateRef.current,
        window.crypto.randomUUID(),
        stateRef.current.selectedDuplicatePolicy,
        telemetry,
      );
      writePendingClaimSnapshot(createPendingClaimSnapshot(
        claiming,
        sessionOwnerIdRef.current,
      ));
      commitState(claiming);
      const shouldSubmit = await waitForClaimWindow(
        claiming.serverTicket.notBefore,
        sessionEpoch,
      );
      if (!shouldSubmit || !isCurrentClaimContext(sessionEpoch)) return;
      await submitServerClaim(claiming.pendingClaim, sessionEpoch);
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
  }, [
    authMode,
    commitState,
    isCurrentClaimContext,
    submitServerClaim,
    waitForClaimWindow,
  ]);

  const handleRetryClaim = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== STARFISHING_PHASES.claimError || !current.pendingClaim) return;
    const sessionEpoch = sessionEpochRef.current;
    const claiming = beginServerClaim(
      current,
      current.pendingClaim.idempotencyKey,
      current.pendingClaim.duplicatePolicy,
      current.pendingClaim.telemetry,
    );
    writePendingClaimSnapshot(createPendingClaimSnapshot(
      claiming,
      sessionOwnerIdRef.current,
    ));
    commitState(claiming);
    submitServerClaim(claiming.pendingClaim, sessionEpoch);
  }, [commitState, submitServerClaim]);

  const handleReturnWithoutReward = useCallback(() => {
    const abandoned = abandonServerClaim(stateRef.current);
    if (abandoned === stateRef.current) return;
    clearPendingClaimSnapshot(sessionOwnerIdRef.current);
    commitState(abandoned);
  }, [commitState]);

  const handleReset = useCallback(() => {
    if (stateRef.current.phase === STARFISHING_PHASES.claimError) return;
    commitState(createInitialStarfishingState());
  }, [commitState]);

  const latestRewardIntent = rewardLog[0] || null;
  const isCatchReveal = state.phase === STARFISHING_PHASES.caught && state.lastCatch;
  const localChoices = state.lastCatch?.duplicate
    ? DUPLICATE_CHOICES
    : [{ key: DUPLICATE_POLICIES.none, label: "Add to Fishpedia", description: "Record this new local constellation catch." }];

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
            : authMode === AUTH_MODES.unavailable
              ? "Session unavailable"
              : authMode === AUTH_MODES.signedIn ? "Portal rewards" : "Local preview"}
        </span>
      )}
      sidebar={(
        <div className="starfishing-sidebar">
          {isCatchReveal && authMode === AUTH_MODES.signedIn ? (
            <section className="starfishing-preclaim" aria-labelledby="starfishing-preclaim-title">
              <Sparkles aria-hidden="true" />
              <p>Constellation on the line</p>
              <h2 id="starfishing-preclaim-title">{state.lastCatch.label}</h2>
              <span>The line is holding. Size, duplicate status, and rewards remain unverified.</span>
              <button
                type="button"
                onClick={() => handleCatchChoice()}
              >
                <Fish aria-hidden="true" />
                <span>
                  <strong>{SIGNED_IN_CLAIM_CHOICE.label}</strong>
                  <small>{SIGNED_IN_CLAIM_CHOICE.description}</small>
                </span>
              </button>
            </section>
          ) : isCatchReveal ? (
            <GameResultSheet
              title={`${state.lastCatch.label} caught`}
              record={{ label: state.lastCatch.rarity, value: `${state.lastCatch.size}\" starspan` }}
              choices={localChoices}
              onChoose={handleCatchChoice}
            />
          ) : (
            <StarfishingHud
              state={state}
              rewardIntent={latestRewardIntent}
              authMode={authMode}
              authError={sessionError}
              isProgressionLoading={isProgressionLoading}
              isProgressionUnavailable={authMode === AUTH_MODES.signedIn && !isProgressionLoading && !progression}
              progression={progression}
              duplicatePolicy={state.selectedDuplicatePolicy}
              onDuplicatePolicyChange={(policy) => {
                commitState(selectSignedInDuplicatePolicy(stateRef.current, policy));
              }}
              onRetryAuth={retrySessionCheck}
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
        authoritativeRows={authMode === AUTH_MODES.guest ? null : progression?.fishpedia || []}
      />
      <p className="starfishing-safety-note">
        <BookOpen aria-hidden="true" />
        {authMode === AUTH_MODES.unavailable
          ? sessionError?.message
          : authMode === AUTH_MODES.signedIn
            ? progressionError || "Signed-in catches are recorded only after the portal validates them."
            : authMode === AUTH_MODES.checking
              ? "Checking your portal session before enabling catches."
              : "Catch records and reward intents stay on this device in local preview mode."}
      </p>
    </GameShell>
  );
}
