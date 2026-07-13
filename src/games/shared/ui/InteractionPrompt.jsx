export default function InteractionPrompt({ keys = [], label, className = "" }) {
  return (
    <span className={`game-interaction-prompt ${className}`.trim()}>
      <span className="game-interaction-prompt__keys" aria-hidden="true">
        {keys.map((key) => <kbd key={key}>{key}</kbd>)}
      </span>
      <span>{label}</span>
    </span>
  );
}
