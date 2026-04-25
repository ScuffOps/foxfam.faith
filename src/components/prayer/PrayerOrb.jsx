import { useState } from "react";

// ── Categories & tones ──────────────────────────────────────────
export const CATEGORIES = {
  gratitude:   { primary: "#ffc940", glow: "rgba(255,190,40,0.6)",  dim: "rgba(255,190,40,0.15)", label: "Gratitude",   emoji: "✨" },
  grief:       { primary: "#50b4ff", glow: "rgba(60,140,255,0.6)",  dim: "rgba(60,140,255,0.15)", label: "Grief",       emoji: "🌊" },
  hope:        { primary: "#6ee7b7", glow: "rgba(52,211,153,0.6)",  dim: "rgba(52,211,153,0.15)", label: "Hope",        emoji: "🌱" },
  healing:     { primary: "#ff78c8", glow: "rgba(255,80,160,0.6)",  dim: "rgba(255,80,160,0.15)", label: "Healing",     emoji: "🤍" },
  guidance:    { primary: "#b060ff", glow: "rgba(140,60,240,0.6)",  dim: "rgba(140,60,240,0.15)", label: "Guidance",    emoji: "🔮" },
  celebration: { primary: "#f97316", glow: "rgba(249,115,22,0.6)",  dim: "rgba(249,115,22,0.15)", label: "Celebration", emoji: "🎉" },
  peace:       { primary: "#a3c4f3", glow: "rgba(163,196,243,0.6)", dim: "rgba(163,196,243,0.15)",label: "Peace",       emoji: "🕊️" },
  strength:    { primary: "#f87171", glow: "rgba(248,113,113,0.6)", dim: "rgba(248,113,113,0.15)",label: "Strength",    emoji: "🔥" },
};

export function detectCategory(message) {
  const t = message.toLowerCase();
  if (/thank|grateful|gratitude|bless|joy|appreciat/.test(t)) return "gratitude";
  if (/sad|grief|loss|miss|hurt|pain|cry|tear|broken/.test(t)) return "grief";
  if (/hope|wish|dream|future|believ|maybe someday/.test(t)) return "hope";
  if (/heal|recover|sick|health|better|restore/.test(t)) return "healing";
  if (/guide|direction|show me|lost|path|wisdom|sign/.test(t)) return "guidance";
  if (/celebrat|excit|win|amazing|woohoo|congrat|happy/.test(t)) return "celebration";
  if (/peace|calm|rest|still|quiet|serene|gentle/.test(t)) return "peace";
  if (/strong|strength|fight|keep going|power|survive|courage/.test(t)) return "strength";
  return "guidance"; // default
}

// ── Deterministic pseudo-random ────────────────────────────────
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

