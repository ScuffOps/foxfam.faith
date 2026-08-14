import { Flower2, Lightbulb, Sprout } from "lucide-react";
import { calculateWordGardenScore, getWordGardenJournal } from "../simulation/wordGardenRules.js";
import { resolveWordGardenBloomStage } from "./wordGardenBloomStage.js";

export default function WordGardenHud({ artFamily = null, state, mode = "practice", onComplete, onRevealHint }) {
  const score = calculateWordGardenScore(state);
  const fullBlooms = state.foundWords.filter((word) => word.isFullBloom).length;
  const latestBloom = state.foundWords.at(-1);
  const journal = getWordGardenJournal(state);
  const bloomStage = resolveWordGardenBloomStage(state);

  return (
    <div className="word-garden-hud">
      <section className="word-garden-hud__meter" aria-labelledby="personal-bloom-title">
        <div className="word-garden-hud__title">
          {artFamily ? <BloomFamilyArt src={artFamily.bloomFamily} stage={bloomStage} /> : <Sprout aria-hidden="true" />}
          <div><p>Personal bloom</p><h2 id="personal-bloom-title">{score} dewlight</h2></div>
        </div>
        <div className="word-garden-hud__stats">
          <span><strong>{state.foundWords.length}</strong> words</span>
          <span><strong>{fullBlooms}</strong> Full Bloom</span>
        </div>
      </section>

      <section className="word-garden-hud__journal" aria-labelledby="featured-bloom-title">
        <div className="word-garden-hud__title">
          {artFamily ? <BloomFamilyArt src={artFamily.bloomFamily} stage={bloomStage} /> : <Flower2 aria-hidden="true" />}
          <div><p>{journal.foundCount} of {journal.entries.length} found</p><h2 id="featured-bloom-title">Featured bloom journal</h2></div>
        </div>
        <ol className="word-garden-hud__journal-grid" aria-label="Featured words for today">
          {journal.entries.map((entry) => (
            <li key={entry.word} data-found={entry.isFound} data-hinted={entry.isHinted} aria-label={entry.isFound ? `${entry.word}, found` : `${entry.word.length} letter word, not found`}>
              <span aria-hidden="true">{entry.display}</span>
              <small>{entry.word.length}</small>
            </li>
          ))}
        </ol>
        <div className="word-garden-hud__hint-row">
          <p>{latestBloom ? <>Latest bloom: <strong>{latestBloom.word}</strong></> : "Other valid words still count as bonus blooms."}</p>
          <button type="button" onClick={onRevealHint} disabled={!journal.canRevealHint}>
            <Lightbulb aria-hidden="true" /> Reveal a letter
          </button>
        </div>
        {latestBloom ? <p className="word-garden-hud__bonus">Other valid words still count as bonus blooms.</p> : null}
      </section>

      <details className="word-garden-hud__archive">
        <summary>
          <span>Pressed flower archive</span>
          <strong>{state.foundWords.length}</strong>
        </summary>
        {state.foundWords.length ? (
          <ol aria-label="All found words">
            {[...state.foundWords].reverse().map((foundWord) => <BloomRow key={foundWord.word} foundWord={foundWord} />)}
          </ol>
        ) : <p className="word-garden-hud__empty">Bloom a word to begin today's archive.</p>}
      </details>

      <details className="word-garden-hud__community">
        <summary>Community greenhouse</summary>
        <strong>Quietly tending today's bloom</strong>
        <span aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </details>

      <button className="word-garden-hud__rest" type="button" onClick={onComplete} disabled={!state.foundWords.length}>
        Rest the garden
      </button>
      <p className="word-garden-hud__safety">
        {mode === "rewarded" ? "Accepted blooms and rewards are validated by the portal." : "Practice stays on this device and does not change portal balances."}
      </p>
    </div>
  );
}

function BloomFamilyArt({ src, stage }) {
  return (
    <span className="word-garden-hud__bloom-art" data-bloom-stage={stage} aria-hidden="true">
      <img src={src} alt="" draggable="false" />
    </span>
  );
}

function BloomRow({ foundWord }) {
  return (
    <li>
      <span>{foundWord.word}{foundWord.isFullBloom ? <small>Full Bloom</small> : null}</span>
      <strong>+{foundWord.score}</strong>
    </li>
  );
}
