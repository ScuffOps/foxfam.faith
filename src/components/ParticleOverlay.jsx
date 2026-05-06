import { useEffect, useRef } from "react";

export default function ParticleOverlay({ className = "", style }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.85;
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`}
      style={{
        opacity: 0.65,
        mixBlendMode: "screen",
        filter: "brightness(1.18) saturate(1.15) drop-shadow(0 0 18px rgba(90, 190, 255, 0.45))",
        ...style,
      }}
    >
      <source src="/assets/particles.webm" type="video/webm" />
    </video>
  );
}
