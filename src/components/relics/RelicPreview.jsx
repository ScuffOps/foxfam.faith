import { getEquippedCharms, getRelicBase, getRelicTheme, normalizeRelic, RELIC_RARITY_META } from "@/lib/relicCharms";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";
import { getRelicEvolutionLabel, getRelicEvolutionStage } from "@/components/relics/relicEvolutionModel";
import {
  COLLECTIBLE_ART_KINDS,
  getApprovedCollectibleArtAsset,
} from "@/components/relics/collectibleArtManifest";
import "@/components/relics/relic-art.css";

const OUTLINE = "#35404f";
const WARM_OUTLINE = "#5f463d";
const CREAM = "#f6f0df";
const PARCHMENT = "#ead9b8";
const WOOD = "#b78667";
const WOOD_DARK = "#8f6455";
const GOLD = "#dfc982";
const ROSE = "#d9a3aa";
const SKY = "#a4c8d5";
const LILAC = "#b4b3cc";

const EFFECT_PRIORITY = ["sigil-glow", "blue-flame", "star-orbit", "petal-drift", "snow-dots", "lore-script"];
const MAX_VISIBLE_SOCKET_CHARMS = 2;

function getThemeAccent(theme) {
  const palette = theme?.palette || [];
  return {
    shadow: palette[0] || OUTLINE,
    accent: palette[1] || SKY,
    highlight: palette[2] || GOLD,
  };
}

export default function RelicPreview({ relic, charms = [], compact = false }) {
  const normalizedRelic = normalizeRelic(relic);
  const base = getRelicBase(normalizedRelic.base_type);
  const theme = getRelicTheme(normalizedRelic.theme);
  const equipped = getEquippedCharms(charms);
  const showcasedCharms = equipped.slice(0, MAX_VISIBLE_SOCKET_CHARMS);
  const overflowCharmCount = Math.max(0, equipped.length - showcasedCharms.length);
  const stage = getRelicEvolutionStage(equipped);

  return (
    <section
      className={`relic-art ${compact ? "relic-art--compact" : ""}`}
      aria-label={`${normalizedRelic.name}, ${getRelicEvolutionLabel(stage)} ${theme.label.toLowerCase()} ${base.label.toLowerCase()}`}
      style={{
        "--relic-theme": theme.palette[1],
        "--relic-highlight": theme.palette[2],
        "--relic-shadow": theme.palette[0],
      }}
    >
      <div className="relic-art__header">
        <span className="relic-art__tag">{theme.label} {base.label}</span>
        <span className="relic-art__stage">{getRelicEvolutionLabel(stage)}</span>
      </div>

      <div className="relic-art__display">
        <RelicArtifactSvg
          baseId={base.id}
          compact={compact}
          effects={normalizedRelic.effects || []}
          stage={stage}
          theme={theme}
        />

        <div className="relic-art__socket-rail" aria-label="Equipped charms">
          {showcasedCharms.map((charm) => {
            const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;
            return (
              <span
                key={charm.id || charm.charm_key}
                className={`relic-art__socket relic-art__socket--${charm.rarity || "common"}`}
                title={`${charm.name}, ${rarity.label}`}
              >
                <RelicCharmIcon charm={charm} className="h-full w-full" />
              </span>
            );
          })}
          {overflowCharmCount > 0 ? <span className="relic-art__socket-count">+{overflowCharmCount}</span> : null}
        </div>
      </div>

      <div className="relic-art__caption">
        <div className="relic-art__title-row">
          <h3>{normalizedRelic.name}</h3>
          <span>{equipped.length} charm{equipped.length === 1 ? "" : "s"}</span>
        </div>
        <p>{normalizedRelic.lore}</p>
      </div>
    </section>
  );
}

