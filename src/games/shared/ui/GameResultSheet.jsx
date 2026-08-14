import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, Sparkles, Trophy } from "lucide-react";

export default function GameResultSheet({
  intent,
  record,
  choices = [],
  onChoose,
  onReturn,
  title = "Session complete",
  rewardLabel = "Reward preview",
  finalReward = false,
}) {
  const [pendingChoice, setPendingChoice] = useState("");
  const resultRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    resultRef.current?.focus({ preventScroll: true });
  }, []);

  const handleChoice = async (choice) => {
    if (pendingChoice || typeof onChoose !== "function") return;
    setPendingChoice(choice.key);
    try {
      await onChoose(choice.key);
    } finally {
      setPendingChoice("");
    }
  };

  return (
    <section
      ref={resultRef}
      className="game-result-sheet"
      role="status"
      aria-live="polite"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="game-result-sheet__heading">
        <span className="game-result-sheet__seal" aria-hidden="true"><Sparkles /></span>
        <div>
          <p>{rewardLabel}</p>
          <h2 id={titleId}>{title}</h2>
        </div>
      </div>

      {record ? (
        <dl className="game-result-sheet__record">
          {record.label ? <><dt>Record</dt><dd>{record.label}</dd></> : null}
          {record.value ? <><dt>Result</dt><dd>{record.value}</dd></> : null}
        </dl>
      ) : null}

      {intent ? (
        <div className="game-result-sheet__rewards">
          <strong>+{intent.favorPreview || 0} Favor{finalReward ? "" : " preview"}</strong>
          {(intent.items || []).map((item) => (
            <span key={`${item.key}-${item.quantity}`}>+{item.quantity} {item.label}</span>
          ))}
          {(intent.achievements || []).map((achievement) => (
            <span key={achievement.key}>
              <Trophy aria-hidden="true" /> {achievement.title} · Achievement unlocked
              {achievement.collectible?.label ? ` · ${achievement.collectible.label} charm` : ""}
              {achievement.collectible?.trophyKey ? " · Trophy added" : ""}
            </span>
          ))}
        </div>
      ) : null}

      {choices.length ? (
        <div className="game-result-sheet__choices" aria-label="Reward choices">
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              disabled={Boolean(pendingChoice)}
              onClick={() => handleChoice(choice)}
            >
              <Check aria-hidden="true" />
              <span><strong>{choice.label}</strong>{choice.description ? <small>{choice.description}</small> : null}</span>
            </button>
          ))}
        </div>
      ) : null}

      {onReturn ? (
        <button className="game-result-sheet__return" type="button" onClick={onReturn}>
          <ArrowLeft aria-hidden="true" /> Return to Quarters
        </button>
      ) : null}
    </section>
  );
}
