import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleDot, RotateCcw, Sparkles } from "lucide-react";
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
  escaped: ["A soft escape", "Cast again when you are ready."],
};

export default function StarfishingHud({ state, rewardIntent, onCast, onQteAction, onReset }) {
  const prompt = ACTION_META[state.qtePattern[state.qteIndex]];
  const [title, detail] = PHASE_COPY[state.phase] || PHASE_COPY.idle;

  return (
    <div className="reel-panel" aria-live="polite">
      <div className="reel-panel__heading">
        <span aria-hidden="true"><CircleDot /></span>
        <div><p>Celestial reel</p><h2>{title}</h2></div>
      </div>
      <p className="reel-panel__detail">{state.escapedReason || detail}</p>

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
      ) : (
        <button className="reel-panel__cast" type="button" onClick={onCast} disabled={state.phase === STARFISHING_PHASES.waiting}>
          <CircleDot aria-hidden="true" /> Cast line <kbd>Space</kbd>
        </button>
      )}

      <div className="reel-panel__footer">
        <span><strong>{state.catchCount}</strong> caught this visit</span>
        <button type="button" onClick={onReset} aria-label="Reset fishing session" title="Reset fishing session"><RotateCcw aria-hidden="true" /></button>
      </div>

      {rewardIntent ? (
        <div className="reel-reward">
          <Sparkles aria-hidden="true" />
          <span><strong>Last preview: +{rewardIntent.favorPreview} Favor</strong><small>Not yet granted to the portal</small></span>
        </div>
      ) : null}
    </div>
  );
}
