import { Delete, Shuffle } from "lucide-react";

export default function WordFlower({ center, petals, draftWord, disabled, onPetal, onRemove, onShuffle, onSubmit }) {
  return (
    <section className="word-flower" aria-label="Word Garden flower">
      <div className="word-flower__draft" aria-live="polite" aria-label={draftWord ? `Current word: ${draftWord}` : "Current word is empty"}>
        {draftWord || <span>Gather a word</span>}
      </div>

      <div className="word-flower__bed">
        <div className="word-flower__soil" aria-hidden="true"><i /><i /><i /></div>
        <div className="word-flower__stem" aria-hidden="true" />
        <div className="word-flower__leaves" aria-hidden="true"><i /><i /></div>
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
    </section>
  );
}
