import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { motionAt, RARITIES, type Phase, type RollResult } from "./domain";

export interface SceneProps extends Record<string, unknown> {
  phase: Phase;
  result: RollResult;
  reducedMotion: boolean;
  progress: number;
  transparent?: boolean;
  includeAudio?: boolean;
  showReward?: boolean;
}
const art = (name: string) => staticFile(`art/${name}.png`);

export function ClockScene({
  phase,
  result,
  reducedMotion,
  progress,
  transparent = false,
  includeAudio = false,
  showReward = true,
}: SceneProps) {
  const frame = useCurrentFrame();
  const meta = RARITIES[result.charm.rarity];
  const m = motionAt(
    phase === "complete" ? meta.frames - 1 : frame,
    result.charm.rarity,
    reducedMotion,
  );
  const active = phase === "reveal" || phase === "complete";
  const wait = phase === "pending" && !reducedMotion;
  const hour = active ? m.hour : -35 + (wait ? frame * 0.35 : 0);
  const minute = active ? m.minute : 65 - (wait ? frame * 0.65 : 0);
  const lever = active ? m.lever : progress;
  const glow = active ? m.seal : 0;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: transparent ? "transparent" : "#060d20",
        overflow: "hidden",
      }}
    >
      {!transparent && (
        <Img
          src={art("clock-floor")}
          style={{ width: "100%", height: "100%" }}
        />
      )}
      {includeAudio && phase === "reveal" && (
        <Audio src={staticFile(`audio/${meta.family}.wav`)} volume={0.5} />
      )}
      <svg
        viewBox="0 0 1500 1050"
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <clipPath id="reward-emergence">
            <rect x="400" y="0" width="700" height="605" />
          </clipPath>
        </defs>
        {/* Rotation happens in the circular floor plane before projection. All
          hands, the gear and the lever share this exact (750, 597) origin. */}
        <g transform="translate(750 597) scale(1 .43)" data-layer="clock-plane">
          {active && !reducedMotion && (
            <g opacity={m.burst * 0.8}>
              <circle
                r={90 + m.lift * 410}
                fill="none"
                stroke={meta.color}
                strokeWidth="4"
              />
              <circle
                r={40 + m.lift * 320}
                fill="none"
                stroke={meta.color}
                strokeWidth="2"
                strokeDasharray="12 22"
              />
            </g>
          )}
          <g transform={`rotate(${hour})`} data-layer="hour-hand">
            <path
              d="M-17 46 L-17-257 L0-325 L17-257 L17 46 Z"
              fill="#f2bf50"
              stroke="#091330"
              strokeWidth="9"
              strokeLinejoin="round"
            />
            <path d="M0-301 L0 25 L-9 25 L-9-255Z" fill="#fff0ad" />
          </g>
          <g transform={`rotate(${minute})`} data-layer="minute-hand">
            <path
              d="M-10 65 L-10-357 L0-425 L10-357 L10 65 Z"
              fill="#3acdf2"
              stroke="#091330"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            <path d="M0-405 L0 50" stroke="#d6fbff" strokeWidth="4" />
          </g>
        </g>
        <g transform="translate(750 597)" data-layer="axle">
          <ellipse cy="18" rx="98" ry="46" fill="#040a19" />
          <g transform="scale(1 .6)">
            <circle r="97" fill="#1d4797" stroke="#081431" strokeWidth="12" />
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                transform={`rotate(${i * 30})`}
                d="M-12-91 L-12-108 L12-108 L12-91"
                fill="#397bec"
                stroke="#081431"
                strokeWidth="6"
              />
            ))}
            <circle r="76" fill="#07152e" stroke="#eeb945" strokeWidth="12" />
            <circle
              r="52"
              fill="none"
              stroke="#3acdf2"
              strokeWidth="5"
              strokeDasharray="7 15"
            />
          </g>
          <path
            d="M-34-22 L-34-103 L0-172 L34-103 L34-22"
            fill="#0e3678"
            stroke="#081431"
            strokeWidth="9"
            strokeLinejoin="round"
          />
          <path d="M0-158 L-24-99 L-24-42 L0-50Z" fill="#3bd2f3" />
          <path d="M0-158 L0-50 L23-42 L23-99Z" fill="#1763d8" />
          <path d="M0-158 L-24-99 L-17-76Z" fill="#e6ffff" />
          <g transform={`rotate(${lever * 62})`} data-layer="lever">
            <path
              d="M0 0 L-66-114"
              stroke="#081431"
              strokeWidth="25"
              strokeLinecap="round"
            />
            <path
              d="M0 0 L-66-114"
              stroke="#f6c354"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path d="M-4-1 L-70-115" stroke="#fff0af" strokeWidth="4" />
            <rect
              x="-101"
              y="-172"
              width="58"
              height="80"
              rx="25"
              fill="#2467d6"
              stroke="#081431"
              strokeWidth="9"
              transform="rotate(-30 -70 -131)"
            />
            <path
              d="M-95-147 Q-89-168-74-165 L-58-121 Q-68-104-78-119Z"
              fill="#63deff"
            />
          </g>
          <ellipse
            rx="25"
            ry="20"
            fill="#f3ce65"
            stroke="#081431"
            strokeWidth="8"
          />
          <ellipse rx="11" ry="9" fill="#e7fbff" />
        </g>
        {active && showReward && (
          <g clipPath="url(#reward-emergence)" data-layer="reward">
            <g
              transform={`translate(750 ${597 - m.lift * 310}) scale(${0.12 + 0.88 * m.lift})`}
              opacity={m.reward}
            >
              <image
                href={art(
                  result.charm.art === "geas" ? "eye-geas" : result.charm.art,
                )}
                x="-140"
                y="-145"
                width="280"
                height="280"
              />
            </g>
          </g>
        )}
        {active && !reducedMotion && (
          <g fill={meta.color} opacity={m.burst} data-layer="reveal-rays">
            {Array.from(
              { length: result.charm.rarity === "mythic" ? 12 : 6 },
              (_, i) => {
                const angle =
                  (i * Math.PI) / (result.charm.rarity === "mythic" ? 6 : 3);
                const radius = 100 + m.lift * 200;
                const x = 750 + Math.cos(angle) * radius,
                  y = 310 + Math.sin(angle) * radius * 0.6;
                return (
                  <path
                    key={i}
                    d={`M${x} ${y - 10} l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3Z`}
                  />
                );
              },
            )}
          </g>
        )}
      </svg>
      {active && (
        <Img
          src={art(result.charm.rarity === "mythic" ? "eye-geas" : "tenko")}
          style={{
            position: "absolute",
            width: "24%",
            height: "34.3%",
            objectFit: "contain",
            left: "38%",
            top: "7%",
            opacity: glow * 0.85,
            scale: reducedMotion ? 1 : 0.85 + glow * 0.15,
            mixBlendMode: "screen",
          }}
        />
      )}
    </AbsoluteFill>
  );
}