function RelicArtifactSvg({ baseId, compact, effects, stage, theme }) {
  const colors = getThemeAccent(theme);
  const [primaryEffect] = EFFECT_PRIORITY.filter((effect) => effects.includes(effect));
  const approvedBaseAsset = getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.relicBase, baseId || "lantern");
  const approvedEffectAsset = primaryEffect
    ? getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.relicEffect, primaryEffect)
    : null;

  if (approvedBaseAsset || approvedEffectAsset) {
    return (
      <div
        className={`relic-art__artifact ${compact ? "relic-art__artifact--compact" : ""}`}
        role="img"
        aria-label="Crafted profile relic"
        data-relic-base={baseId || "lantern"}
        data-relic-stage={stage}
      >
        {approvedBaseAsset ? (
          <>
            <img
              className="relic-art__approved-layer"
              src={approvedBaseAsset}
              alt=""
              aria-hidden="true"
              draggable="false"
              data-art-source="approved"
              data-art-kind="relic-base"
            />
            <RelicApprovedOverlaySvg
              colors={colors}
              effect={approvedEffectAsset ? null : primaryEffect}
              stage={stage}
            />
          </>
        ) : (
          <RelicFallbackSvg
            baseId={baseId}
            colors={colors}
            effect={approvedEffectAsset ? null : primaryEffect}
            stage={stage}
          />
        )}
        {approvedEffectAsset ? (
          <img
            className="relic-art__approved-layer relic-art__approved-layer--effect"
            src={approvedEffectAsset}
            alt=""
            aria-hidden="true"
            draggable="false"
            data-art-source="approved"
            data-art-kind="relic-effect"
          />
        ) : null}
      </div>
    );
  }

  return (
    <svg
      className={`relic-art__artifact ${compact ? "relic-art__artifact--compact" : ""}`}
      viewBox="0 0 160 160"
      role="img"
      aria-label="Crafted profile relic"
      data-relic-base={baseId || "lantern"}
      data-relic-stage={stage}
      data-art-source="fallback"
    >
      <RelicFallbackContent baseId={baseId} colors={colors} effect={primaryEffect} stage={stage} />
    </svg>
  );
}

function RelicApprovedOverlaySvg({ colors, effect, stage }) {
  return (
    <svg
      className="relic-art__approved-layer relic-art__approved-layer--fallback-overlay"
      viewBox="0 0 160 160"
      aria-hidden="true"
      data-art-source="fallback-overlay"
    >
      <g className="relic-art__layer relic-art__layer--ornament">
        <EvolutionOrnaments colors={colors} stage={stage} />
      </g>
      <g className="relic-art__layer relic-art__layer--theme-inlay">
        <path d="m80 70 10 12-10 12-10-12 10-12Z" fill={colors.accent} stroke={OUTLINE} strokeLinejoin="round" strokeWidth="3" />
        <path d="m80 75 5 7-5 7-5-7 5-7Z" fill={colors.highlight} />
      </g>
      <g className="relic-art__layer relic-art__layer--effect">
        <RelicEffect effect={effect} colors={colors} />
      </g>
    </svg>
  );
}

function RelicFallbackSvg({ baseId, colors, effect, stage }) {
  return (
    <svg className="relic-art__approved-layer" viewBox="0 0 160 160" aria-hidden="true" data-art-source="fallback">
      <RelicFallbackContent baseId={baseId} colors={colors} effect={effect} stage={stage} />
    </svg>
  );
}

function RelicFallbackContent({ baseId, colors, effect, stage }) {
  return (
    <>
      <g className="relic-art__layer relic-art__layer--ornament">
        <EvolutionOrnaments colors={colors} stage={stage} />
      </g>
      <g className="relic-art__layer relic-art__layer--effect">
        <RelicEffect effect={effect} colors={colors} />
      </g>
      <g className="relic-art__layer">
        {baseId === "tome" ? <TomeRelic colors={colors} /> : null}
        {baseId === "mask" ? <MaskRelic colors={colors} /> : null}
        {baseId === "crystal" ? <CrystalRelic colors={colors} /> : null}
        {baseId === "instrument" ? <InstrumentRelic colors={colors} /> : null}
        {!baseId || baseId === "lantern" ? <LanternRelic colors={colors} /> : null}
      </g>
    </>
  );
}

function EvolutionOrnaments({ colors, stage }) {
  if (stage === 0) return null;
  return (
    <g stroke={OUTLINE} strokeLinejoin="round" strokeWidth="3">
      {stage >= 1 ? (
        <>
          <path d="m31 71 19-13-3 29-18 7 2-23Z" fill={colors.accent} />
          <path d="m129 71-19-13 3 29 18 7-2-23Z" fill={colors.accent} />
        </>
      ) : null}
      {stage >= 2 ? <path d="m61 31 19-15 19 15-9 10H70l-9-10Z" fill={colors.highlight} /> : null}
      {stage >= 3 ? <path d="m51 128 29 15 29-15-7-12H58l-7 12Z" fill={colors.shadow} /> : null}
    </g>
  );
}

function RelicEffect({ effect, colors }) {
  if (effect === "star-orbit") return <StarOrbit />;
  if (effect === "blue-flame") return <BlueFlameEffect colors={colors} />;
  if (effect === "petal-drift") return <PetalDrift />;
  if (effect === "sigil-glow") return <SigilMark colors={colors} />;
  if (effect === "snow-dots") return <SnowDots />;
  if (effect === "lore-script") return <LoreScript />;
  return null;
}

