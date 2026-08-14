import { Delete, Shuffle } from "lucide-react";

export default function WordFlower({ artFamily = null, center, petals, draftWord, theme, themePrompt, disabled, onPetal, onRemove, onShuffle, onSubmit }) {
  const draftLength = draftWord.length;
  const hasCenter = draftWord.includes(center);

  return (
    <section className="word-flower" aria-labelledby="word-flower-task-title">
      <header className="word-flower__task">
        <p>Today&apos;s theme · {theme}</p>
        <h2 id="word-flower-task-title">{themePrompt}</h2>
        <div className="word-flower__rules" aria-label="Word rules">
          <span>Build a word around <strong>{center}</strong></span>
          <span data-ready={draftLength >= 4}>4+ letters</span>
          <span data-ready={hasCenter}>Include heart letter {center}</span>
        </div>
      </header>

      <div className="word-flower__draft-wrap">
        <p>Current bloom</p>
        <div
          className="word-flower__draft"
          aria-live="polite"
          aria-atomic="true"
          aria-label={draftWord ? `Current word: ${draftWord}` : "Current word is empty"}
        >
          {draftWord || <span>Choose a petal</span>}
        </div>
      </div>

      <div className="word-flower__bed" data-art-family={artFamily ? "authored" : "fallback"}>
        {artFamily ? (
          <img
            className="word-flower__authored-art"
            src={artFamily.flower}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        ) : (
          <div className="word-flower__fallback-art" aria-hidden="true">
            <div className="word-flower__soil"><i /><i /><i /></div>
            <div className="word-flower__stem" />
            <div className="word-flower__leaves"><i /><i /></div>
          </div>
        )}
        <div className="word-flower__petals">
          {petals.map((letter, index) => (
            <button
              className="word-flower__petal"
              data-position={index}
              key={`${letter}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onPetal(letter)}
              aria-label={`Add ${letter}`}
            >
              <span>{letter}</span>
            </button>
          ))}
          <button
            className="word-flower__center"
            type="button"
            disabled={disabled}
            onClick={() => onPetal(center)}
            aria-label={`Add required center letter ${center}`}
          >
            <span>{center}</span>
          </button>
        </div>
      </div>

      <div className="word-flower__tools">
        <button type="button" disabled={disabled} onClick={onShuffle} aria-label="Shuffle outer petals" title="Shuffle outer petals">
          <Shuffle aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled || !draftWord} onClick={onRemove} aria-label="Remove last letter" title="Remove last letter">
          <Delete aria-hidden="true" />
        </button>
        <button className="word-flower__submit" type="button" disabled={disabled || !draftWord} onClick={onSubmit}>
          Bloom word
        </button>
      </div>

      <p className="word-flower__key-hint">
        <span><kbd>Enter</kbd> bloom</span>
        <span><kbd>Backspace</kbd> prune</span>
        <span><kbd>Space</kbd> shuffle</span>
      </p>
    </section>
  );
}
