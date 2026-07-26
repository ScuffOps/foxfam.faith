import { Clock3, Heart, MousePointer2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import FamiliarAvatar from "@/games/shared/familiar/FamiliarAvatar";
import GameResultSheet from "@/games/shared/ui/GameResultSheet";
import InteractionPrompt from "@/games/shared/ui/InteractionPrompt";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";
import "./time-runner.css";

const FINISH_COPY = {
  "clock-fractured": "The loop fractured, but every gathered shard remains in this local preview.",
  "tower-cleared": "The clocktower chimes. You crossed the whole hour without falling.",
};

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
}) {
  const progress = Math.min(100, Math.round((state.elapsedMs / 45000) * 100));
  const canClaim = mode === "rewarded"
    ? state.completed && !rewardReceipt && !isBusy
    : state.score > state.claimedScore || (state.completed && !rewardIntent);

  if (compactControls) {
    if (state.phase === TIME_RUNNER_PHASES.ready) {
      return (
        <div className="time-runner-mobile-dock time-runner-mobile-dock--ready">
          <button className="time-runner-button time-runner-button--primary" type="button" onClick={onStart}>
            Start traverse
          </button>
        </div>
      );
    }

    if (state.phase !== TIME_RUNNER_PHASES.running) return null;

    return (
      <div className="time-runner-mobile-dock" role="group" aria-label="Clocktower runner actions">
        <Action label="Leap" keys="Tap" active={state.posture === TIME_RUNNER_POSTURES.jump} onClick={() => onAction("qte-up")} />
        <Action label="Duck" keys="Hold low" active={state.posture === TIME_RUNNER_POSTURES.duck} onClick={() => onAction("qte-down")} />
        <Action label="Skip" keys={`${Math.floor(state.focus)} focus`} active={state.posture === TIME_RUNNER_POSTURES.focus} disabled={state.focus < 30} onClick={() => onAction("qte-right")} />
      </div>
    );
  }

  return (
    <div className="time-runner-hud">
      <div className="time-runner-hud__familiar">
        <FamiliarAvatar familiar={familiar} size={78} pose={state.phase === TIME_RUNNER_PHASES.running ? "active" : "idle"} />
        <div><small>Your companion</small><strong>Clocktower Scout</strong></div>
      </div>

      <dl className="time-runner-hud__stats">
        <Stat icon={Clock3} label="Route" value={`${progress}%`} />
        <Stat icon={Sparkles} label="Shards" value={state.clockShards} />
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

      {state.lastMoment ? <p className="time-runner-hud__moment" aria-live="polite">{state.lastMoment.label}</p> : null}

      {state.phase === TIME_RUNNER_PHASES.ready ? (
        <button className="time-runner-button time-runner-button--primary" type="button" onClick={onStart}>Start the traverse</button>
      ) : null}

      {state.phase === TIME_RUNNER_PHASES.running ? (
        <div className="time-runner-hud__actions time-runner-hud__actions--sidebar" role="group" aria-label="Runner actions">
          <Action label="Leap" keys="W / Up" active={state.posture === TIME_RUNNER_POSTURES.jump} onClick={() => onAction("qte-up")} />
          <Action label="Duck" keys="S / Down" active={state.posture === TIME_RUNNER_POSTURES.duck} onClick={() => onAction("qte-down")} />
          <Action label="Tempo skip" keys="D / Right" active={state.posture === TIME_RUNNER_POSTURES.focus} disabled={state.focus < 30} onClick={() => onAction("qte-right")} />
        </div>
      ) : null}

      <div className="time-runner-hud__controls">
        <InteractionPrompt keys={["W", "S", "D"]} label="Leap, duck, and skip" />
        <span><MousePointer2 aria-hidden="true" /> Click a glowing landing seal</span>
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

function Stat({ icon: Icon, label, value }) {
  return <div><dt><Icon aria-hidden="true" />{label}</dt><dd>{value}</dd></div>;
}

function Action({ label, keys, active, disabled, onClick }) {
  return (
    <button type="button" className={active ? "is-active" : ""} disabled={disabled} onClick={onClick}>
      <strong>{label}</strong><small>{keys}</small>
    </button>
  );
}
