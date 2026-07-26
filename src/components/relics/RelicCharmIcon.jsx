const OUTLINE = "#35404f";
const INK = "#53606d";
const SKY = "#a4c8d5";
const TEAL = "#80adbc";
const GOLD = "#dfc982";
const CREAM = "#f6f0df";
const LILAC = "#b4b3cc";
const ROSE = "#d9a3aa";
const MINT = "#b7c9ad";
const CORAL = "#d99a82";

const ART_BY_KEY = {
  "ash-thread": "thread-spool",
  "candle-wax-seal": "wax-seal",
  "iron-ring": "iron-ring",
  "smoke-ribbon": "smoke-ribbon",
  "moonlit-chain": "moon-chain",
  "verdant-knot": "leaf-knot",
  "static-sigil": "static-sigil",
  "blue-ember": "blue-ember",
  "star-shard": "star-shard",
  "hollow-bell": "hollow-bell",
  "mirror-thorn": "mirror-thorn",
  "bloodrose-pin": "rose-pin",
  "void-halo": "void-halo",
  "eclipse-lens": "eclipse-lens",
  "last-vow-core": "vow-core",
  "forsaken-halo": "broken-halo",
  "starlit-bobber": "star-bobber",
  "merciful-tide": "mercy-wave",
  "pocket-star": "pocket-star",
  "glassfin-comet": "glassfin",
  "fishpedia-frame": "fishpedia",
  "century-chain": "century-chain",
};

const ART_BY_KIND = {
  wrap: "thread-spool",
  seal: "wax-seal",
  ring: "iron-ring",
  trail: "smoke-ribbon",
  chain: "moon-chain",
  knot: "leaf-knot",
  sigil: "static-sigil",
  ember: "blue-ember",
  shard: "star-shard",
  bell: "hollow-bell",
  pin: "rose-pin",
  halo: "void-halo",
  lens: "eclipse-lens",
  core: "vow-core",
};

const ART_BY_SLOT = {
  fishing: "star-bobber",
  "catch-fx": "mercy-wave",
  "profile-particle": "pocket-star",
  "profile-frame": "fishpedia",
};

const RARITY_ACCENT = {
  common: INK,
  uncommon: MINT,
  rare: SKY,
  epic: LILAC,
  mythic: GOLD,
};

export function resolveCharmArt(charm = {}) {
  return ART_BY_KEY[charm.charm_key || charm.key]
    || ART_BY_KIND[charm.kind]
    || ART_BY_SLOT[charm.slot]
    || "vow-core";
}

export default function RelicCharmIcon({ charm, className = "h-16 w-16" }) {
  const art = resolveCharmArt(charm);
  const rarityAccent = RARITY_ACCENT[charm?.rarity] || RARITY_ACCENT.common;

  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      role="img"
      aria-label={charm?.name || "Relic charm"}
      data-charm-art={art}
    >
      <path
        d="M18 22 48 10l30 12 8 28-15 27-23 9-23-9L10 50l8-28Z"
        fill={CREAM}
        stroke={rarityAccent}
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <g stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
        {art === "thread-spool" && <ThreadSpool />}
        {art === "wax-seal" && <WaxSeal />}
        {art === "iron-ring" && <IronRing />}
        {art === "smoke-ribbon" && <SmokeRibbon />}
        {art === "moon-chain" && <MoonChain />}
        {art === "leaf-knot" && <LeafKnot />}
        {art === "static-sigil" && <StaticSigil />}
        {art === "blue-ember" && <BlueEmber />}
        {art === "star-shard" && <StarShard />}
        {art === "hollow-bell" && <HollowBell />}
        {art === "mirror-thorn" && <MirrorThorn />}
        {art === "rose-pin" && <RosePin />}
        {art === "void-halo" && <VoidHalo />}
        {art === "eclipse-lens" && <EclipseLens />}
        {art === "vow-core" && <VowCore />}
        {art === "broken-halo" && <BrokenHalo />}
        {art === "star-bobber" && <StarBobber />}
        {art === "mercy-wave" && <MercyWave />}
        {art === "pocket-star" && <PocketStar />}
        {art === "glassfin" && <Glassfin />}
        {art === "fishpedia" && <Fishpedia />}
        {art === "century-chain" && <CenturyChain />}
      </g>
      <RarityPips rarity={charm?.rarity} fill={rarityAccent} />
    </svg>
  );
}

