import { useState, useEffect, useRef } from "react";
import ParticleOverlay from "@/components/ParticleOverlay";

const ALTAR_IMAGE = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/b09341c6f_scenelayer-altar.png";

const LAYERS = [
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/6066c0983_scenelayer-grass.png", depth: 0.008, sway: "far", style: { bottom: 0, left: 0, width: "100%", opacity: 0.9 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e4422d62f_scenelayer-wall.png", depth: 0.015, style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/983cbe8b6_scenelayer-shadow.png", depth: 0.012, style: { bottom: 0, left: 0, width: "100%", opacity: 0.55, mixBlendMode: "multiply" } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/809268ef7_scenelayer-frontgrass.png", depth: 0.03, sway: "near", style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/da04239b4_scenelayer-topfern.png", depth: 0.04, sway: "side", style: { bottom: 0, left: 0, width: "40%", opacity: 1 } },
];

const LANTERN_SPARKS = [
  { left: "43%", top: "55%", size: 4, delay: "0s", duration: "4.8s", driftX: "-15px", driftY: "-54px" },
  { left: "55%", top: "57%", size: 3, delay: "0.7s", duration: "5.4s", driftX: "14px", driftY: "-48px" },
  { left: "50%", top: "49%", size: 2, delay: "1.1s", duration: "4.4s", driftX: "-6px", driftY: "-58px" },
  { left: "61%", top: "63%", size: 3, delay: "1.8s", duration: "5.8s", driftX: "19px", driftY: "-42px" },
  { left: "40%", top: "66%", size: 2, delay: "2.4s", duration: "4.9s", driftX: "-20px", driftY: "-38px" },
  { left: "52%", top: "67%", size: 4, delay: "3.1s", duration: "5.6s", driftX: "8px", driftY: "-50px" },
  { left: "47%", top: "60%", size: 2, delay: "3.9s", duration: "4.6s", driftX: "-11px", driftY: "-45px" },
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

      {/* Parallax scene layers */}
      {LAYERS.map((layer, i) => {
        const tx = mouse.x * layer.depth;
        const ty = mouse.y * layer.depth;
        const baseTransform = layer.style.transform || "";
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              ...layer.style,
              transform: `${baseTransform} translate3d(${tx}px, ${ty}px, 0)`.trim(),
              transition: "transform 0.15s ease-out",
              zIndex: i + 1,
            }}
          >
            <img
              src={layer.src}
              alt=""
              className={`block h-auto w-full ${layer.sway ? `splash-plant-sway splash-plant-sway--${layer.sway}` : ""}`}
            />
          </div>
        );
      })}

      <div className="splash-altar-stage absolute pointer-events-none">
        <img src={ALTAR_IMAGE} alt="" className="block h-auto w-full" />

        <div className="splash-lantern-anchor">
          <div className="splash-lantern-aura" />
          <div className="splash-lantern-sparks">
            {LANTERN_SPARKS.map((spark, index) => (
              <span
                key={index}
                className="splash-lantern-spark"
                style={{
                  left: spark.left,
                  top: spark.top,
                  width: spark.size,
                  height: spark.size,
                  animationDelay: spark.delay,
                  animationDuration: spark.duration,
                  "--spark-x": spark.driftX,
                  "--spark-y": spark.driftY,
                }}
              />
            ))}
          </div>

          {phase !== "idle" && particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * 130 * p.speed + p.drift;
            const ty = Math.sin(rad) * 130 * p.speed - 80;
            return (
              <div
                key={p.id}
                className="splash-lantern-burst"
                style={{
                  width: p.size,
                  height: p.size * 1.8,
                  animationDelay: `${p.delay}s`,
                  "--tx": `${tx}px`,
                  "--ty": `${ty}px`,
                }}
              />
            );
          })}

          <img
            src="/assets/lantern-altar.png"
            alt=""
            className="relative z-[3] block h-auto w-full"
            style={{
              imageRendering: "auto",
              filter: "drop-shadow(0 0 22px rgba(80,190,255,0.72)) drop-shadow(0 0 46px rgba(40,130,255,0.36))",
            }}
          />
        </div>
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 100%, rgba(10,20,60,0.3) 0%, transparent 70%)",
        zIndex: 8,
      }} />

      <ParticleOverlay style={{ zIndex: 30 }} />

      {/* Center content — positioned near the top dark area */}
      <div className="absolute flex flex-col items-center" style={{ zIndex: 10, top: "8%", left: "50%", transform: "translateX(-50%)", width: "100%" }}>
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
        .splash-altar-stage {
          bottom: 0;
          left: 50%;
          width: clamp(400px, 88vw, 760px);
          transform: translateX(-50%);
          z-index: 7;
        }

        .splash-lantern-anchor {
          position: absolute;
          left: 50%;
          bottom: clamp(58px, 9vw, 124px);
          width: clamp(86px, 15.5%, 132px);
          aspect-ratio: 265 / 399;
          transform: translateX(-50%);
          isolation: isolate;
          z-index: 3;
        }

        .splash-lantern-aura {
          position: absolute;
          left: 50%;
          top: 58%;
          z-index: 1;
          width: 220%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(105, 225, 255, 0.54) 0%, rgba(38, 150, 255, 0.28) 38%, transparent 72%);
          filter: blur(18px);
          transform: translate(-50%, -50%);
          animation: lanternGlow 4s ease-in-out infinite;
          will-change: opacity, transform;
        }

        .splash-lantern-sparks {
          position: absolute;
          inset: 0;
          z-index: 4;
          overflow: visible;
        }

        .splash-lantern-spark {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(circle, #ffffff 0 18%, #bff6ff 19% 46%, rgba(76, 205, 255, 0) 72%);
          box-shadow: 0 0 8px rgba(190, 245, 255, 0.96), 0 0 18px rgba(75, 175, 255, 0.58);
          transform: translate(-50%, -50%) scale(0.4);
          animation: lanternSparkDrift 5s ease-out infinite;
        }

        .splash-lantern-burst {
          position: absolute;
          left: 50%;
          top: 58%;
          z-index: 5;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 80%, rgba(120,230,255,0.95) 0%, rgba(40,140,255,0.7) 40%, transparent 100%);
          filter: blur(3px);
          transform: translate(-50%, -50%);
          animation: flameShoot 1.2s cubic-bezier(0.2,0,0.8,1) forwards;
        }

        .splash-plant-sway {
          transform-origin: 50% 100%;
          will-change: transform;
        }

        .splash-plant-sway--far {
          animation: plantSwayFar 11s ease-in-out infinite;
        }

        .splash-plant-sway--near {
          animation: plantSwayNear 8.5s ease-in-out infinite;
        }

        .splash-plant-sway--side {
          transform-origin: 0% 100%;
          animation: plantSwaySide 9.5s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        @keyframes plantSwayFar {
          0%, 100% { transform: translate3d(-2px, 0, 0) rotate(-0.25deg) scale(1.002); }
          50% { transform: translate3d(2px, -1px, 0) rotate(0.22deg) scale(1.004); }
        }

        @keyframes plantSwayNear {
          0%, 100% { transform: translate3d(-4px, 1px, 0) rotate(-0.45deg) scale(1.006); }
          50% { transform: translate3d(4px, -1px, 0) rotate(0.38deg) scale(1.01); }
        }

        @keyframes plantSwaySide {
          0%, 100% { transform: translate3d(-2px, 0, 0) rotate(-0.6deg); }
          50% { transform: translate3d(3px, -1px, 0) rotate(0.45deg); }
        }

        @keyframes lanternGlow {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.16); }
        }

        @keyframes lanternSparkDrift {
          0%, 18% { opacity: 0; transform: translate(-50%, -50%) scale(0.25); }
          26% { opacity: 1; }
          78% { opacity: 0.68; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.08); }
        }

        @keyframes flameShoot {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          60% { opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-plant-sway,
          .splash-lantern-aura,
          .splash-lantern-spark,
          .splash-lantern-burst {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
