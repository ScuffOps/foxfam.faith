import { z } from "zod";

export const raritySchema = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "mythic",
]);
export type Rarity = z.infer<typeof raritySchema>;
export const resultSchema = z.object({
  rollId: z.string().min(1).max(100),
  charm: z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    rarity: raritySchema,
    description: z.string().max(355),
    art: z.enum(["crystal", "tenko", "geas"]),
  }),
});
export type RollResult = z.infer<typeof resultSchema>;
export interface RollRequest {
  requestId: string;
  signal: AbortSignal;
}
export type RollProvider = (request: RollRequest) => Promise<unknown>;
export type Phase = "idle" | "pending" | "reveal" | "complete" | "error";
export const RARITIES = {
  common: {
    stars: 1,
    label: "Common",
    color: "#9ed6d8",
    family: "ordinary",
    frames: 210,
  },
  uncommon: {
    stars: 2,
    label: "Uncommon",
    color: "#a5e1aa",
    family: "ordinary",
    frames: 210,
  },
  rare: {
    stars: 3,
    label: "Rare",
    color: "#73dbfa",
    family: "ordinary",
    frames: 210,
  },
  epic: {
    stars: 4,
    label: "Epic",
    color: "#d0b2ff",
    family: "epic",
    frames: 240,
  },
  mythic: {
    stars: 5,
    label: "Mythic",
    color: "#ffdb83",
    family: "mythic",
    frames: 270,
  },
} as const;

export const FLAVOR = [
  "You feel the Aether of the multiverse swim beneath your skin as you pull the lever.",
  "You take a breath, pray you don't break Time on this pull, and ratchet the handle downwards.",
  "Somewhere, a clock forgets what comes next. The Aether remembers you instead.",
  "You borrow a moment from tomorrow. Something small and impossible answers.",
  "The handle is warm. The silence is listening. You give Time a gentle nudge.",
];
export const clamp = (n: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n));
export function dragProgress(start: number, current: number, height: number) {
  return clamp((current - start) / Math.max(64, height * 0.14));
}
export function chooseFlavor(random: number, previous: number) {
  const index = Math.floor(clamp(random, 0, 0.99999) * FLAVOR.length);
  return index === previous ? (index + 1) % FLAVOR.length : index;
}

// The request key survives timeouts/retries. A real adapter must use this key
// for a server-side idempotent roll; presentation never chooses or charges rewards.
export class RollSession {
  private key = "";
  private pending = false;
  get requestId() {
    return this.key;
  }
  async request(
    provider: RollProvider,
    signal: AbortSignal,
  ): Promise<RollResult> {
    if (this.pending) throw new Error("A pull is already in progress.");
    this.pending = true;
    this.key ||= crypto.randomUUID();
    try {
      return resultSchema.parse(
        await provider({ requestId: this.key, signal }),
      );
    } finally {
      this.pending = false;
    }
  }
  next() {
    if (!this.pending) this.key = "";
  }
}

export function demoResult(rarity: Rarity, rollId = "preview"): RollResult {
  const art = rarity === "epic" ? "tenko" : "crystal";
  return {
    rollId,
    charm: {
      id: `preview-${rarity}`,
      rarity,
      art,
      name:
        rarity === "mythic"
          ? "Veri's Last Word"
          : rarity === "epic"
            ? "Tenko Echo"
            : "Borrowed Starlight",
      description:
        rarity === "mythic"
          ? "Time may wander. This promise knows the way home."
          : rarity === "epic"
            ? "A little flame carrying the warmth of a moment that has not happened yet."
            : "A quiet fragment of tomorrow, caught between the hands of a clock.",
    },
  };
}

export interface MotionState {
  hour: number;
  minute: number;
  seal: number;
  burst: number;
  lift: number;
  reward: number;
  lever: number;
}
export function motionAt(
  frame: number,
  rarity: Rarity,
  reduced = false,
): MotionState {
  const revealAt = rarity === "mythic" ? 150 : rarity === "epic" ? 126 : 102;
  const progress = clamp(frame / (revealAt - 12));
  const ease =
    progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  const emergence = clamp((frame - revealAt) / 30);
  const lift = 1 - (1 - emergence) ** 3;
  return {
    hour: reduced ? -35 : -35 - 1080 * ease,
    minute: reduced ? 65 : 65 + 2160 * ease,
    seal:
      clamp((frame - revealAt + 45) / 18) *
      (1 - clamp((frame - revealAt - 15) / 36)),
    burst: reduced ? 0 : Math.sin(clamp((frame - revealAt) / 42) * Math.PI),
    lift,
    reward: clamp((frame - revealAt) / (reduced ? 15 : 8)),
    lever: clamp(frame / 14) * (1 - clamp((frame - 26) / 24)),
  };
}
