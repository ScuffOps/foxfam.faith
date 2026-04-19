import { useState } from "react";
import { base44 } from "@/api/base44Client";

// Detect tone from message keywords
function detectTone(message) {
  const text = message.toLowerCase();
  if (/thank|grateful|gratitude|bless|joy|happy|love|appreciat/.test(text))
    return "gold";
  if (/sad|grief|loss|miss|hurt|pain|cry|tear|broken|alone/.test(text))
    return "blue";
  if (/confus|lost|overwhelm|don't know|unsure|guidance|help|path|unclear/.test(text))
    return "violet";
  if (/love|hug|comfort|warm|care|heart|dear|sweet|affection/.test(text))
    return "pink";
  return "violet"; // default
}

const TONE_STYLES = {
  gold: {
    orb: "rgba(255, 200, 80, 0.85)",
    glow: "rgba(255, 180, 40, 0.5)",
    border: "rgba(255, 200, 80, 0.5)",
    shadow: "rgba(255, 180, 40, 0.6)",
    text: "#ffe4a0",
    label: "Gratitude",
  },
  blue: {
    orb: "rgba(80, 180, 255, 0.85)",
    glow: "rgba(60, 140, 255, 0.5)",
    border: "rgba(80, 180, 255, 0.5)",
    shadow: "rgba(60, 140, 255, 0.6)",
    text: "#a8d8ff",
    label: "Sadness",
  },
  violet: {
    orb: "rgba(160, 80, 255, 0.85)",
    glow: "rgba(130, 60, 220, 0.5)",
    border: "rgba(160, 80, 255, 0.5)",
    shadow: "rgba(130, 60, 220, 0.6)",
    text: "#d4aaff",
    label: "Seeking",
  },
  pink: {
    orb: "rgba(255, 120, 200, 0.85)",
    glow: "rgba(255, 80, 160, 0.5)",
    border: "rgba(255, 120, 200, 0.5)",
    shadow: "rgba(255, 80, 160, 0.6)",
    text: "#ffcce8",
    label: "Affection",
  },
};

export default function PrayerOrb({ prayer, onPray }) {
  const [expanded, setExpanded] = useState(false);
  const [praying, setPraying] = useState(false);
  const tone = detectTone(prayer.message);
  const style = TONE_STYLES[tone];

  // Random-ish float offset per prayer id for natural scatter
  const seed = prayer.id ? prayer.id.charCodeAt(0) + prayer.id.charCodeAt(1) : 0;
  const floatDuration = 3 + (seed % 3);
  const floatDelay = (seed % 10) * 0.4;

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
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes orbFlicker {
          0%, 100% { opacity: 0.85; }
          40% { opacity: 1; }
          70% { opacity: 0.75; }
        }
        @keyframes orbOpen {
          from { transform: scale(0.6) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {/* The orb */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `radial-gradient(circle at 38% 35%, white 0%, ${style.orb} 35%, ${style.glow} 70%, transparent 100%)`,
            boxShadow: `0 0 18px 6px ${style.shadow}, 0 0 40px 10px ${style.glow}`,
            border: `1px solid ${style.border}`,
            animation: `orbFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite, orbFlicker ${2 + (seed % 2)}s ease-in-out ${floatDelay * 0.5}s infinite`,
            transition: "transform 0.2s, box-shadow 0.2s",
            flexShrink: 0,
          }}
          className="hover:scale-110"
        />

        {/* Mini label below orb */}
        <span style={{ color: style.text, fontSize: 9, letterSpacing: "0.15em", opacity: 0.6, textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
          {prayer.is_anonymous ? "anon" : (prayer.author_name?.split(" ")[0] || "soul")}
        </span>
      </div>

      {/* Expanded memory card — shown when clicked */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
          style={{ background: "rgba(5,5,20,0.75)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "orbOpen 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
              background: "linear-gradient(135deg, rgba(12,10,30,0.97) 0%, rgba(8,6,22,0.99) 100%)",
              border: `1px solid ${style.border}`,
              boxShadow: `0 0 40px 8px ${style.shadow}, inset 0 0 30px rgba(0,0,0,0.4)`,
              borderRadius: 16,
              maxWidth: 420,
              width: "100%",
              padding: "28px 24px 20px",
              position: "relative",
            }}
          >
            {/* Rune symbol top */}
            <div className="flex justify-center mb-4">
              <div style={{
                width: 40, height: 40,
                borderRadius: "50%",
                background: `radial-gradient(circle, white 0%, ${style.orb} 40%, transparent 100%)`,
                boxShadow: `0 0 20px 6px ${style.shadow}`,
              }} />
            </div>

            {/* Tone label */}
            <p style={{ color: style.text, fontSize: 9, letterSpacing: "0.35em", textAlign: "center", marginBottom: 16, opacity: 0.7, textTransform: "uppercase", fontFamily: "var(--font-heading)" }}>
              ✦ {style.label} ✦
            </p>

            {/* Message */}
            <p className="text-sm leading-relaxed text-center whitespace-pre-line mb-5" style={{ color: "rgba(220,225,255,0.9)" }}>
              {prayer.message}
            </p>

            {/* Author & support */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: "rgba(160,180,220,0.4)" }}>
                {prayer.is_anonymous ? "🕊️ Anonymous" : (prayer.author_name || "A soul")}
              </span>
              <button
                onClick={handlePray}
                disabled={praying}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all"
                style={{
                  background: `${style.glow}`,
                  border: `1px solid ${style.border}`,
                  color: style.text,
                  opacity: praying ? 0.5 : 1,
                }}
              >
                🤍 {prayer.support_count || 0}
              </button>
            </div>

            {/* Close hint */}
            <p className="text-center mt-4 text-[10px]" style={{ color: "rgba(100,120,180,0.3)", letterSpacing: "0.2em" }}>
              CLICK OUTSIDE TO RELEASE
            </p>
          </div>
        </div>
      )}
    </>
  );
}