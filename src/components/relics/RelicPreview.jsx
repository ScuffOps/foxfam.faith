import { getEquippedCharms, getRelicBase, getRelicTheme, normalizeRelic, RELIC_RARITY_META } from "@/lib/relicCharms";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";

const DEEP_OUTLINE = "#0b1538";
const WARM_OUTLINE = "#3b1b12";
const GLOW = "#42ddff";
const GOLD = "#ffd66e";
const ROSE = "#ff7fa9";
const MINT = "#75e8a7";
const PARCHMENT = "#ffe8bd";
const GLASS = "#bdf4ff";
const LILAC = "#b9a9ff";
const SHADOW = "#101836";

const ORBIT_POSITIONS = [
  "right-12 top-20",
  "left-12 top-24",
  "right-14 bottom-28",
];

const SOCKET_POSITIONS = [
  { x: 48, y: 14 },
  { x: 76, y: 34 },
  { x: 69, y: 72 },
  { x: 27, y: 72 },
  { x: 20, y: 34 },
  { x: 48, y: 84 },
];

const RARITY_SOCKET_FILL = {
  common: "#a7b2c8",
  uncommon: "#6be6a6",
  rare: "#38d7ff",
  epic: "#b8a7ff",
  mythic: "#ffd568",
};

function getEvolutionStage(equipped = []) {
  const mythicBonus = equipped.some((charm) => charm.rarity === "mythic") ? 1 : 0;
  return Math.min(4, equipped.length + mythicBonus);
}

function getEvolutionLabel(stage) {
  if (stage >= 4) return "Ascendant";
  if (stage === 3) return "Crowned";
  if (stage === 2) return "Adorned";
  if (stage === 1) return "Awakened";
  return "Dormant";
}

function getThemeAccent(theme) {
  const palette = theme?.palette || [];
  return {
    shadow: palette[0] || SHADOW,
    accent: palette[1] || GLOW,
    highlight: palette[2] || GOLD,
  };
}