function RarityPips({ rarity, fill }) {
  const count = { common: 1, uncommon: 2, rare: 3, epic: 4, mythic: 5 }[rarity] || 1;
  const start = 48 - ((count - 1) * 4);
  return Array.from({ length: count }, (_, index) => (
    <circle key={index} cx={start + index * 8} cy="82" r="2.5" fill={fill} stroke={OUTLINE} strokeWidth="1.5" />
  ));
}

function ThreadSpool() { return <><path fill={CORAL} d="M31 28h34l-5 12v27l5 6H31l5-6V40l-5-12Z" /><path fill={CREAM} d="M36 43h24v20H36z" /><path fill="none" d="m38 47 20 12m-20-4 13 8" /></>; }
function WaxSeal() { return <><path fill={ROSE} d="m48 25 8 6 10-1 1 10 7 8-7 8-1 10-10-1-8 6-8-6-10 1-1-10-7-8 7-8 1-10 10 1 8-6Z" /><path fill={GOLD} d="m48 37 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" /></>; }
function IronRing() { return <><circle cx="48" cy="50" r="24" fill={INK} /><circle cx="48" cy="50" r="12" fill={CREAM} /><path fill={SKY} d="m38 24 10-8 10 8-10 10-10-10Z" /></>; }
function SmokeRibbon() { return <><path fill={LILAC} d="M18 38c15-15 30-12 40 0 8 9 15 8 21 1-2 15-12 21-23 15-11-7-21-7-31 3l3-12-10-7Z" /><path fill={SKY} d="m43 54 14 0-3 22-8-8-9 7 6-21Z" /></>; }
function MoonChain() { return <><path fill="none" d="M25 30c8-7 20-5 25 4l7 12M71 66c-8 7-20 5-25-4l-7-12" /><path fill={SKY} d="M57 24c10 2 16 11 14 21-2 8-8 14-16 15 5-5 7-11 5-18-2-7-7-12-14-14 3-3 7-4 11-4Z" /></>; }
function LeafKnot() { return <><path fill={MINT} d="M26 28c20 1 27 12 22 31-18-1-28-12-22-31Z" /><path fill={TEAL} d="M70 29c-20 1-27 12-22 31 18-1 28-12 22-31Z" /><path fill="none" d="M34 38c11 12 17 24 14 36m14-36C51 50 45 62 48 74" /></>; }
function StaticSigil() { return <><path fill={LILAC} d="m48 18 28 17-5 33-23 12-23-12-5-33 28-17Z" /><path fill={SKY} d="m48 31 9 15-9 17-9-17 9-15Z" /><path fill="none" d="m27 35 12 11-13 9m43-20L57 46l13 9" /></>; }
function BlueEmber() { return <><path fill={SKY} d="M48 18c2 15 18 20 17 37-1 14-9 22-18 22-11 0-20-9-19-22 1-14 11-24 20-37Z" /><path fill={TEAL} d="M50 43c7 9 8 16 1 23-7 1-12-5-11-12 1-5 5-8 10-11Z" /></>; }
function StarShard() { return <><path fill={SKY} d="m37 18 30 15-8 41-25-9-5-29 8-18Z" /><path fill={LILAC} d="m48 28 11 45-25-8 14-37Z" /><path fill={GOLD} d="m70 18 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /></>; }
function HollowBell() { return <><path fill={GOLD} d="M48 22c15 0 23 11 23 27v13l7 9H18l7-9V49c0-16 8-27 23-27Z" /><path fill={INK} d="M39 70h18c-1 7-4 10-9 10s-8-3-9-10Z" /><path fill={CORAL} d="M41 17h14v9H41z" /></>; }
function MirrorThorn() { return <><path fill={SKY} d="m48 16 14 24-7 37-14-25 7-36Z" /><path fill={LILAC} d="M41 52 23 63l21 4m14-18 17-11-5 21" /><path fill={CREAM} d="m49 27 5 14-8 16-4-14 7-16Z" /></>; }
function RosePin() { return <><path fill={MINT} d="m49 57 20 16M51 59c13 0 21-6 24-17-12 0-21 5-24 17Z" /><path fill={ROSE} d="M48 23c7-9 18-2 14 7 10-3 15 9 7 15 9 5 3 17-7 14-2 10-15 10-18 1-8 6-17-3-12-12-10-1-10-14 1-16-5-9 7-16 15-9Z" /><circle cx="48" cy="40" r="8" fill={CORAL} /></>; }
function VoidHalo() { return <><path fill={INK} d="M48 18c18 0 31 13 31 30 0 18-13 30-31 30-9 0-17-3-23-9l11-11c3 3 7 5 12 5 9 0 15-6 15-15 0-8-6-15-15-15-5 0-9 2-12 6L24 29c6-7 14-11 24-11Z" /><path fill={LILAC} d="m22 25 5 7 9 1-7 6 2 9-9-5-8 5 2-9-7-6 9-1 4-7Z" /></>; }
function EclipseLens() { return <><circle cx="44" cy="44" r="24" fill={LILAC} /><path fill={INK} d="M44 20a24 24 0 1 1-17 41 26 26 0 0 0 17-41Z" /><path fill={GOLD} d="m60 60 19 19-8 6-18-20 7-5Z" /></>; }
function VowCore() { return <><path fill={INK} d="m48 16 25 16 7 29-32 20-32-20 7-29 25-16Z" /><path fill={SKY} d="m48 29 15 11-5 25-10 7-10-7-5-25 15-11Z" /><path fill={GOLD} d="m48 40 7 9-7 11-7-11 7-9Z" /></>; }
function BrokenHalo() { return <><path fill={GOLD} d="M19 53c-3-20 9-34 28-35l2 15c-10 0-16 8-15 18l-15 2Zm30-35c18 0 30 11 31 27l-15 2c-1-8-6-14-15-14l-1-15Zm28 38c-3 14-13 22-28 22V63c7 0 12-4 14-10l14 3Z" /><path fill={CORAL} d="m24 61 10-8 4 14-14-6Zm50-15 8 10-14 4 6-14Z" /></>; }
function StarBobber() { return <><path fill="none" d="M55 17c13 6 17 16 12 29" /><path fill={CORAL} d="M29 52c0-12 8-21 19-21s19 9 19 21H29Z" /><path fill={CREAM} d="M29 52h38c0 13-8 22-19 22s-19-9-19-22Z" /><path fill={GOLD} d="m48 38 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" /></>; }
function MercyWave() { return <><path fill={SKY} d="M17 60c13-18 26-20 39-6 8 8 16 8 24-1-2 16-11 25-25 22-13-3-22-13-38-15Z" /><path fill={TEAL} d="M24 48c10-14 21-14 31-2-11-4-21-3-31 2Z" /><path fill={GOLD} d="M67 22c9 12 10 21 1 29-9-7-10-16-1-29Z" /></>; }
function PocketStar() { return <><path fill={SKY} d="M29 37h38l5 35H24l5-35Z" /><path fill={CORAL} d="M32 25h32v14H32z" /><path fill={GOLD} d="m48 42 5 10 11 2-8 7 2 10-10-5-10 5 2-10-8-7 11-2 5-10Z" /></>; }
function Glassfin() { return <><path fill={SKY} d="M19 49c17-22 39-24 55-7l12-12-2 21 2 20-12-11c-17 17-39 14-55-11Z" /><path fill={LILAC} d="m41 38 12-14 9 17-21-3Zm2 23 12 12 7-16-19 4Z" /><path fill="none" d="m30 48 10-6 9 6 10-6 12 7-12 7-10-6-10 6-9-8Z" /></>; }
function Fishpedia() { return <><path fill={TEAL} d="M22 25c12-5 22-3 29 4v46c-8-6-17-8-29-3V25Z" /><path fill={SKY} d="M74 25c-12-5-22-3-29 4v46c8-6 17-8 29-3V25Z" /><path fill={GOLD} d="M47 39c8-9 18-9 25 0-8 10-18 10-25 0Zm5 0 5-6v12l-5-6Z" /></>; }
function CenturyChain() { return <><path fill="none" d="M23 39c0-10 8-18 18-18s18 8 18 18-8 18-18 18h-9m41 0c0 10-8 18-18 18s-18-8-18-18 8-18 18-18h9" /><path fill={GOLD} d="m48 42 6 6-6 6-6-6 6-6Z" /></>; }
