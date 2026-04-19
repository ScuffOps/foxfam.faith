import { useState } from "react";

// ── Tone detection ──────────────────────────────────────────────
function detectTone(message) {
  const t = message.toLowerCase();
  if (/thank|grateful|gratitude|bless|joy|happ|appreciat/.test(t)) return "gold";
  if (/sad|grief|loss|miss|hurt|pain|cry|tear|broken|alone/.test(t)) return "blue";
  if (/love|hug|comfort|warm|care|heart|dear|sweet|affection/.test(t)) return "pink";
  return "violet";
}

const TONES = {
  gold:   { primary: "#ffc940", glow: "rgba(255,190,40,0.55)",  dim: "rgba(255,190,40,0.18)",  label: "Gratitude" },
  blue:   { primary: "#50b4ff", glow: "rgba(60,140,255,0.55)",  dim: "rgba(60,140,255,0.18)",   label: "Sadness"   },
  violet: { primary: "#b060ff", glow: "rgba(140,60,240,0.55)",  dim: "rgba(140,60,240,0.18)",   label: "Seeking"   },
  pink:   { primary: "#ff78c8", glow: "rgba(255,80,160,0.55)",  dim: "rgba(255,80,160,0.18)",   label: "Affection" },
};

// ── Deterministic pseudo-random from string seed ────────────────
function seededRand(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

// ── Sigil SVG generator ─────────────────────────────────────────
function generateSigil(id, color) {
  const rand = seededRand(id || "default");
  const cx = 50, cy = 50, r = 28;

  // 5-9 anchor points on a circle, slightly perturbed
  const pointCount = 5 + Math.floor(rand() * 5);
  const pts = Array.from({ length: pointCount }, (_, i) => {
    const angle = (i / pointCount) * Math.PI * 2 - Math.PI / 2;
    const pr = r * (0.65 + rand() * 0.35);
    return [cx + Math.cos(angle) * pr, cy + Math.sin(angle) * pr];
  });

  // Connect every non-adjacent pair (sigil style)
  const lines = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      if (rand() > 0.42) {
        lines.push(<line key={`l${i}-${j}`} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]}
          stroke={color} strokeWidth={0.9 + rand() * 0.7} strokeLinecap="round" opacity={0.55 + rand() * 0.45} />);
      }
    }
  }

  // Small decorative nodes at anchor points
  const dots = pts.map(([x, y], i) => (
    <circle key={`d${i}`} cx={x} cy={y} r={rand() > 0.5 ? 1.8 : 1.1}
      fill={color} opacity={0.7 + rand() * 0.3} />
  ));

  // 1-2 small inner flourishes (diamond / cross / arc)
  const flourishes = [];
  const fl = 1 + Math.floor(rand() * 2);
  for (let f = 0; f < fl; f++) {
    const fx = cx + (rand() - 0.5) * 14;
    const fy = cy + (rand() - 0.5) * 14;
    const fs = 3 + rand() * 4;
    if (rand() > 0.5) {
      flourishes.push(
        <path key={`f${f}`}
          d={`M${fx},${fy-fs} L${fx+fs/2},${fy} L${fx},${fy+fs} L${fx-fs/2},${fy} Z`}
          fill="none" stroke={color} strokeWidth={0.8} opacity={0.5} />
      );
    } else {
      flourishes.push(
        <circle key={`fc${f}`} cx={fx} cy={fy} r={fs / 2}
          fill="none" stroke={color} strokeWidth={0.7} opacity={0.45} />
      );
    }
  }

  // Outer ring (partial)
  const startAngle = rand() * Math.PI;
  const sweep = Math.PI * (0.55 + rand() * 0.9);
  const x1 = cx + Math.cos(startAngle) * (r + 4);
  const y1 = cy + Math.sin(startAngle) * (r + 4);
  const x2 = cx + Math.cos(startAngle + sweep) * (r + 4);
  const y2 = cy + Math.sin(startAngle + sweep) * (r + 4);
  const largeArc = sweep > Math.PI ? 1 : 0;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-${id})`}>
        {/* outer arc */}
        <path d={`M${x1},${y1} A${r+4},${r+4} 0 ${largeArc},1 ${x2},${y2}`}
          fill="none" stroke={color} strokeWidth={0.8} opacity={0.35} strokeLinecap="round" />
        {lines}
        {flourishes}
        {dots}
        {/* center dot */}
        <circle cx={cx} cy={cy} r={2.2} fill={color} opacity={0.9} />
      </g>
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function PrayerOrb({ prayer, onPray }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [praying, setPraying] = useState(false);

  const tone = detectTone(prayer.message);
  const { primary, glow, dim, label } = TONES[tone];

  const seed = prayer.id || "x";
  const rand = seededRand(seed);
  const breatheDur = (3.5 + rand() * 2.5).toFixed(1);
  const floatDelay = (rand() * 2).toFixed(1);
  const isHeld = (prayer.support_count || 0) > 0;

  const preview = prayer.message.length > 60
    ? prayer.message.slice(0, 57) + "…"
    : prayer.message;

  const handlePray = async (e) => {
    e.stopPropagation();
    if (praying) return;
    setPraying(true);
    await onPray(prayer);
    setTimeout(() => setPraying(false), 1000);
  };

  return (
    <>
      <style>{`
        @keyframes sigilBreathe {
          0%,100% { opacity:.72; transform:scale(1) translateY(0); }
          50%      { opacity:1;   transform:scale(1.06) translateY(-5px); }
        }
        @keyframes sigilOpen {
          from { opacity:0; transform:scale(0.7) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes sigilStabilize {
          0%  { filter: blur(1.5px); opacity:.72; }
          100%{ filter: blur(0px);   opacity:1; }
        }
        @keyframes heldShimmer {
          0%,100% { opacity: 0.18; }
          50%     { opacity: 0.38; }
        }
      `}</style>

      {/* ── Sigil tile ── */}
      <div
        className="relative flex flex-col items-center cursor-pointer select-none"
        style={{ width: 86 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded(true)}
      >
        {/* Glow backdrop */}
        <div style={{
          position: "absolute",
          width: 70, height: 70,
          borderRadius: "50%",
          background: hovered ? glow : isHeld ? `${primary}33` : dim,
          filter: `blur(${isHeld ? "18px" : "14px"})`,
          transition: "background 0.4s, transform 0.4s",
          transform: hovered ? "scale(1.3)" : isHeld ? "scale(1.15)" : "scale(1)",
          top: "4px", left: "8px",
          zIndex: 0,
        }} />

        {/* "Held" shimmer ring — only when support_count > 0 */}
        {isHeld && (
          <div style={{
            position: "absolute",
            width: 82, height: 82,
            borderRadius: "50%",
            border: `1px solid ${primary}`,
            top: "2px", left: "2px",
            zIndex: 2,
            animation: "heldShimmer 2.8s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}

        {/* SVG sigil */}
        <div style={{
          width: 86, height: 86,
          position: "relative", zIndex: 1,
          animation: hovered
            ? `sigilStabilize 0.4s ease forwards`
            : `sigilBreathe ${breatheDur}s ease-in-out ${floatDelay}s infinite`,
          transition: "filter 0.3s",
          filter: hovered ? "blur(0)" : "blur(0.4px)",
        }}>
          {generateSigil(seed, primary)}
        </div>

        {/* Hover preview text */}
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          zIndex: 20,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          marginTop: 6,
        }}>
          <div style={{
            background: "rgba(6,6,18,0.94)",
            border: `1px solid ${primary}44`,
            borderRadius: 8,
            padding: "8px 10px",
            boxShadow: `0 0 16px 2px ${glow}`,
          }}>
            <p style={{ color: primary, fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-heading)", opacity: 0.7 }}>
              ✦ {label}
            </p>
            <p style={{ color: "rgba(220,225,255,0.85)", fontSize: 11, lineHeight: 1.5 }}>
              {preview}
            </p>
          </div>
        </div>

        {/* Author name below */}
        <span style={{
          color: primary,
          fontSize: 8,
          letterSpacing: "0.18em",
          opacity: hovered ? 0.9 : isHeld ? 0.65 : 0.4,
          textTransform: "uppercase",
          fontFamily: "var(--font-heading)",
          marginTop: 4,
          transition: "opacity 0.3s",
        }}>
          {prayer.is_anonymous ? "anon" : (prayer.author_name?.split(" ")[0] || "soul")}
        </span>

        {/* Held indicator */}
        {isHeld && (
          <span style={{
            fontSize: 7,
            letterSpacing: "0.2em",
            color: primary,
            opacity: 0.5,
            fontFamily: "var(--font-heading)",
            marginTop: 1,
          }}>
            held
          </span>
        )}
      </div>

      {/* ── Expanded modal ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
          style={{ background: "rgba(4,4,14,0.82)", backdropFilter: "blur(5px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "sigilOpen 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
              background: "linear-gradient(135deg, rgba(10,8,26,0.98) 0%, rgba(6,5,18,0.99) 100%)",
              border: `1px solid ${primary}55`,
              boxShadow: `0 0 50px 10px ${glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              borderRadius: 18,
              maxWidth: 400,
              width: "100%",
              padding: "28px 24px 22px",
            }}
          >
            {/* Large sigil */}
            <div style={{ width: 100, height: 100, margin: "0 auto 8px" }}>
              {generateSigil(seed, primary)}
            </div>

            {/* Tone */}
            <p style={{ color: primary, fontSize: 9, letterSpacing: "0.35em", textAlign: "center", marginBottom: isHeld ? 6 : 18, opacity: 0.65, textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
              ✦ {label} ✦
            </p>

            {/* Held badge */}
            {isHeld && (
              <p style={{ color: primary, fontSize: 8, letterSpacing: "0.25em", textAlign: "center", marginBottom: 16, opacity: 0.45, fontFamily: "var(--font-heading)" }}>
                ✦ seen · held · {prayer.support_count} {prayer.support_count === 1 ? "soul" : "souls"} ✦
              </p>
            )}

            {/* Message */}
            <p className="text-sm leading-relaxed text-center whitespace-pre-line mb-6" style={{ color: "rgba(215,220,255,0.9)" }}>
              {prayer.message}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "rgba(150,170,220,0.38)" }}>
                {prayer.is_anonymous ? "🕊️ Anonymous" : (prayer.author_name || "A soul")}
              </span>
              <button
                onClick={handlePray}
                disabled={praying}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
                style={{
                  background: dim,
                  border: `1px solid ${primary}55`,
                  color: primary,
                  opacity: praying ? 0.5 : 1,
                }}
              >
                🤍 {prayer.support_count || 0}
              </button>
            </div>

            <p className="text-center mt-5 text-[9px]" style={{ color: "rgba(100,110,180,0.28)", letterSpacing: "0.22em" }}>
              CLICK OUTSIDE TO RELEASE
            </p>
          </div>
        </div>
      )}
    </>
  );
}