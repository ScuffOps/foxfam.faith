import { Flower2, Sprout } from "lucide-react";
import { calculateWordGardenScore } from "../simulation/wordGardenRules.js";

export default function WordGardenHud({ state, mode = "practice", onComplete }) {
  const score = calculateWordGardenScore(state);
  const fullBlooms = state.foundWords.filter((word) => word.isFullBloom).length;

  return (
    <div className="word-garden-hud">
      <section className="word-garden-hud__meter" aria-labelledby="personal-bloom-title">
        <div className="word-garden-hud__title">
          <Sprout aria-hidden="true" />
          <div><p>Personal bloom</p><h2 id="personal-bloom-title">{score} dewlight</h2></div>
        </div>
        <div className="word-garden-hud__stats">
          <span><strong>{state.foundWords.length}</strong> words</span>
          <span><strong>{fullBlooms}</strong> Full Bloom</span>
        </div>
      </section>

      <section className="word-garden-hud__found" aria-labelledby="found-words-title">
        <div className="word-garden-hud__title">
          <Flower2 aria-hidden="true" />
          <div><p>Pressed flowers</p><h2 id="found-words-title">Found words</h2></div>
        </div>
        {state.foundWords.length ? (
          <ol>
            {[...state.foundWords].reverse().map((foundWord) => (
              <li key={foundWord.word}>
                <span>{foundWord.word}{foundWord.isFullBloom ? <small>Full Bloom</small> : null}</span>
                <strong>+{foundWord.score}</strong>
              </li>
            ))}
          </ol>
        ) : <p className="word-garden-hud__empty">Your first discovered word will be pressed here.</p>}
      </section>

      <section className="word-garden-hud__community" aria-label="Community greenhouse status">
        <p>Community greenhouse</p>
        <strong>Quietly tending today's bloom</strong>
        <span aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </section>

      <button className="word-garden-hud__rest" type="button" onClick={onComplete} disabled={!state.foundWords.length}>
        Rest the garden
      </button>
      <p className="word-garden-hud__safety">
        {mode === "rewarded" ? "Accepted blooms and rewards are validated by the portal." : "Practice stays on this device and does not change portal balances."}
      </p>
    </div>
  );
}
