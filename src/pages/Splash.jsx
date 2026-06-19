import { useState, useEffect, useRef } from "react";
import ParticleOverlay from "@/components/ParticleOverlay";

const LAYERS = [
  { src: "/assets/legacy-media/6066c0983_scenelayer-grass.png", depth: 0.008, style: { bottom: 0, left: 0, width: "100%", opacity: 0.9 } },
  { src: "/assets/legacy-media/e4422d62f_scenelayer-wall.png", depth: 0.015, style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "/assets/legacy-media/983cbe8b6_scenelayer-shadow.png", depth: 0.012, style: { bottom: 0, left: 0, width: "100%", opacity: 0.55, mixBlendMode: "multiply" } },
  { src: "/assets/legacy-media/809268ef7_scenelayer-frontgrass.png", depth: 0.03, style: { bottom: 0, left: 0, width: "100%", opacity: 1 } },
  { src: "/assets/legacy-media/da04239b4_scenelayer-topfern.png", depth: 0.04, style: { bottom: 0, left: 0, width: "40%", opacity: 1 } },
  { src: "/assets/legacy-media/b09341c6f_scenelayer-altar.png", depth: 0, style: { bottom: 0, left: "50%", transform: "translateX(-50%)", width: "clamp(400px, 88vw, 760px)", opacity: 1 } },
];

export default function Splash({ onEnter }) {
  const [phase, setPhase] = useState("idle");
  const [particles, setParticles] = useState([]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef("idle");
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
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "igniting";
    setPhase("igniting");
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      angle: 245 + (i / 23) * 110 + Math.random() * 8,
      speed: 0.55 + Math.random() * 0.85,
      size: 10 + Math.random() * 18,
      delay: Math.random() * 0.24,
      drift: (Math.random() - 0.5) * 24,
    }));
    setParticles(newParticles);
    timerRef.current = setTimeout(() => {
      phaseRef.current = "fading";
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

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 100%, rgba(10,20,60,0.3) 0%, transparent 70%)",
        zIndex: 8,
      }} />

      <ParticleOverlay style={{ zIndex: 30 }} />

      {/* Static lantern focal point */}
      <button
        data-testid="splash-lantern-stage"
        type="button"
        aria-label="Enter Foxfam.Faith"
        onPointerDown={(event) => {
          event.stopPropagation();
          handleClick();
        }}
        onClick={(event) => {
          event.stopPropagation();
          handleClick();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          handleClick();
        }}
        className="splash-lantern-stage absolute cursor-pointer border-0 bg-transparent p-0"
        style={{
          bottom: "clamp(28px, 5vw, 58px)",
          left: "50%",
          width: "clamp(210px, 22vw, 330px)",
          aspectRatio: "1 / 1",
          transform: "translateX(-50%)",
          zIndex: 18,
          willChange: "opacity",
        }}
      >
        <div
          className="absolute inset-[-22%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(113,229,255,0.38) 0%, rgba(31,143,255,0.2) 34%, rgba(21,67,146,0.08) 56%, transparent 73%)",
            filter: "blur(18px)",
            animation: "pulseGlow 4s ease-in-out infinite",
          }}
        />

        <img
          data-testid="splash-lantern"
          src="/assets/lantern.png"
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          style={{
            zIndex: 2,
            imageRendering: "auto",
            filter: "drop-shadow(0 0 24px rgba(80,190,255,0.78)) drop-shadow(0 0 62px rgba(40,130,255,0.52))",
          }}
        />

        <div
          data-testid="splash-lantern-flames"
          className={`splash-lantern-flames absolute inset-0 pointer-events-none ${phase !== "idle" ? "is-lit" : ""}`}
          style={{
            zIndex: 3,
            mixBlendMode: "screen",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "58%",
              width: "34%",
              height: "45%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(ellipse at 50% 72%, rgba(195,250,255,0.95) 0%, rgba(64,199,255,0.76) 35%, rgba(27,106,255,0.35) 61%, transparent 78%)",
              filter: "blur(4px)",
              animation: phase === "idle" ? "none" : "lanternCoreFlame 0.9s ease-out forwards",
            }}
          />
          {phase !== "idle" && particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * 42 * p.speed + p.drift;
            const ty = Math.sin(rad) * 52 * p.speed - 34;
            return (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size * 1.9,
                  background: "radial-gradient(ellipse at 50% 82%, rgba(210,252,255,0.96) 0%, rgba(79,211,255,0.78) 36%, rgba(25,97,255,0.34) 68%, transparent 100%)",
                  filter: "blur(2.5px)",
                  left: "50%",
                  top: "58%",
                  transform: "translate(-50%, -50%)",
                  animation: `lanternFlameRise 1.05s cubic-bezier(0.16,0.88,0.34,1) ${p.delay}s forwards`,
                  "--tx": `${tx}px`,
                  "--ty": `${ty}px`,
                }}
              />
            );
          })}
        </div>

        <div
          data-testid="splash-lantern-hit-target"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            handleClick();
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleClick();
          }}
          className="absolute inset-[12%] rounded-full"
          style={{
            zIndex: 4,
            background: "rgba(255,255,255,0.001)",
          }}
        />
      </button>

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
        .splash-lantern-stage:focus {
          outline: none;
        }
        .splash-lantern-flames {
          opacity: 0;
          transition: opacity 0.12s ease;
        }
        .splash-lantern-stage:focus .splash-lantern-flames,
        .splash-lantern-stage:active .splash-lantern-flames,
        .splash-lantern-flames.is-lit {
          opacity: 1;
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.92; transform: scale(1.12); }
        }
        @keyframes lanternCoreFlame {
          0% { transform: translate(-50%, -50%) scale(0.35, 0.2); opacity: 0; }
          32% { opacity: 1; }
          100% { transform: translate(-50%, -56%) scale(1.08, 1.22); opacity: 0.95; }
        }
        @keyframes lanternFlameRise {
          0% { transform: translate(-50%, -50%) scale(0.45); opacity: 0; }
          18% { opacity: 0.94; }
          72% { opacity: 0.72; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.12); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
