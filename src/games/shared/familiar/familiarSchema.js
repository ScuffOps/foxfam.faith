import { z } from "zod";
import {
  FAMILIAR_ACCESSORIES,
  FAMILIAR_CHARM_FX,
  FAMILIAR_COATS,
  FAMILIAR_OUTFITS,
  FAMILIAR_SPECIES,
} from "./familiarCatalog.js";

const keys = (value) => Object.keys(value);
const literalUnion = (values) => z.enum(values);

export const familiarSelectionSchema = z.object({
  species: literalUnion(keys(FAMILIAR_SPECIES)),
  coat: literalUnion(keys(FAMILIAR_COATS)),
  markings: literalUnion([...new Set(Object.values(FAMILIAR_SPECIES).flatMap((species) => species.markings))]),
  outfit: literalUnion(keys(FAMILIAR_OUTFITS)),
  accessory: literalUnion(keys(FAMILIAR_ACCESSORIES)),
  charmFx: literalUnion(keys(FAMILIAR_CHARM_FX)),
}).strict().superRefine((selection, context) => {
  const species = FAMILIAR_SPECIES[selection.species];
  if (!species.coats.includes(selection.coat)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["coat"], message: "Coat is unavailable for this species." });
  }
  if (!species.markings.includes(selection.markings)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["markings"], message: "Markings are unavailable for this species." });
  }
});

export const familiarRowSchema = z.object({
  user_id: z.string().uuid(),
  species: z.string(),
  coat: z.string(),
  markings: z.string(),
  outfit: z.string(),
  accessory: z.string(),
  charm_fx: z.string(),
  catalog_version: z.literal(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).transform((row, context) => {
  const parsed = familiarSelectionSchema.safeParse({
    species: row.species,
    coat: row.coat,
    markings: row.markings,
    outfit: row.outfit,
    accessory: row.accessory,
    charmFx: row.charm_fx,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) context.addIssue(issue);
    return z.NEVER;
  }
  return { ...row, selection: parsed.data };
});
