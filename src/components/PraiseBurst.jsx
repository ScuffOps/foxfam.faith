export default function PraiseBurst({ active = false }) {
  if (!active) return null;

  return (
    <span className="praise-burst" aria-hidden="true">
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
      <span className="praise-burst__beam" />
    </span>
  );
}
