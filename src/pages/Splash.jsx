import { useState, useEffect, useRef } from "react";

const LAYERS = [
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/6066c0983_scenelayer-grass.png", depth: 0.008, style: { bottom: 0, left: 0, width: "100%", opacity: 0.9 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e4422d62f_scenelayer-wall.png", depth: 0.015, style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/983cbe8b6_scenelayer-shadow.png", depth: 0.012, style: { bottom: 0, left: 0, width: "100%", opacity: 0.55, mixBlendMode: "multiply" } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/809268ef7_scenelayer-frontgrass.png", depth: 0.03, style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/da04239b4_scenelayer-topfern.png", depth: 0.04, style: { bottom: 0, left: 0, width: "40%", opacity: 1 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/b09341c6f_scenelayer-altar.png", depth: 0.048, style: { bottom: 0, left: "50%", transform: "translateX(-50%)", width: "clamp(400px, 88vw, 760px)", opacity: 1 } },
];

export default function Splash({ onEnter }) {
  const [phase, setPhase] = useState("idle");
  const [particles, setParticles] = useState([]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const rawMouse = useRef({ x: 0, y: 0 });

  // Throttle mouse updates via rAF to reduce layout thrashing
  const handleMouseMove = (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    rawMouse.current = { x: e.clientX - cx, y: e.clientY - cy };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setMouse({ ...rawMouse.current });
        rafRef.current = null;
      });
    }
  };

  const handleClick = () => {
    if (phase !== "idle") return;
    setPhase("igniting");
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * 360 + Math.random() * 20,
      speed: 0.6 + Math.random() * 1.2,
      size: 18 + Math.random() * 30,
      delay: Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 60,
    }));
    setParticles(newParticles);
    timerRef.current = setTimeout(() => {
      setPhase("fading");
      setTimeout(() => onEnter(), 1000);
    }, 1400);
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[999] flex items-center justify-center cursor-pointer overflow-hidden select-none"
      style={{
        background: "linear-gradient(180deg, #0a0f1e 0%, #0d1530 50%, #080d18 100%)",
        opacity: phase === "fading" ? 0 : 1,
        transition: phase === "fading" ? "opacity 1s ease-in-out" : "none",
      }}
    >
      {/* Background video — lower playback rate & opacity for perf */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.7, zIndex: 0 }}
        ref={el => { if (el) el.playbackRate = 0.7; }}
      >
        <source src="https://video.wixstatic.com/video/13471a_24a7d3ed1ea64b63979b84f451561b83/1080p/mp4/file.mp4" type="video/mp4" />
      </video>

      {/* Parallax scene layers (no willChange on every layer — only lantern needs GPU promotion) */}
      {LAYERS.map((layer, i) => {
        const tx = mouse.x * layer.depth;
        const ty = mouse.y * layer.depth;
        return (
          <img
            key={i}
            src={layer.src}
            alt=""
            className="absolute pointer-events-none"
            style={{
              ...layer.style,
              transform: `${layer.style.transform || ""} translate(${tx}px, ${ty}px)`,
              transition: "transform 0.15s ease-out",
              zIndex: i + 1,
            }}
          />
        );
      })}

      {/* Lantern — absolutely positioned, large, explicit px size */}
      {(() => {
        const depth = 0.055;
        const tx = mouse.x * depth;
        const ty = mouse.y * depth;
        return (
          <img
            src="https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/a5db5756d_scenelayer-lantern.png"
            alt=""
            className="absolute pointer-events-none"
            style={{
              bottom: "18%",
              left: "50%",
              width: 260,
              height: "auto",
              transform: `translateX(-50%) translate(${tx}px, ${ty}px)`,
              transition: "transform 0.15s ease-out",
              willChange: "transform",
              zIndex: 7,
              imageRendering: "auto",
            }}
          />
        );
      })()}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 100%, rgba(10,20,60,0.3) 0%, transparent 70%)",
        zIndex: 8,
      }} />

      {/* Lantern glow — isolated on its own layer, no blur on every frame */}
      <div className="absolute pointer-events-none" style={{
        bottom: "20%",
        left: "50%",
        width: 480,
        height: 480,
        background: "radial-gradient(circle, rgba(80,190,255,0.55) 0%, rgba(40,130,255,0.25) 40%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(22px)",
        animation: "pulseGlow 4s ease-in-out infinite",
        transform: "translateX(-50%)",
        zIndex: 9,
        willChange: "opacity, transform",
      }} />

      {/* Center content */}
      <div className="relative flex flex-col items-center" style={{ zIndex: 10, marginTop: "-10%" }}>
        {phase !== "idle" && particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * 130 * p.speed + p.drift;
          const ty = Math.sin(rad) * 130 * p.speed - 80;
          return (
            <div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: p.size,
                height: p.size * 1.8,
                background: "radial-gradient(ellipse at 50% 80%, rgba(120,230,255,0.95) 0%, rgba(40,140,255,0.7) 40%, transparent 100%)",
                filter: "blur(3px)",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                animation: `flameShoot 1.2s cubic-bezier(0.2,0,0.8,1) ${p.delay}s forwards`,
                "--tx": `${tx}px`,
                "--ty": `${ty}px`,
              }}
            />
          );
        })}

        <div className="text-center" style={{ opacity: phase === "igniting" ? 0 : 1, transition: "opacity 0.3s" }}>
          <p className="text-[10px] tracking-[0.4em] uppercase mb-3 font-heading" style={{ color: "rgba(100,180,255,0.45)" }}>
            ✦ Forsaken Faith · Ex Ruina Veri Surgit ✦
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-1 font-heading" style={{
            color: "#fff",
            textShadow: "0 0 40px rgba(80,160,255,0.6), 0 2px 4px rgba(0,0,0,0.8)",
          }}>
            Foxfam.Faith
          </h1>
          <p className="text-sm mt-2 font-heading" style={{ color: "rgba(140,180,255,0.45)", letterSpacing: "0.15em" }}>
            — Veri's Shrine —
          </p>
        </div>

        <div className="mt-10" style={{ opacity: phase === "igniting" ? 0 : 1, transition: "opacity 0.3s" }}>
          <p style={{
            color: "rgba(120,200,255,0.6)",
            fontSize: 12,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontFamily: "var(--font-heading)",
            animation: "breathe 2.5s ease-in-out infinite",
          }}>
            ✦ Click to Enter ✦
          </p>
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.9; transform: translateX(-50%) scale(1.18); }
        }
        @keyframes flameShoot {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          60% { opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}