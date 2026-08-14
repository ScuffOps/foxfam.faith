import { Clock3, Heart, MousePointer2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import {
  getApprovedTimeRunnerProductionArt,
  getTimeRunnerActionAtlasTransform,
  getTimeRunnerShardAtlasTransform,
} from "@/games/timeRunner/art/timeRunnerProductionArt";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";
import "./time-runner.css";

const FINISH_COPY = {
  "clock-fractured": "The loop fractured, but every gathered shard remains in this local preview.",
  "tower-cleared": "The clocktower chimes. You crossed the whole hour without falling.",
};
const TIME_RUNNER_PRODUCTION_ART = getApprovedTimeRunnerProductionArt();

export default function TimeRunnerHud({
  familiar,
  state,
  mode = "practice",
  isBusy = false,
  rewardIntent,
  rewardReceipt,
  onStart,
  onReset,
  onAction,
  onClaimReward,
  compactControls = false,
  runStatus = false,
}) {
  const progress = Math.min(100, Math.round((state.elapsedMs / 45000) * 100));
  const canClaim = mode === "rewarded"
    ? state.completed && !rewardReceipt && !isBusy
    : state.score > state.claimedScore || (state.completed && !rewardIntent);

  if (compactControls) {
    if (state.phase === TIME_RUNNER_PHASES.ready) {
      return (
        <div className="time-runner-mobile-dock time-runner-mobile-dock--ready">
          <button className="time-runner-button time-runner-button--primary" type="button" disabled={isBusy} onClick={onStart}>
            Start traverse
          </button>
        </div>
      );
    }

    if (state.phase === TIME_RUNNER_PHASES.paused) {
      return (
        <div className="time-runner-mobile-dock time-runner-mobile-dock--ready">
          <button className="time-runner-button time-runner-button--primary" type="button" disabled={isBusy} onClick={onStart}>
            Resume traverse
          </button>
        </div>
      );
    }

    if (state.phase !== TIME_RUNNER_PHASES.running) return null;

    return (
      <div className="time-runner-control-dock">
        <LandingChoices disabled={isBusy} landings={state.availableLandings} onAction={onAction} art={TIME_RUNNER_PRODUCTION_ART?.actions} />
        <div className="time-runner-mobile-dock" role="group" aria-label="Clocktower runner actions" data-art-family={TIME_RUNNER_PRODUCTION_ART ? "authored" : "fallback"}>
          <Action art={TIME_RUNNER_PRODUCTION_ART?.actions} artKey="jump" label="Leap" keys="W / Up" active={state.posture === TIME_RUNNER_POSTURES.jump} disabled={isBusy} onClick={() => onAction("qte-up")} />
          <Action art={TIME_RUNNER_PRODUCTION_ART?.actions} artKey="duck" label="Duck" keys="S / Down" active={state.posture === TIME_RUNNER_POSTURES.duck} disabled={isBusy} onClick={() => onAction("qte-down")} />
          <Action art={TIME_RUNNER_PRODUCTION_ART?.actions} artKey="focus" label="Tempo skip" keys={`D / Right · ${Math.floor(state.focus)}`} active={state.posture === TIME_RUNNER_POSTURES.focus} disabled={isBusy || state.focus < 30} onClick={() => onAction("qte-right")} />
        </div>
      </div>
    );
  }

  if (runStatus) {
    return (
      <div className="time-runner-live-hud" aria-label="Current run state">
        <dl className="time-runner-hud__stats">
          <Stat icon={Clock3} label="Route" value={`${progress}%`} />
          <Stat
            icon={Sparkles}
            artwork={TIME_RUNNER_PRODUCTION_ART ? <ShardArt src={TIME_RUNNER_PRODUCTION_ART.shards} kind="clockBrass" /> : null}
            label="Brass"
            value={state.clockShards}
          />
          <Stat icon={ShieldCheck} label="Combo" value={state.combo} />
          <Stat icon={Heart} label="Hearts" value={state.health} />
        </dl>
        <div
          className="time-runner-hud__meter"
          role="progressbar"
          aria-label="Clocktower route"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="time-runner-live-hud__moment" aria-live="polite">
          {state.lastMoment?.label || getRunPrompt(state.phase)}
        </p>
      </div>
    );
  }

  return (
    <div className="time-runner-hud">
      <div className="time-runner-hud__familiar">
        <FamiliarAvatar familiar={familiar} size={78} pose={state.phase === TIME_RUNNER_PHASES.running ? "active" : "idle"} />
        <div><small>Your companion</small><strong>Clocktower Scout</strong></div>
      </div>

      <div className="time-runner-hud__controls">
        <InteractionPrompt keys={["W", "S", "D"]} label="Leap, duck, and skip" />
        <span><MousePointer2 aria-hidden="true" /> Choose a landing with 1 / 2 or click its seal</span>
      </div>

      {state.phase === TIME_RUNNER_PHASES.finished ? (
        <div className="time-runner-hud__finished">
          <p>{FINISH_COPY[state.finishReason]}</p>
          {!rewardIntent ? (
            <button className="time-runner-button time-runner-button--primary" type="button" disabled={!canClaim} onClick={onClaimReward}>
              {mode === "rewarded" ? "Claim portal rewards" : "Preview Clock Brass reward"}
            </button>
          ) : null}
          {mode === "practice" ? <button className="time-runner-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" /> Restart route</button> : null}
        </div>
      ) : null}

      {rewardIntent ? (
        <GameResultSheet
          intent={rewardIntent}
          rewardLabel={mode === "rewarded" ? "Portal rewards" : "Practice reward preview"}
          finalReward={mode === "rewarded"}
          title={mode === "rewarded" ? "Traverse rewards claimed" : "Clock Brass gathered"}
          record={{ label: "Best chain", value: `${state.bestCombo} landings` }}
        />
      ) : null}
    </div>
  );
}

function LandingChoices({ disabled = false, landings = [], onAction, art = null }) {
  return (
    <div className="time-runner-landing-choices" role="group" aria-label="Choose the next clock landing">
      {landings.slice(0, 2).map((landing, index) => (
        <button key={landing.id} type="button" disabled={disabled} onClick={() => onAction(index === 0 ? "choice-one" : "choice-two")}>
          {art ? <ActionArt src={art} action="landing" /> : null}
          <kbd>{index + 1}</kbd><span>{landing.label}</span>
        </button>
      ))}
    </div>
  );
}

function getRunPrompt(phase) {
  if (phase === TIME_RUNNER_PHASES.ready) return "Start when you are ready. Leap and duck through the clockwork route.";
  if (phase === TIME_RUNNER_PHASES.paused) return "Traverse paused.";
  if (phase === TIME_RUNNER_PHASES.finished) return "The current traverse is complete.";
  return "Watch the route and answer each clockwork hazard.";
}

function Stat({ artwork = null, icon: Icon, label, value }) {
  return <div><dt>{artwork || <Icon aria-hidden="true" />}{label}</dt><dd>{value}</dd></div>;
}

function Action({ art = null, artKey, label, keys, active, disabled, onClick }) {
  return (
    <button type="button" className={active ? "is-active" : ""} disabled={disabled} onClick={onClick}>
      {art ? <ActionArt src={art} action={artKey} /> : null}
      <strong>{label}</strong><small>{keys}</small>
    </button>
  );
}

function ActionArt({ src, action }) {
  return (
    <span className="time-runner-action-art" aria-hidden="true">
      <img src={src} alt="" draggable="false" style={{ transform: getTimeRunnerActionAtlasTransform(action) }} />
    </span>
  );
}

function ShardArt({ src, kind }) {
  return (
    <span className="time-runner-shard-art" aria-hidden="true">
      <img src={src} alt="" draggable="false" style={{ transform: getTimeRunnerShardAtlasTransform(kind) }} />
    </span>
  );
}
