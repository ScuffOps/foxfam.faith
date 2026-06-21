import { BookOpen, Gem, Lamp, Music, Shield, Sparkles, VenetianMask } from "lucide-react";
import { getEquippedCharms, getRelicBase, getRelicTheme, normalizeRelic, RELIC_RARITY_META } from "@/lib/relicCharms";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";

const BASE_ICONS = {
  lantern: Lamp,
  tome: BookOpen,
  mask: VenetianMask,
  crystal: Gem,
  instrument: Music,
};

const SLOT_POSITIONS = {
  halo: "left-1/2 top-2 -translate-x-1/2",
  core: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  chain: "left-3 top-1/2 -translate-y-1/2",
  ribbon: "right-4 top-1/2 -translate-y-1/2",
  sigil: "left-1/2 bottom-8 -translate-x-1/2",
  flame: "right-8 top-10",
  root: "left-8 bottom-10",
  pin: "right-8 bottom-12",
  bell: "left-8 top-12",
};

export default function RelicPreview({ relic, charms = [], compact = false }) {
  const normalizedRelic = normalizeRelic(relic);
  const base = getRelicBase(normalizedRelic.base_type);
  const theme = getRelicTheme(normalizedRelic.theme);
  const equipped = getEquippedCharms(charms);
  const Icon = BASE_ICONS[base.id] || Shield;
  const sizeClass = compact ? "h-52 min-h-52" : "h-[26rem] min-h-[26rem]";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/25 ${sizeClass}`}
      style={{ boxShadow: `inset 0 0 90px ${theme.glow}` }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at 50% 24%, ${theme.glow}, transparent 34%), linear-gradient(180deg, ${theme.palette[0]}, rgba(5,8,18,0.96))`,
        }}
      />
      <div className="absolute inset-x-10 bottom-10 h-20 rounded-[50%] bg-[radial-gradient(ellipse,rgba(148,163,184,0.28),rgba(20,25,48,0.08)_62%,transparent_70%)]" />

      <div className="absolute left-4 top-4 z-10">
        <span className="inline-flex rounded-lg border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
          {theme.label} {base.label}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`relative flex ${compact ? "h-36 w-36" : "h-56 w-56"} items-center justify-center rounded-full border border-white/10 bg-white/[0.045]`}>
          <div className="absolute inset-5 rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-10 rounded-full bg-black/20 blur-xl" />
          <Icon className={`${compact ? "h-20 w-20" : "h-32 w-32"} relative z-10 ${theme.accentClass}`} strokeWidth={1.35} />
          {normalizedRelic.effects?.includes("star-orbit") && (
            <div className="absolute inset-2 animate-spin rounded-full border border-cyan-100/15 [animation-duration:18s]">
              <Sparkles className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-amber-100" />
            </div>
          )}
          {normalizedRelic.effects?.includes("blue-flame") && <div className="absolute bottom-8 h-10 w-8 rounded-full bg-cyan-300/20 blur-md" />}
        </div>
      </div>

      {equipped.map((charm) => {
        const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;
        return (
          <div
            key={charm.id || charm.charm_key}
            className={`absolute z-20 ${SLOT_POSITIONS[charm.slot] || "right-5 top-5"}`}
          >
            <span className={`inline-flex max-w-[10rem] items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold shadow-lg backdrop-blur ${rarity.className}`}>
              <RelicCharmIcon charm={charm} className="h-5 w-5 shrink-0" />
              <span className="truncate">{charm.name}</span>
            </span>
          </div>
        );
      })}

      <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg border border-white/10 bg-black/35 p-3 backdrop-blur">
        <h3 className="font-heading text-sm font-semibold text-white">{normalizedRelic.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">{normalizedRelic.lore}</p>
      </div>
    </div>
  );
}
