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

export default function TimeRunnerHud({ state, rewardIntent, onStart, onReset, onAction, onClaimReward }) {
  const progress = Math.min(100, Math.round((state.elapsedMs / 45000) * 100));
  const canClaim = state.score > state.claimedScore || (state.completed && !rewardIntent);

  return (
    <div className="time-runner-hud">
      <div className="time-runner-hud__familiar">
        <FamiliarAvatar size={78} pose={state.phase === TIME_RUNNER_PHASES.running ? "active" : "idle"} />
        <div><small>Clockwork companion</small><strong>Brindle, Hour Scout</strong></div>
      </div>

      <dl className="time-runner-hud__stats">
        <Stat icon={Clock3} label="Route" value={`${progress}%`} />
        <Stat icon={Sparkles} label="Shards" value={state.clockShards} />
        <Stat icon={ShieldCheck} label="Combo" value={state.combo} />
        <Stat icon={Heart} label="Hearts" value={state.health} />
      </dl>

      <div className="time-runner-hud__meter" aria-label={`Clocktower route ${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {state.lastMoment ? <p className="time-runner-hud__moment" aria-live="polite">{state.lastMoment.label}</p> : null}

      {state.phase === TIME_RUNNER_PHASES.ready ? (
        <button className="time-runner-button time-runner-button--primary" type="button" onClick={onStart}>Start the traverse</button>
      ) : null}

      {state.phase === TIME_RUNNER_PHASES.running ? (
        <div className="time-runner-hud__actions" aria-label="Runner actions">
          <Action label="Leap" keys="Space / W" active={state.posture === TIME_RUNNER_POSTURES.jump} onClick={() => onAction("primary")} />
          <Action label="Duck" keys="S / Down" active={state.posture === TIME_RUNNER_POSTURES.duck} onClick={() => onAction("qte-down")} />
          <Action label="Tempo skip" keys="D / Right" active={state.posture === TIME_RUNNER_POSTURES.focus} disabled={state.focus < 30} onClick={() => onAction("qte-right")} />
        </div>
      ) : null}

      <div className="time-runner-hud__controls">
        <InteractionPrompt keys={["Space", "WASD"]} label="Leap, duck, and skip" />
        <span><MousePointer2 aria-hidden="true" /> Click a glowing landing seal</span>
      </div>

      {state.phase === TIME_RUNNER_PHASES.finished ? (
        <div className="time-runner-hud__finished">
          <p>{FINISH_COPY[state.finishReason]}</p>
          <button className="time-runner-button time-runner-button--primary" type="button" disabled={!canClaim} onClick={onClaimReward}>Preview Clock Brass reward</button>
          <button className="time-runner-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" /> Restart route</button>
        </div>
      ) : null}

      {rewardIntent ? (
        <GameResultSheet
          intent={rewardIntent}
          title="Clock Brass gathered"
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
