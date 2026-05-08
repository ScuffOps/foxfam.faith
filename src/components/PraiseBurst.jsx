export default function PraiseBurst({ active = false }) {
  if (!active) return null;

  return (
    <span className="praise-burst" aria-hidden="true">
      <span className="praise-burst__beam" />
      {Array.from({ length: 8 }, (_, index) => (
        <span
          key={index}
          className="praise-burst__spark"
          style={{
            "--angle": `${index * 45 - 90}deg`,
            "--distance": `${22 + (index % 3) * 8}px`,
            "--delay": `${index * 18}ms`,
          }}
        />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={`float-${index}`}
          className="praise-burst__float"
          style={{
            "--float-x": `${(index % 2 === 0 ? -1 : 1) * (10 + (index % 4) * 7)}px`,
            "--float-y": `${-22 - (index % 5) * 11}px`,
            "--float-delay": `${90 + index * 48}ms`,
            "--float-scale": `${0.72 + (index % 3) * 0.18}`,
          }}
        />
      ))}
    </span>
  );
}
