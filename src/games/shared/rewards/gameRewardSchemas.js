import { z } from "zod";

export const rewardItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().min(1),
  type: z.enum(["material", "charm", "trophy", "collectible"]),
});

export const gameRewardIntentSchema = z.object({
  gameKey: z.string().min(1),
  eventId: z.string().min(8),
  eventType: z.string().min(1),
  score: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  favorPreview: z.number().int().min(0),
  items: z.array(rewardItemSchema).default([]),
  achievementKeys: z.array(z.string().min(1)).default([]),
  duplicatePolicy: z.enum(["none", "keep", "release", "convert"]).default("none"),
  createdAt: z.string().datetime(),
});

export function parseGameRewardIntent(intent) {
  return gameRewardIntentSchema.parse(intent);
}