// ── Sigil generator ────────────────────────────────────────────
function generateSigil(id, color, isRead) {
  const rand = seededRand(id || "default");
  const cx = 50, cy = 50, r = 28;
  const pointCount = 5 + Math.floor(rand() * 5);
  const pts = Array.from({ length: pointCount }, (_, i) => {
    const angle = (i / pointCount) * Math.PI * 2 - Math.PI / 2;
    const pr = r * (0.65 + rand() * 0.35);
    return [cx + Math.cos(angle) * pr, cy + Math.sin(angle) * pr];
  });
  const lines = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 2; j < pts.length; j++) {
      if (rand() > 0.42) {
        lines.push(<line key={`l${i}-${j}`} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]}
          stroke={color} strokeWidth={0.9 + rand() * 0.7} strokeLinecap="round" opacity={isRead ? 0.25 : (0.55 + rand() * 0.45)} />);
      }
    }
  }
  const dots = pts.map(([x, y], i) => (
    <circle key={`d${i}`} cx={x} cy={y} r={rand() > 0.5 ? 1.8 : 1.1}
      fill={color} opacity={isRead ? 0.2 : (0.7 + rand() * 0.3)} />
  ));
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
          fill="none" stroke={color} strokeWidth={0.8} opacity={isRead ? 0.18 : 0.5} />
      );
    } else {
      flourishes.push(
        <circle key={`fc${f}`} cx={fx} cy={fy} r={fs / 2}
          fill="none" stroke={color} strokeWidth={0.7} opacity={isRead ? 0.15 : 0.45} />
      );
    }
  }
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
          <feGaussianBlur stdDeviation={isRead ? "1" : "2.5"} result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {isRead && (
          <filter id={`grey-${id}`}>
            <feColorMatrix type="saturate" values="0.15" />
          </filter>
        )}
      </defs>
      <g filter={isRead ? `url(#grey-${id})` : `url(#glow-${id})`} opacity={isRead ? 0.38 : 1}>
        <path d={`M${x1},${y1} A${r+4},${r+4} 0 ${largeArc},1 ${x2},${y2}`}
          fill="none" stroke={color} strokeWidth={0.8} opacity={isRead ? 0.2 : 0.35} strokeLinecap="round" />
        {lines}
        {flourishes}
        {dots}
        <circle cx={cx} cy={cy} r={2.2} fill={color} opacity={isRead ? 0.3 : 0.9} />
      </g>
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────
export default function PrayerOrb({ prayer, onPray, onMarkRead, isAdmin }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [praying, setPraying] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const cat = prayer.category || detectCategory(prayer.message);
  const { primary, glow, dim, label, emoji } = CATEGORIES[cat] || CATEGORIES.guidance;

  const isRead = !!prayer.is_read;
  const isHeld = (prayer.support_count || 0) > 0;

  const seed = prayer.id || "x";
  const rand = seededRand(seed);
  const breatheDur = (3.5 + rand() * 2.5).toFixed(1);
  const floatDelay = (rand() * 2).toFixed(1);

  const preview = prayer.message.length > 60 ? prayer.message.slice(0, 57) + "…" : prayer.message;

  const handlePray = async (e) => {
    e.stopPropagation();
    if (praying) return;
    setPraying(true);
    await onPray(prayer);
    setTimeout(() => setPraying(false), 1000);
  };

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    if (markingRead || !onMarkRead) return;
    setMarkingRead(true);
    await onMarkRead(prayer);
    setTimeout(() => setMarkingRead(false), 600);
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
        @keyframes heldShimmer {
          0%,100% { opacity: 0.18; }
          50%     { opacity: 0.38; }
        }
        @keyframes readFade {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0.38; transform: scale(0.9); }
        }
        @keyframes readRipple {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
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
        {/* Read indicator — faint settled halo */}
        {isRead && (
          <div style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.07)",
            zIndex: 0,
            pointerEvents: "none",
          }} />
        )}

        {/* Glow backdrop */}
        <div style={{
          position: "absolute",
          width: 70, height: 70,
          borderRadius: "50%",
          background: isRead
            ? "rgba(100,100,120,0.08)"
            : hovered ? glow : isHeld ? `${primary}33` : dim,
          filter: `blur(${isRead ? "8px" : isHeld ? "18px" : "14px"})`,
          transition: "background 0.4s, transform 0.4s",
          transform: hovered && !isRead ? "scale(1.3)" : "scale(1)",
          top: "4px", left: "8px",
          zIndex: 0,
        }} />

        {/* Held shimmer ring */}
        {isHeld && !isRead && (
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
          animation: isRead
            ? "none"
            : hovered
              ? "none"
              : `sigilBreathe ${breatheDur}s ease-in-out ${floatDelay}s infinite`,
          opacity: isRead ? 0.38 : 1,
          transition: "opacity 0.6s, filter 0.3s",
          filter: isRead ? "grayscale(0.85) brightness(0.6)" : hovered ? "blur(0)" : "blur(0.4px)",
        }}>
          {generateSigil(seed, primary, isRead)}
        </div>

        {/* "Read" check mark overlay */}
        {isRead && (
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-54%)",
            zIndex: 3,
            fontSize: 11,
            opacity: 0.45,
            pointerEvents: "none",
          }}>
            ✓
          </div>
        )}

        {/* Hover preview */}
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 168,
          zIndex: 20,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          marginTop: 6,
        }}>
          <div style={{
            background: "rgba(6,6,18,0.95)",
            border: `1px solid ${isRead ? "rgba(100,100,140,0.3)" : primary + "44"}`,
            borderRadius: 8,
            padding: "8px 10px",
            boxShadow: isRead ? "none" : `0 0 16px 2px ${glow}`,
          }}>
            <p style={{ color: isRead ? "rgba(140,140,180,0.6)" : primary, fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-heading)" }}>
              {emoji} {label}{isRead ? " · read" : ""}
            </p>
            <p style={{ color: isRead ? "rgba(160,165,190,0.55)" : "rgba(220,225,255,0.85)", fontSize: 11, lineHeight: 1.5 }}>
              {preview}
            </p>
          </div>
        </div>

        {/* Name + status */}
        <span style={{
          color: isRead ? "rgba(120,120,150,0.4)" : primary,
          fontSize: 8,
          letterSpacing: "0.18em",
          opacity: hovered ? 0.9 : isRead ? 0.4 : isHeld ? 0.65 : 0.4,
          textTransform: "uppercase",
          fontFamily: "var(--font-heading)",
          marginTop: 4,
          transition: "opacity 0.3s",
        }}>
          {prayer.is_anonymous ? "anon" : (prayer.author_name?.split(" ")[0] || "soul")}
        </span>

        {isRead && (
          <span style={{ fontSize: 7, letterSpacing: "0.18em", color: "rgba(120,120,150,0.35)", fontFamily: "var(--font-heading)", marginTop: 1 }}>
            seen
          </span>
        )}
        {!isRead && isHeld && (
          <span style={{ fontSize: 7, letterSpacing: "0.2em", color: primary, opacity: 0.5, fontFamily: "var(--font-heading)", marginTop: 1 }}>
            held
          </span>
        )}
      </div>

      {/* ── Expanded modal ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
          style={{ background: "rgba(4,4,14,0.85)", backdropFilter: "blur(6px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "sigilOpen 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
              background: isRead
                ? "linear-gradient(135deg, rgba(12,12,22,0.98) 0%, rgba(8,8,18,0.99) 100%)"
                : "linear-gradient(135deg, rgba(10,8,26,0.98) 0%, rgba(6,5,18,0.99) 100%)",
              border: `1px solid ${isRead ? "rgba(100,100,140,0.25)" : primary + "55"}`,
              boxShadow: isRead
                ? "0 8px 32px rgba(0,0,0,0.6)"
                : `0 0 50px 10px ${glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              borderRadius: 18,
              maxWidth: 420,
              width: "100%",
              padding: "28px 24px 22px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Read watermark */}
            {isRead && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 0,
              }}>
                <span style={{
                  fontSize: 80,
                  fontFamily: "var(--font-heading)",
                  color: "rgba(255,255,255,0.025)",
                  letterSpacing: "0.1em",
                  transform: "rotate(-15deg)",
                  userSelect: "none",
                }}>SEEN</span>
              </div>
            )}

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Large sigil */}
              <div style={{
                width: 100, height: 100,
                margin: "0 auto 8px",
                filter: isRead ? "grayscale(0.9) brightness(0.5)" : "none",
                opacity: isRead ? 0.45 : 1,
              }}>
                {generateSigil(seed, primary, isRead)}
              </div>

              {/* Category + read badge */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <p style={{ color: isRead ? "rgba(120,120,150,0.45)" : primary, fontSize: 9, letterSpacing: "0.35em", opacity: isRead ? 1 : 0.65, textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
                  {emoji} {label}
                </p>
                {isRead && (
                  <span style={{
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    color: "rgba(120,180,120,0.55)",
                    fontFamily: "var(--font-heading)",
                    border: "1px solid rgba(120,180,120,0.2)",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}>
                    ✓ READ BY ADMIN
                  </span>
                )}
              </div>

              {isHeld && (
                <p style={{ color: isRead ? "rgba(120,120,150,0.35)" : primary, fontSize: 8, letterSpacing: "0.25em", textAlign: "center", marginBottom: 14, opacity: 0.45, fontFamily: "var(--font-heading)" }}>
                  ✦ seen · held · {prayer.support_count} {prayer.support_count === 1 ? "soul" : "souls"} ✦
                </p>
              )}

              {/* Message */}
              <p className="text-sm leading-relaxed text-center whitespace-pre-line mb-6" style={{ color: isRead ? "rgba(160,165,190,0.55)" : "rgba(215,220,255,0.9)" }}>
                {prayer.message}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "rgba(150,170,220,0.38)" }}>
                  {prayer.is_anonymous ? "🕊️ Anonymous" : (prayer.author_name || "A soul")}
                </span>
                <div className="flex items-center gap-2">
                  {/* Admin mark as read */}
                  {isAdmin && !isRead && onMarkRead && (
                    <button
                      onClick={handleMarkRead}
                      disabled={markingRead}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
                      style={{
                        background: "rgba(120,180,120,0.12)",
                        border: "1px solid rgba(120,180,120,0.35)",
                        color: "rgba(140,200,140,0.85)",
                        opacity: markingRead ? 0.5 : 1,
                      }}
                    >
                      {markingRead ? "..." : "✓ Mark as read"}
                    </button>
                  )}
                  <button
                    onClick={handlePray}
                    disabled={praying || isRead}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
                    style={{
                      background: isRead ? "rgba(60,60,80,0.3)" : dim,
                      border: `1px solid ${isRead ? "rgba(100,100,130,0.3)" : primary + "55"}`,
                      color: isRead ? "rgba(120,120,150,0.5)" : primary,
                      opacity: praying ? 0.5 : 1,
                    }}
                  >
                    🤍 {prayer.support_count || 0}
                  </button>
                </div>
              </div>

              <p className="text-center mt-5 text-[9px]" style={{ color: "rgba(100,110,180,0.28)", letterSpacing: "0.22em" }}>
                CLICK OUTSIDE TO RELEASE
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}