import { Link } from "react-router-dom";
import { Coffee, Fish, Gem, Hammer, Library, Search, Sparkles, Timer, Type, UserCircle2 } from "lucide-react";
import { GAME_WORLD_KEYS, HUB_UNLOCK_STATES } from "@/lib/gameHubCatalog";

const STATIONS = [
  {
    key: "profile-relic",
    label: "Profile Relic",
    route: "/profile",
    icon: UserCircle2,
    className: "left-[9%] top-[17%]",
    tone: "sky",
  },
  {
    key: "forge",
    label: "Relic Forge",
    route: "/relic-forge",
    icon: Hammer,
    className: "right-[13%] top-[18%]",
    tone: "amber",
  },
  {
    key: "reliquary",
    label: "Reliquary",
    route: "/reliquary",
    icon: Library,
    className: "left-[12%] bottom-[19%]",
    tone: "violet",
  },
  {
    key: GAME_WORLD_KEYS.starfishing,
    label: "Starfishing",
    icon: Fish,
    className: "right-[11%] bottom-[18%]",
    tone: "cyan",
  },
  {
    key: GAME_WORLD_KEYS.matchMerge,
    label: "Merge Bench",
    icon: Gem,
    className: "left-[42%] top-[22%]",
    tone: "emerald",
  },
  {
    key: GAME_WORLD_KEYS.bobaCafe,
    label: "Boba Cafe",
    icon: Coffee,
    className: "left-[34%] bottom-[10%]",
    tone: "rose",
  },
  {
    key: GAME_WORLD_KEYS.puzzleCat,
    label: "Find Vezmir",
    icon: Search,
    className: "right-[34%] bottom-[10%]",
    tone: "mint",
  },
  {
    key: GAME_WORLD_KEYS.timeRunner,
    label: "Clocktower",
    icon: Timer,
    className: "right-[43%] top-[8%]",
    tone: "gold",
  },
  {
    key: GAME_WORLD_KEYS.communityWordle,
    label: "Wordle Chapel",
    icon: Type,
    className: "left-[48%] bottom-[28%]",
    tone: "indigo",
  },
];

const TONE_CLASSES = {
  amber: "border-amber-200/40 bg-amber-200/14 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.10)]",
  cyan: "border-cyan-200/40 bg-cyan-200/14 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.10)]",
  emerald: "border-emerald-200/40 bg-emerald-200/14 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.10)]",
  gold: "border-yellow-200/40 bg-yellow-200/14 text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.10)]",
  indigo: "border-indigo-200/40 bg-indigo-200/14 text-indigo-100 shadow-[0_0_24px_rgba(129,140,248,0.10)]",
  mint: "border-teal-200/40 bg-teal-200/14 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,0.10)]",
  rose: "border-rose-200/40 bg-rose-200/14 text-rose-100 shadow-[0_0_24px_rgba(251,113,133,0.10)]",
  sky: "border-sky-200/40 bg-sky-200/14 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.10)]",
  violet: "border-violet-200/40 bg-violet-200/14 text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.10)]",
};

function isStationOpen(station, worldByKey) {
  if (station.route) return true;
  return worldByKey[station.key]?.status === HUB_UNLOCK_STATES.open;
}

export default function QuartersScene({ worlds = [] }) {
  const worldByKey = worlds.reduce((items, world) => ({ ...items, [world.key]: world }), {});

  return (
    <section className="foxcard relative min-h-[32rem] overflow-hidden rounded-xl p-0" aria-labelledby="quarters-scene-heading">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(125,211,252,0.16),transparent_34%),linear-gradient(145deg,rgba(19,26,51,0.98),rgba(7,9,21,0.98)_60%,rgba(25,17,40,0.98))]" />
      <div className="absolute inset-x-8 top-8 h-24 rounded-[50%] border border-cyan-200/10 bg-cyan-100/5 blur-[1px]" aria-hidden="true" />
      <div className="absolute left-1/2 top-28 h-[15rem] w-[30rem] max-w-[72vw] -translate-x-1/2 rotate-45 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(127,93,68,0.22),rgba(49,36,54,0.34))] shadow-[inset_0_0_45px_rgba(0,0,0,0.24)]" aria-hidden="true" />
      <div className="absolute left-1/2 top-[11.25rem] h-[9rem] w-[18rem] max-w-[50vw] -translate-x-1/2 rotate-45 rounded-[1.3rem] border border-amber-100/12 bg-[linear-gradient(135deg,rgba(245,213,151,0.08),rgba(125,211,252,0.07))]" aria-hidden="true" />

      <div className="absolute left-1/2 top-[40%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-100/25 bg-cyan-100/12 text-cyan-100 shadow-[0_0_38px_rgba(34,211,238,0.14)]">
          <Sparkles className="h-7 w-7" />
        </span>
        <h2 id="quarters-scene-heading" className="mt-3 font-heading text-xl font-bold text-white">
          Shrine Quarters
        </h2>
        <p className="mt-1 max-w-[18rem] text-xs leading-5 text-white/62">
          A quiet room for charms, trophies, and every tiny portal victory.
        </p>
      </div>

      <img
        src="/assets/lantern-altar.png"
        alt=""
        className="absolute bottom-7 left-1/2 z-10 h-20 w-20 -translate-x-1/2 object-contain opacity-90 drop-shadow-[0_0_22px_rgba(125,211,252,0.22)]"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-20">
        {STATIONS.map((station) => {
          const Icon = station.icon;
          const open = isStationOpen(station, worldByKey);
          const className = `absolute ${station.className} hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex ${TONE_CLASSES[station.tone] || TONE_CLASSES.sky}`;

          if (open) {
            const route = station.route || worldByKey[station.key]?.route || "/quarters";
            return (
              <Link key={station.key} to={route} className={`${className} hover:scale-[1.06]`} aria-label={station.label} title={station.label}>
                <Icon className="h-5 w-5" />
                <span className="sr-only">{station.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={station.key}
              type="button"
              disabled
              className={`${className} cursor-not-allowed opacity-55`}
              aria-label={`${station.label} is coming soon`}
              title={`${station.label} is coming soon`}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{station.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative z-30 mt-[25rem] grid gap-2 p-4 sm:hidden">
        {STATIONS.map((station) => {
          const Icon = station.icon;
          const open = isStationOpen(station, worldByKey);
          const label = (
            <>
              <Icon className="h-4 w-4" />
              <span>{station.label}</span>
            </>
          );

          if (open) {
            const route = station.route || worldByKey[station.key]?.route || "/quarters";
            return (
              <Link
                key={station.key}
                to={route}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold ${TONE_CLASSES[station.tone] || TONE_CLASSES.sky}`}
              >
                {label}
              </Link>
            );
          }

          return (
            <button
              key={station.key}
              type="button"
              disabled
              className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold opacity-55 ${TONE_CLASSES[station.tone] || TONE_CLASSES.sky}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
