const OUTLINE = "#071438";
const CYAN = "#38d7ff";
const BLUE = "#2477f2";
const GOLD = "#ffd568";
const LILAC = "#b8a7ff";
const ROSE = "#ff6f9d";
const GREEN = "#6be6a6";
const SHADOW = "#102058";

const CHARM_ICON_BY_KIND = {
  wrap: "ribbon",
  seal: "seal",
  ring: "ring",
  trail: "ribbon",
  chain: "chain",
  knot: "knot",
  sigil: "sigil",
  ember: "ember",
  shard: "shard",
  bell: "bell",
  pin: "pin",
  halo: "halo",
  lens: "lens",
  core: "core",
};

export default function RelicCharmIcon({ charm, className = "h-16 w-16" }) {
  const icon = CHARM_ICON_BY_KIND[charm?.kind] || CHARM_ICON_BY_KIND[charm?.slot] || "core";

  return (
    <svg className={className} viewBox="0 0 96 96" role="img" aria-label={charm?.name || "Relic charm"}>
      <g stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
        {icon === "ember" && (
          <>
            <path fill={CYAN} d="M47 83c-18-4-28-17-27-34 1-15 11-27 28-39-2 14 5 19 14 29 9 9 12 22 5 32-4 6-11 10-20 12Z" />
            <path fill={BLUE} d="M52 76c-12-4-17-12-14-23 2-7 7-13 15-20 0 9 5 13 9 20 6 10 1 20-10 23Z" />
            <path fill={GOLD} d="M79 33l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" />
          </>
        )}
        {icon === "ribbon" && (
          <>
            <path fill={LILAC} d="M18 30c14-10 28-7 39 3l-9 18c-10-8-20-9-33-1l6-11-3-9Z" />
            <path fill={BLUE} d="M78 30c-14-10-28-7-39 3l9 18c10-8 20-9 33-1l-6-11 3-9Z" />
            <path fill={GOLD} d="M36 32h24v31H36z" />
          </>
        )}
        {icon === "seal" && (
          <>
            <path fill={ROSE} d="M27 31h42v34l-21 13-21-13V31Z" />
            <path fill={GOLD} d="M35 21h26v16H35z" />
            <path fill="none" d="M39 50h18M48 41v18" />
          </>
        )}
        {icon === "ring" && (
          <>
            <circle cx="48" cy="48" r="27" fill={GOLD} />
            <circle cx="48" cy="48" r="14" fill="#121a42" />
            <path fill={CYAN} d="M32 18l16-9 16 9-16 12-16-12Z" />
          </>
        )}
        {icon === "chain" && (
          <>
            <path fill={SHADOW} d="M25 30c7-7 18-7 25 0l5 5-11 11-5-5c-2-2-5-2-7 0s-2 5 0 7l10 10-11 11-10-10c-8-8-8-21 4-29Z" />
            <path fill={CYAN} d="M55 27l20 20c8 8 8 21 0 29s-21 8-29 0l-5-5 11-11 5 5c2 2 5 2 7 0s2-5 0-7L44 38l11-11Z" />
          </>
        )}
        {icon === "knot" && (
          <>
            <path fill={GREEN} d="M48 21c16 0 27 11 27 27S64 75 48 75 21 64 21 48s11-27 27-27Z" />
            <path fill="none" d="M31 49c13-22 30-22 34 0M31 49c14 20 29 20 34 0" />
          </>
        )}
        {icon === "sigil" && (
          <>
            <path fill={LILAC} d="M48 12l31 18v36L48 84 17 66V30l31-18Z" />
            <path fill={CYAN} d="M48 29l11 19-11 19-11-19 11-19Z" />
            <path fill="none" d="M30 48h36" />
          </>
        )}
        {icon === "shard" && (
          <>
            <path fill={BLUE} d="M31 17l34 10 10 37-27 18-27-18 10-47Z" />
            <path fill={CYAN} d="M47 21l18 43-17 12-5-53 4-2Z" />
            <path fill={GOLD} d="M77 17l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" />
          </>
        )}
        {icon === "bell" && (
          <>
            <path fill={GOLD} d="M48 18c16 0 25 11 25 28v15l8 10H15l8-10V46c0-17 9-28 25-28Z" />
            <path fill={CYAN} d="M39 71h18c-1 8-5 12-9 12s-8-4-9-12Z" />
            <path fill={SHADOW} d="M40 14h16v10H40z" />
          </>
        )}
        {icon === "pin" && (
          <>
            <path fill={ROSE} d="M48 13l13 22 25 5-17 19 3 25-24-10-24 10 3-25-17-19 25-5 13-22Z" />
            <path fill={GOLD} d="M48 34l6 12 13 3-9 9 2 13-12-6-12 6 2-13-9-9 13-3 6-12Z" />
          </>
        )}
        {icon === "halo" && (
          <>
            <circle cx="48" cy="48" r="31" fill="none" />
            <path fill={LILAC} d="M48 18a30 30 0 1 1-23 49l12-10a14 14 0 1 0 19-21l9-13c-5-3-11-5-17-5Z" />
            <path fill={CYAN} d="M24 29l8 4-8 4-4 8-4-8-8-4 8-4 4-8 4 8Z" />
          </>
        )}
        {icon === "lens" && (
          <>
            <circle cx="43" cy="43" r="27" fill={LILAC} />
            <path fill={CYAN} d="M28 43a15 15 0 1 0 30 0 15 15 0 0 0-30 0Z" />
            <path fill={GOLD} d="M62 62l18 18" />
          </>
        )}
        {icon === "core" && (
          <>
            <path fill={SHADOW} d="M48 11l30 20v34L48 85 18 65V31l30-20Z" />
            <path fill={CYAN} d="M48 26l16 11v22L48 70 32 59V37l16-11Z" />
            <path fill={GOLD} d="M48 37l8 11-8 11-8-11 8-11Z" />
          </>
        )}
      </g>
    </svg>
  );
}
