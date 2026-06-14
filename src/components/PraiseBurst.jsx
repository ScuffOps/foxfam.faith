import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPraiseBurstOverlayStyle, MAGICAL_PRAISE_TONES } from "@/lib/praiseEffects";

function playPraiseMagicBurst() {
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
      master.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      master.connect(audioContext.destination);

      MAGICAL_PRAISE_TONES.forEach(({ frequency, delay, type }, index) => {
        const tone = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const toneStart = now + delay;
        tone.type = type;
        tone.frequency.setValueAtTime(frequency, toneStart);
        tone.frequency.exponentialRampToValueAtTime(frequency * 1.025, toneStart + 0.22);
        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(index < 2 ? 0.34 : 0.22, toneStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.5);
        tone.connect(gain);
        gain.connect(master);
        tone.start(toneStart);
        tone.stop(toneStart + 0.58);
      });

      const shimmerBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.55, audioContext.sampleRate);
      const channel = shimmerBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        const fade = 1 - index / channel.length;
        channel[index] = (Math.random() * 2 - 1) * fade * 0.22;
      }
      const shimmer = audioContext.createBufferSource();
      const shimmerFilter = audioContext.createBiquadFilter();
      const shimmerGain = audioContext.createGain();
      shimmer.buffer = shimmerBuffer;
      shimmerFilter.type = "bandpass";
      shimmerFilter.frequency.setValueAtTime(2600, now + 0.08);
      shimmerFilter.frequency.exponentialRampToValueAtTime(7200, now + 0.52);
      shimmerFilter.Q.setValueAtTime(9, now);
      shimmerGain.gain.setValueAtTime(0.0001, now + 0.08);
      shimmerGain.gain.exponentialRampToValueAtTime(0.13, now + 0.14);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.74);
      shimmer.connect(shimmerFilter);
      shimmerFilter.connect(shimmerGain);
      shimmerGain.connect(master);
      shimmer.start(now + 0.08);
      shimmer.stop(now + 0.8);

      window.setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 1450);
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
  const anchorRef = useRef(null);
  const [overlayStyle, setOverlayStyle] = useState(null);

  useEffect(() => {
    if (active) playPraiseMagicBurst();
  }, [active]);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      setOverlayStyle(null);
      return;
    }

    const trigger = anchorRef.current?.closest?.(".praise-button") || anchorRef.current;
    const rect = trigger?.getBoundingClientRect();
    setOverlayStyle(getPraiseBurstOverlayStyle(rect, { width: window.innerWidth, height: window.innerHeight }));
  }, [active]);

  const burst = overlayStyle ? (
    <span className="praise-burst" style={overlayStyle} aria-hidden="true">
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
  ) : null;

  return (
    <>
      <span ref={anchorRef} className="praise-burst-anchor" aria-hidden="true" />
      {active && typeof document !== "undefined" && burst ? createPortal(burst, document.body) : null}
    </>
  );
}
