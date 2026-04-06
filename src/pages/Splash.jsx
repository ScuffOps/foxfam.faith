import { useState, useEffect, useRef } from "react";

const BG_VIDEO = "https://cdn.discordapp.com/attachments/1197092699388522537/1490571405295882291/BG.mp4?ex=69d48a4c&is=69d338cc&hm=44531f28fd055fa7ee2340f0c8d2c478e65cb30e77b971c7cd6d0556ad47bfef&";
const CLOCK_VIDEO = "https://media.discordapp.net/attachments/1197092699388522537/1490585495485284423/Untitled_design.png";
const CLOCK = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/d5f592291_image.png";
const WALLS = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/f1b7a3f97_Wallredo.png";
const WALL_RIGHT = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/0a518e115_wall-Copy.png";
const LANTERN = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/1bdcd1587_Lantern.png";
const STONE_TABLE = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/3ade0b749_stonetable.png";

export default function Splash({ onEnter }) {
  const [phase, setPhase] = useState("idle"); // idle → igniting → fading
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

  const handleClick = () => {
    if (phase !== "idle") return;
    setPhase("igniting");

    // Spawn flame particles
    const newParticles = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      angle: (i / 28) * 360 + Math.random() * 20,
      speed: 0.6 + Math.random() * 1.2,
      size: 18 + Math.random() * 36,
      delay: Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 60,
    }));
    setParticles(newParticles);

    timerRef.current = setTimeout(() => {
      setPhase("fading");
      setTimeout(() => onEnter(), 1000);
    }, 1400);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 z-[999] flex items-center justify-center cursor-pointer overflow-hidden select-none"
      style={{
        background: "#000",
        opacity: phase === "fading" ? 0 : 1,
        transition: phase === "fading" ? "opacity 1s ease-in-out" : "none",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.7 }}
      >
        <source src={BG_VIDEO} type="video/mp4" />
      </video>
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(2,4,12,0.45)" }} />

      {/* Atmospheric top vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(30,60,180,0.12) 0%, transparent 60%)"
      }} />

      {/* Temple Walls — background layer (right wall accent) */}
      <img
        src={WALL_RIGHT}
        alt=""
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{
          width: "45%",
          opacity: 0.6,
          filter: "drop-shadow(0 0 20px rgba(40,120,255,0.2))",
        }}
      />
      {/* Temple Walls — full scene */}
      <img
        src={WALLS}
        alt=""
        className="absolute bottom-0 w-full pointer-events-none"
        style={{
          opacity: 0.92,
          transform: "scale(1.05)",
          transformOrigin: "bottom center",
          filter: "drop-shadow(0 0 30px rgba(40,120,255,0.3))",
        }}
      />

      {/* Ground fog */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: "linear-gradient(to top, rgba(10,20,60,0.7) 0%, transparent 100%)"
      }} />

      {/* Left lantern */}
      <img
        src={LANTERN}
        alt=""
        className="absolute pointer-events-none"
        style={{
          width: 90,
          left: "calc(50% - 320px)",
          top: "38%",
          filter: "drop-shadow(0 0 24px rgba(50,200,255,0.9)) drop-shadow(0 0 8px rgba(100,220,255,0.6))",
          animation: "lanternFloat 3s ease-in-out infinite",
        }}
      />
      {/* Right lantern */}
      <img
        src={LANTERN}
        alt=""
        className="absolute pointer-events-none"
        style={{
          width: 90,
          right: "calc(50% - 320px)",
          top: "38%",
          filter: "drop-shadow(0 0 24px rgba(50,200,255,0.9)) drop-shadow(0 0 8px rgba(100,220,255,0.6))",
          animation: "lanternFloat 3.4s ease-in-out infinite reverse",
        }}
      />

      {/* Ambient lantern glow blobs */}
      <div className="absolute pointer-events-none" style={{
        left: "calc(50% - 320px)", top: "38%",
        width: 200, height: 200,
        background: "radial-gradient(circle, rgba(50,180,255,0.15) 0%, transparent 70%)",
        transform: "translate(-50%, -50%)",
        animation: "pulseGlow 3s ease-in-out infinite",
      }} />
      <div className="absolute pointer-events-none" style={{
        right: "calc(50% - 320px)", top: "38%",
        width: 200, height: 200,
        background: "radial-gradient(circle, rgba(50,180,255,0.15) 0%, transparent 70%)",
        transform: "translate(50%, -50%)",
        animation: "pulseGlow 3.4s ease-in-out infinite reverse",
      }} />

      {/* Center content */}
      <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>

        {/* Spirit fire particles — appear on click */}
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

        {/* Clock glow aura */}
        <div className="absolute pointer-events-none" style={{
          width: 420, height: 420,
          background: phase === "igniting"
            ? "radial-gradient(circle, rgba(80,200,255,0.35) 0%, rgba(40,100,255,0.2) 40%, transparent 70%)"
            : "radial-gradient(circle, rgba(40,80,200,0.12) 0%, transparent 65%)",
          borderRadius: "50%",
          transition: "background 0.3s",
          animation: phase === "igniting" ? "igniteGlow 1.4s ease-out forwards" : "clockAura 4s ease-in-out infinite",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
        }} />

        {/* Clock video (transparent webm) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: "min(400px, 82vw)",
            filter: phase === "igniting"
              ? "drop-shadow(0 0 60px rgba(80,200,255,1)) drop-shadow(0 0 20px rgba(100,160,255,0.8)) brightness(1.2)"
              : "drop-shadow(0 0 20px rgba(60,100,255,0.5)) drop-shadow(0 0 6px rgba(80,140,255,0.3))",
            animation: "clockFloat 5s ease-in-out infinite",
            transition: "filter 0.3s",
            mixBlendMode: "normal",
          }}
        >
          <source src={CLOCK_VIDEO} type="video/webm" />
          {/* Fallback to static image */}
          <img src={CLOCK} alt="The Clock" style={{ width: "min(380px, 80vw)" }} />
        </video>

        {/* Title */}
        <div className="mt-6 text-center" style={{ opacity: phase === "igniting" ? 0 : 1, transition: "opacity 0.3s" }}>
          <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: "rgba(100,180,255,0.45)", fontFamily: "var(--font-heading)" }}>
            ✦ Forsaken Faith · Ex Ruina Veri Surgit ✦
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-1" style={{
            fontFamily: "var(--font-heading)",
            color: "#fff",
            textShadow: "0 0 40px rgba(80,160,255,0.6), 0 2px 4px rgba(0,0,0,0.8)",
          }}>
            Foxfam.Faith
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(140,180,255,0.45)", fontFamily: "var(--font-heading)", letterSpacing: "0.15em" }}>
            — Veri's Shrine —
          </p>
        </div>

        {/* Enter prompt */}
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

      {/* Stone altar bottom */}
      <img
        src={STONE_TABLE}
        alt=""
        className="absolute pointer-events-none"
        style={{
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(400px, 70vw)",
          opacity: 0.7,
          filter: "drop-shadow(0 0 12px rgba(40,80,200,0.4))",
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes clockFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes lanternFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes clockAura {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes igniteGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
          100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
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