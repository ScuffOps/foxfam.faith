import { z } from "zod";

export const QUARTERS_DECOR_SLOTS = Object.freeze([
  {
    key: "rug",
    label: "Center rug",
    options: [
      { key: "moonweave-rug", label: "Moonweave", palette: "blue" },
      { key: "petal-rug", label: "Petal Quilt", palette: "rose" },
      { key: "moss-rug", label: "Moss Garden", palette: "sage" },
    ],
  },
  {
    key: "wall",
    label: "Wall hanging",
    options: [
      { key: "crescent-banner", label: "Crescent Banner", palette: "blue" },
      { key: "bloom-banner", label: "Bloom Banner", palette: "rose" },
      { key: "clock-banner", label: "Clock Banner", palette: "gold" },
    ],
  },
  {
    key: "shelf",
    label: "Shelf display",
    options: [
      { key: "star-lantern", label: "Star Lantern", palette: "gold" },
      { key: "fish-keepsake", label: "Starfish Keepsake", palette: "blue" },
      { key: "bloom-vase", label: "Bloom Vase", palette: "rose" },
    ],
  },
  {
    key: "nook",
    label: "Familiar nook",
    options: [
      { key: "moon-cushion", label: "Moon Cushion", palette: "blue" },
      { key: "petal-cushion", label: "Petal Cushion", palette: "rose" },
      { key: "moss-basket", label: "Moss Basket", palette: "sage" },
    ],
  },
]);

const optionKeysBySlot = Object.fromEntries(
  QUARTERS_DECOR_SLOTS.map((slot) => [slot.key, slot.options.map((option) => option.key)]),
);

export const DEFAULT_QUARTERS_DECOR = Object.freeze({
  rug: "moonweave-rug",
  wall: "crescent-banner",
  shelf: "star-lantern",
  nook: "moon-cushion",
});

export const quartersDecorLayoutSchema = z.object({
  rug: z.enum(optionKeysBySlot.rug),
  wall: z.enum(optionKeysBySlot.wall),
  shelf: z.enum(optionKeysBySlot.shelf),
  nook: z.enum(optionKeysBySlot.nook),
}).strict();

export const quartersDecorRowSchema = z.object({
  user_id: z.string().uuid(),
  rug_key: z.enum(optionKeysBySlot.rug),
  wall_key: z.enum(optionKeysBySlot.wall),
  shelf_key: z.enum(optionKeysBySlot.shelf),
  nook_key: z.enum(optionKeysBySlot.nook),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strict();

export function normalizeQuartersDecor(value) {
  const result = quartersDecorLayoutSchema.safeParse(value);
  return result.success ? result.data : { ...DEFAULT_QUARTERS_DECOR };
}

export function decorLayoutFromRow(row) {
  const parsed = quartersDecorRowSchema.parse(row);
  return {
    rug: parsed.rug_key,
    wall: parsed.wall_key,
    shelf: parsed.shelf_key,
    nook: parsed.nook_key,
  };
}

export function decorRowFromLayout(layout) {
  const parsed = quartersDecorLayoutSchema.parse(layout);
  return {
    rug_key: parsed.rug,
    wall_key: parsed.wall,
    shelf_key: parsed.shelf,
    nook_key: parsed.nook,
  };
}
