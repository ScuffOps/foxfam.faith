import { useEffect } from "react";

function playPraiseChime() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const start = () => {
      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      master.connect(audioContext.destination);

      [1046.5, 1568, 2093].forEach((frequency, index) => {
        const tone = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const toneStart = now + index * 0.045;
        tone.type = index === 1 ? "triangle" : "sine";
        tone.frequency.setValueAtTime(frequency, toneStart);
        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(0.42, toneStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.34);
        tone.connect(gain);
        gain.connect(master);
        tone.start(toneStart);
        tone.stop(toneStart + 0.38);
      });

      window.setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 900);
    };

    const resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    resume.then(start).catch(() => {
      audioContext.close().catch(() => {});
    });
  } catch {
    // Browsers may block audio without a trusted user gesture; praise still works.
  }
}

export default function PraiseBurst({ active = false }) {
  useEffect(() => {
    if (active) playPraiseChime();
  }, [active]);

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
            "--distance": `${44 + (index % 3) * 16}px`,
            "--delay": `${index * 18}ms`,
          }}
        />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={`float-${index}`}
          className="praise-burst__float"
          style={{
            "--float-x": `${(index % 2 === 0 ? -1 : 1) * (20 + (index % 4) * 14)}px`,
            "--float-y": `${-44 - (index % 5) * 22}px`,
            "--float-delay": `${90 + index * 48}ms`,
            "--float-scale": `${0.72 + (index % 3) * 0.18}`,
          }}
        />
      ))}
    </span>
  );
}
