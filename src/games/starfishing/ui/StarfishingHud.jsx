import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { STARFISHING_PHASES } from "@/games/starfishing/simulation/starfishingRules";

const ACTION_META = {
  "qte-left": { label: "Left", icon: ArrowLeft, action: GAME_ACTIONS.moveLeft, key: "A / Left" },
  "qte-up": { label: "Up", icon: ArrowUp, action: GAME_ACTIONS.moveUp, key: "W / Up" },
  "qte-right": { label: "Right", icon: ArrowRight, action: GAME_ACTIONS.moveRight, key: "D / Right" },
  "qte-down": { label: "Down", icon: ArrowDown, action: GAME_ACTIONS.moveDown, key: "S / Down" },
};

const PHASE_COPY = {
  idle: ["The pond is listening", "Click the pond or press Space to cast."],
  waiting: ["A star is circling", "Watch the bobber and wait for the bite."],
  qte: ["Constellation on the line", "Match each direction before the glow closes."],
  "requesting-cast": ["Asking the observatory", "Finding a constellation for your line."],
  claiming: ["Inscribing your catch", "The observatory is safely recording your reward."],
  "claim-error": ["Your catch is still here", "Nothing was granted. Retry safely or return without a reward."],
  escaped: ["A soft escape", "Cast again when you are ready."],
};

export default function StarfishingHud({
  state,
  rewardIntent,
  authMode = "guest",
  isProgressionLoading = false,
  isProgressionUnavailable = false,
  progression = null,
  onCast,
  onQteAction,
  onReset,
  onRetryClaim,
  onReturnWithoutReward,
}) {
  const prompt = ACTION_META[state.qtePattern[state.qteIndex]];
  const [title, detail] = PHASE_COPY[state.phase] || PHASE_COPY.idle;
  const isPending = [
    STARFISHING_PHASES.requestingCast,
    STARFISHING_PHASES.claiming,
  ].includes(state.phase);
  const isSignedIn = authMode === "signed-in";
  const claim = state.lastClaim;
  const displayError = state.claimError || state.serverError;

  return (
    <div className="reel-panel" aria-live="polite">
      <div className="reel-panel__heading">
        <span aria-hidden="true"><CircleDot /></span>
        <div><p>Celestial reel</p><h2>{title}</h2></div>
      </div>
      <p className="reel-panel__detail">
        {displayError?.message || state.escapedReason || detail}
      </p>

      {state.phase === STARFISHING_PHASES.qte && prompt ? (
        <div className="reel-qte">
          <p>Next pull <kbd>{prompt.key}</kbd></p>
          <div className="reel-qte__progress" aria-label={`Reel step ${state.qteIndex + 1} of ${state.qtePattern.length}`}>
            {state.qtePattern.map((action, index) => <span key={`${action}-${index}`} data-complete={index < state.qteIndex} data-active={index === state.qteIndex} />)}
          </div>
          <div className="reel-qte__buttons" aria-label="Reel directions">
            {Object.entries(ACTION_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button key={key} type="button" data-active={key === state.qtePattern[state.qteIndex]} onClick={() => onQteAction(meta.action)} aria-label={`Reel ${meta.label}`}>
                  <Icon aria-hidden="true" /><span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : state.phase === STARFISHING_PHASES.claimError ? (
        <div className="reel-panel__recovery">
          {state.claimError?.retryable ? (
            <button type="button" onClick={onRetryClaim}>
              <Sparkles aria-hidden="true" /> Retry claim
            </button>
          ) : null}
          <button type="button" onClick={onReturnWithoutReward}>
            <ArrowLeft aria-hidden="true" /> Return without reward
          </button>
        </div>
      ) : (
        <button
          className="reel-panel__cast"
          type="button"
          onClick={onCast}
          disabled={state.phase === STARFISHING_PHASES.waiting || isPending || isProgressionLoading || isProgressionUnavailable}
        >
          {isProgressionUnavailable
            ? <><CircleDot aria-hidden="true" /> Portal sync unavailable</>
            : isPending || isProgressionLoading
            ? <><LoaderCircle className="reel-panel__spinner" aria-hidden="true" /> {state.phase === STARFISHING_PHASES.claiming ? "Recording catch" : "Preparing pond"}</>
            : <><CircleDot aria-hidden="true" /> Cast line <kbd>Space</kbd></>}
        </button>
      )}

      {isPending ? (
        <p className="reel-panel__announcement" role="status">
          {state.phase === STARFISHING_PHASES.claiming
            ? "Catch claim pending. Your catch is preserved until this finishes."
            : "Requesting a secure cast."}
        </p>
      ) : null}

      {state.serverTicket?.appliedEffects?.length ? (
        <div className="reel-effects" aria-label="Active fishing charm effects">
          {state.serverTicket.appliedEffects.map((effect) => (
            <span key={effect.key}><Sparkles aria-hidden="true" /> {effect.label}</span>
          ))}
        </div>
      ) : null}

      <div className="reel-panel__footer">
        <span><strong>{state.catchCount}</strong> caught this visit</span>
        <button type="button" onClick={onReset} disabled={isPending} aria-label="Reset fishing session" title="Reset fishing session"><RotateCcw aria-hidden="true" /></button>
      </div>

      {isSignedIn && progression ? (
        <div className="reel-balance">
          <span><strong>{progression.favorBalance}</strong><small>Favor</small></span>
          {(progression.materials || []).map((material) => (
            <span key={material.materialKey}>
              <strong>{material.balance}</strong><small>{material.materialKey.replaceAll("-", " ")}</small>
            </span>
          ))}
        </div>
      ) : null}

      {claim ? (
        <div className="reel-reward reel-reward--authoritative" role="status">
          <Sparkles aria-hidden="true" />
          <span>
            <strong>Catch recorded · +{claim.favor.delta} Favor</strong>
            <small>Portal balance: {claim.favor.balance}</small>
            {claim.materials.map((material) => (
              <small key={material.key}>+{material.delta} {material.label} · {material.balance} total</small>
            ))}
            {claim.appliedEffects.map((effect) => (
              <small key={effect.key}>{effect.label} applied</small>
            ))}
            {claim.charms.map((charm) => (
              <small key={charm.id}>Charm unlocked: {charm.label}</small>
            ))}
          </span>
        </div>
      ) : rewardIntent ? (
        <div className="reel-reward">
          <Sparkles aria-hidden="true" />
          <span><strong>Last preview: +{rewardIntent.favorPreview} Favor</strong><small>Not yet granted to the portal</small></span>
        </div>
      ) : null}
    </div>
  );
}