function LanternRelic({ colors }) {
  return <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"><path d="M63 29h34l9 15H54l9-15Z" fill={GOLD} /><path d="M52 44h56l8 78H44l8-78Z" fill={WOOD} /><path d="M63 53h34l4 55H59l4-55Z" fill={CREAM} /><path d="M50 121h60l-8 14H58l-8-14Z" fill={GOLD} /><path d="M70 29c0-14 20-14 20 0" fill="none" /><path d="M80 64c13 16 13 28 0 38-13-10-13-22 0-38Z" fill={colors.accent} stroke={OUTLINE} /><path d="M80 77c6 8 6 14 0 19-6-5-6-11 0-19Z" fill={colors.highlight} stroke={OUTLINE} strokeWidth="3" /></g>;
}

function TomeRelic({ colors }) {
  return <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"><path d="M43 41l58-10 18 81-58 10c-12 2-22-4-25-16L25 58c-2-10 6-15 18-17Z" fill={WOOD_DARK} /><path d="M43 41l58-10 15 68-58 10c-11 2-20-3-23-14L25 58c-2-10 6-15 18-17Z" fill={WOOD} /><path d="M54 51l42-7 10 46-42 8-10-47Z" fill={PARCHMENT} /><path d="M47 108c12 5 39-2 58-7" fill="none" /><path d="m79 55 9 11 14 1-10 10 2 14-13-7-13 7 3-14-10-10 14-1 4-11Z" fill={colors.highlight} stroke={OUTLINE} /></g>;
}

function MaskRelic({ colors }) {
  return <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"><path d="M28 55c30-18 74-18 104 0-4 43-26 65-52 65S32 98 28 55Z" fill={CREAM} /><path d="M38 61c10 7 22 8 35 3-9 14-22 18-38 9l3-12Z" fill={colors.accent} /><path d="M122 61c-10 7-22 8-35 3 9 14 22 18 38 9l-3-12Z" fill={colors.accent} /><path d="M66 94c8 5 20 5 28 0" fill="none" /><path d="m80 50 9 22-9 15-9-15 9-22Z" fill={colors.highlight} /></g>;
}

function CrystalRelic({ colors }) {
  return <g stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"><path d="m75 16 25 38-14 78-32-28 4-62 17-26Z" fill={SKY} /><path d="m99 54 34 18-25 48-22 12 13-78Z" fill={colors.accent} /><path d="M58 42 28 67l26 37 4-62Z" fill={LILAC} /><path d="m75 16 11 116" fill="none" /><path d="M42 120h76" fill="none" /></g>;
}

function InstrumentRelic({ colors }) {
  return <g stroke={WARM_OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"><path d="M42 97c-12 12-10 29 5 34 18 6 38-13 51-39 11-23 27-31 36-26-8-22-32-19-48 10-12 21-27 21-44 21Z" fill={WOOD} /><path d="M63 109c5 7 20 6 33-20" fill="none" /><path d="m102 42 24-20 11 12-26 18" fill={colors.highlight} /><path d="m96 51 25 25" fill="none" /><path d="M48 99c9-15 30-18 44-8" fill="none" stroke={colors.accent} /></g>;
}

function StarOrbit() { return <g fill={GOLD} stroke={OUTLINE} strokeLinejoin="round" strokeWidth="2"><path d="m25 50 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /><path d="m135 80 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" /></g>; }
function BlueFlameEffect({ colors }) { return <g stroke={OUTLINE} strokeLinejoin="round" strokeWidth="3"><path d="M80 20c12 13 12 24 0 33-12-9-12-20 0-33Z" fill={colors.accent} /><path d="M80 35c5 6 5 11 0 15-5-4-5-9 0-15Z" fill={colors.highlight} /></g>; }
function PetalDrift() { return <g fill={ROSE} stroke={OUTLINE} strokeWidth="2"><path d="M26 116c11-6 19-5 23 2-10 4-18 3-23-2Z" /><path d="M116 27c7 9 7 17 0 22-5-9-5-16 0-22Z" /></g>; }
function SigilMark({ colors }) { return <g fill={CREAM} stroke={colors.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"><path d="m80 115 15 10-15 9-15-9 15-10Z" /><path d="M67 125h26" /></g>; }
function SnowDots() { return <g fill={SKY} stroke={OUTLINE} strokeWidth="1.5"><circle cx="37" cy="51" r="3" /><circle cx="123" cy="86" r="3" /><circle cx="52" cy="135" r="2.5" /><circle cx="110" cy="24" r="2.5" /></g>; }
function LoreScript() { return <g fill="none" stroke={PARCHMENT} strokeLinecap="round" strokeWidth="3"><path d="M34 141c16 7 32 7 48 0s30-7 44 0" /><path d="M43 148c11 3 22 3 33 0" /></g>; }