export default function RelicPreview({ relic, charms = [], compact = false }) {
  const normalizedRelic = normalizeRelic(relic);
  const base = getRelicBase(normalizedRelic.base_type);
  const theme = getRelicTheme(normalizedRelic.theme);
  const equipped = getEquippedCharms(charms);
  const showcasedCharms = equipped.slice(0, compact ? 2 : 3);
  const overflowCharmCount = Math.max(0, equipped.length - showcasedCharms.length);
  const stage = getEvolutionStage(equipped);
  const sizeClass = compact ? "min-h-[19rem]" : "min-h-[31rem]";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/25 ${sizeClass}`}
      style={{ boxShadow: `inset 0 0 90px ${theme.glow}` }}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at 50% 22%, ${theme.glow}, transparent 34%), linear-gradient(180deg, ${theme.palette[0]}, rgba(5,8,18,0.97))`,
        }}
      />
      <div className="absolute inset-x-8 bottom-14 h-24 rounded-[50%] bg-[radial-gradient(ellipse,rgba(148,163,184,0.28),rgba(20,25,48,0.08)_62%,transparent_72%)]" />

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <span className="inline-flex rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
          {theme.label} {base.label}
        </span>
        <span className="inline-flex rounded-lg border border-cyan-100/20 bg-cyan-200/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
          {getEvolutionLabel(stage)}
        </span>
      </div>

      <div className="absolute inset-x-0 top-16 flex justify-center px-6">
        <RelicArtifactSvg
          baseId={base.id}
          compact={compact}
          effects={normalizedRelic.effects || []}
          equipped={equipped}
          stage={stage}
          theme={theme}
        />
      </div>

      {showcasedCharms.map((charm, index) => {
        const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;
        return (
          <div
            key={charm.id || charm.charm_key}
            className={`absolute z-20 ${ORBIT_POSITIONS[index] || "right-5 top-5"}`}
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur ${rarity.className} opacity-90`} title={charm.name}>
              <RelicCharmIcon charm={charm} className="h-6 w-6 shrink-0" />
            </span>
          </div>
        );
      })}
      {overflowCharmCount > 0 && (
        <div className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex h-8 items-center rounded-full border border-white/15 bg-black/35 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 backdrop-blur">
            +{overflowCharmCount} socketed
          </span>
        </div>
      )}

      <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg border border-white/10 bg-black/35 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold text-white">{normalizedRelic.name}</h3>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
            {equipped.length} charm{equipped.length === 1 ? "" : "s"} equipped
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">{normalizedRelic.lore}</p>
      </div>
    </div>
  );
}

function RelicArtifactSvg({ baseId, compact, effects, equipped, stage, theme }) {
  const colors = getThemeAccent(theme);
  const sizeClass = compact ? "h-56 w-56" : "h-[23rem] w-[23rem]";

  return (
    <svg className={sizeClass} viewBox="0 0 160 160" role="img" aria-label="Profile relic">
      <defs>
        <radialGradient id="relicCoreGlow" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.9" />
          <stop offset="55%" stopColor={colors.accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={colors.shadow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="relicGlass" x1="28" x2="128" y1="20" y2="136">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="28%" stopColor={GLASS} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
        <linearGradient id="relicMetal" x1="28" x2="126" y1="18" y2="132">
          <stop offset="0%" stopColor="#fff0ba" />
          <stop offset="52%" stopColor={GOLD} />
          <stop offset="100%" stopColor="#b56f2d" />
        </linearGradient>
        <filter id="softRelicShadow" x="-20%" y="-20%" width="140%" height="145%">
          <feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#000717" floodOpacity="0.45" />
        </filter>
        <filter id="relicFxBlur" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="relicFxSmallBlur" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <ellipse cx="80" cy="137" rx="50" ry="11" fill="#020617" opacity="0.42" />
      <circle cx="80" cy="77" r="64" fill="url(#relicCoreGlow)" opacity={stage > 0 ? 0.82 : 0.36} />

      <EvolutionFxLayer colors={colors} stage={stage} />
      {effects.includes("star-orbit") && <StarOrbit stage={stage} />}

      <g filter="url(#softRelicShadow)">
        {baseId === "tome" && <TomeRelic colors={colors} />}
        {baseId === "mask" && <MaskRelic colors={colors} />}
        {baseId === "crystal" && <CrystalRelic colors={colors} />}
        {baseId === "instrument" && <InstrumentRelic colors={colors} />}
        {(!baseId || baseId === "lantern") && <LanternRelic colors={colors} />}
      </g>

      {effects.includes("blue-flame") && <BlueFlameEffect stage={stage} />}
      {effects.includes("petal-drift") && <PetalDrift />}
      {effects.includes("sigil-glow") && <SigilGlow colors={colors} />}
      {effects.includes("snow-dots") && <SnowDots />}
      {effects.includes("lore-script") && <LoreScript />}
      <CharmSockets equipped={equipped} stage={stage} />
    </svg>
  );
}

function EvolutionFxLayer({ colors, stage }) {
  if (stage === 0) return null;

  return (
    <>
      <g style={{ mixBlendMode: "multiply" }} opacity="0.45">
        <ellipse cx="80" cy="134" rx={38 + stage * 3} ry="9" fill="#020617" />
      </g>
      <g style={{ mixBlendMode: "screen" }} filter="url(#relicFxBlur)" opacity={0.2 + stage * 0.12}>
        <ellipse cx="80" cy="74" rx={34 + stage * 9} ry={42 + stage * 8} fill={colors.accent} />
      </g>
      {stage >= 2 && (
        <g style={{ mixBlendMode: "screen" }} opacity="0.62">
          <path d="M35 103c-10-12-10-29 2-47 8 16 20 25 34 28-12 4-24 10-36 19Z" fill={colors.accent} filter="url(#relicFxBlur)" />
          <path d="M125 103c10-12 10-29-2-47-8 16-20 25-34 28 12 4 24 10 36 19Z" fill={colors.accent} filter="url(#relicFxBlur)" />
        </g>
      )}
      {stage >= 3 && (
        <g style={{ mixBlendMode: "overlay" }} opacity="0.72">
          <path d="M48 34c18-18 46-18 64 0-24-8-45-8-64 0Z" fill={colors.highlight} />
          <path d="M44 53c25-8 50-8 75 0" fill="none" stroke="#fff7ca" strokeLinecap="round" strokeWidth="4" opacity="0.42" />
          <path d="M48 120c20 8 43 8 64 0" fill="none" stroke="#fff7ca" strokeLinecap="round" strokeWidth="3" opacity="0.3" />
        </g>
      )}
      {stage >= 4 && (
        <g style={{ mixBlendMode: "screen" }} opacity="0.88">
          <path d="M77 10l4 10 11 2-9 7 2 11-9-6-10 6 3-11-9-7 11-2 6-10Z" fill={colors.highlight} filter="url(#relicFxSmallBlur)" />
          <path d="M33 104c10 0 18 4 25 12-10-1-18-5-25-12Z" fill={MINT} opacity="0.74" />
          <path d="M127 104c-10 0-18 4-25 12 10-1 18-5 25-12Z" fill={MINT} opacity="0.74" />
          <path d="M43 41c8-5 14-4 19 2-8 4-14 3-19-2Z" fill={ROSE} opacity="0.62" />
          <path d="M119 42c-8-5-14-4-19 2 8 4 14 3 19-2Z" fill={ROSE} opacity="0.62" />
        </g>
      )}
    </>
  );
}

function LanternRelic({ colors }) {
  return (
    <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
      <path d="M63 29h34l9 15H54l9-15Z" fill="url(#relicMetal)" />
      <path d="M52 44h56l8 78H44l8-78Z" fill="#f2b858" />
      <path d="M63 53h34l4 55H59l4-55Z" fill="url(#relicGlass)" />
      <path d="M50 121h60l-8 14H58l-8-14Z" fill="url(#relicMetal)" />
      <path d="M70 29c0-14 20-14 20 0" fill="none" />
      <path d="M80 64c13 16 13 28 0 38-13-10-13-22 0-38Z" fill={colors.accent} stroke={DEEP_OUTLINE} />
      <path d="M80 77c6 8 6 14 0 19-6-5-6-11 0-19Z" fill={colors.highlight} stroke={DEEP_OUTLINE} strokeWidth="3" />
    </g>
  );
}

function TomeRelic({ colors }) {
  return (
    <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
      <path d="M43 41l58-10 18 81-58 10c-12 2-22-4-25-16L25 58c-2-10 6-15 18-17Z" fill="#8f5433" />
      <path d="M43 41l58-10 15 68-58 10c-11 2-20-3-23-14L25 58c-2-10 6-15 18-17Z" fill="#b87345" />
      <path d="M54 51l42-7 10 46-42 8-10-47Z" fill="#7a3f2e" />
      <path d="M47 108c12 5 39-2 58-7" fill={PARCHMENT} />
      <path d="M79 55l9 11 14 1-10 10 2 14-13-7-13 7 3-14-10-10 14-1 4-11Z" fill={colors.highlight} stroke={DEEP_OUTLINE} />
    </g>
  );
}

function MaskRelic({ colors }) {
  return (
    <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
      <path d="M28 55c30-18 74-18 104 0-4 43-26 65-52 65S32 98 28 55Z" fill={PARCHMENT} />
      <path d="M38 61c10 7 22 8 35 3-9 14-22 18-38 9l3-12Z" fill={colors.accent} />
      <path d="M122 61c-10 7-22 8-35 3 9 14 22 18 38 9l-3-12Z" fill={colors.accent} />
      <path d="M66 94c8 5 20 5 28 0" fill="none" />
      <path d="M80 50l9 22-9 15-9-15 9-22Z" fill={colors.highlight} />
    </g>
  );
}

function CrystalRelic({ colors }) {
  return (
    <g stroke={DEEP_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
      <path d="M75 16l25 38-14 78-32-28 4-62 17-26Z" fill="url(#relicGlass)" />
      <path d="M99 54l34 18-25 48-22 12 13-78Z" fill={colors.accent} />
      <path d="M58 42L28 67l26 37 4-62Z" fill={LILAC} />
      <path d="M75 16l11 116" fill="none" opacity="0.65" />
      <path d="M42 120h76" fill="none" />
    </g>
  );
}

function InstrumentRelic({ colors }) {
  return (
    <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
      <path d="M42 97c-12 12-10 29 5 34 18 6 38-13 51-39 11-23 27-31 36-26-8-22-32-19-48 10-12 21-27 21-44 21Z" fill="#b87345" />
      <path d="M63 109c5 7 20 6 33-20" fill="none" />
      <path d="M102 42l24-20 11 12-26 18" fill={colors.highlight} />
      <path d="M96 51l25 25" fill="none" />
      <path d="M48 99c9-15 30-18 44-8" fill={colors.accent} />
    </g>
  );
}

function StarOrbit({ stage }) {
  return (
    <g fill={GOLD} style={{ mixBlendMode: "screen" }} filter="url(#relicFxSmallBlur)" opacity={stage > 0 ? 0.86 : 0.45}>
      <path d="M25 32l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
      <path d="M134 47l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
      <path d="M125 124l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />
    </g>
  );
}

function BlueFlameEffect({ stage }) {
  if (stage === 0) return null;
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <path d="M80 27c12 13 12 23 0 32-12-9-12-19 0-32Z" fill={GLOW} filter="url(#relicFxSmallBlur)" opacity="0.78" />
      <path d="M80 39c5 6 5 10 0 15-5-5-5-9 0-15Z" fill="#2477f2" opacity="0.76" />
    </g>
  );
}

function PetalDrift() {
  return (
    <g fill={ROSE} style={{ mixBlendMode: "screen" }} opacity="0.58">
      <path d="M31 119c10-7 17-7 22 0-9 5-16 5-22 0Z" />
      <path d="M116 29c7 9 7 16 0 21-5-8-5-15 0-21Z" />
    </g>
  );
}

function SigilGlow({ colors }) {
  return (
    <g fill="none" stroke={colors.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" opacity="0.62" style={{ mixBlendMode: "screen" }}>
      <path d="M80 116l15 9-15 9-15-9 15-9Z" />
      <path d="M67 125h26" />
    </g>
  );
}

function SnowDots() {
  return (
    <g fill="#e7fbff" opacity="0.72" style={{ mixBlendMode: "screen" }}>
      <circle cx="37" cy="51" r="2" />
      <circle cx="123" cy="86" r="2.5" />
      <circle cx="52" cy="135" r="1.8" />
      <circle cx="110" cy="24" r="1.8" />
    </g>
  );
}

function LoreScript() {
  return (
    <g fill="none" stroke={PARCHMENT} strokeLinecap="round" strokeWidth="2" opacity="0.45">
      <path d="M34 141c16 7 32 7 48 0s30-7 44 0" />
      <path d="M43 147c11 3 22 3 33 0" />
    </g>
  );
}

function CharmSockets({ equipped, stage }) {
  if (stage === 0) return null;
  return (
    <g style={{ mixBlendMode: "screen" }} opacity="0.9">
      {equipped.slice(0, SOCKET_POSITIONS.length).map((charm, index) => {
        const position = SOCKET_POSITIONS[index];
        const fill = RARITY_SOCKET_FILL[charm.rarity] || RARITY_SOCKET_FILL.common;
        return (
          <g key={charm.id || `${charm.charm_key}:${index}`}>
            <circle cx={position.x} cy={position.y} r="10" fill={fill} filter="url(#relicFxSmallBlur)" opacity="0.34" />
            <circle cx={position.x} cy={position.y} r="4.5" fill={fill} opacity="0.92" />
            <circle cx={position.x - 1.5} cy={position.y - 1.5} r="1.5" fill="#fff6cf" opacity="0.76" />
          </g>
        );
      })}
    </g>
  );
}
