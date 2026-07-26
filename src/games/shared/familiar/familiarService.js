import { supabase } from "../../../api/communityClient.js";
import { DEFAULT_FAMILIAR } from "./familiarCatalog.js";
import { familiarRowSchema, familiarSelectionSchema } from "./familiarSchema.js";

export const GUEST_FAMILIAR_STORAGE_KEY = "foxfam:familiar:guest-preview:v1";
const FAMILIAR_SELECT = "user_id,species,coat,markings,outfit,accessory,charm_fx,catalog_version,created_at,updated_at";

function requireClient(client) {
  if (!client?.auth?.getUser || !client?.from) {
    throw new Error("Familiar persistence is unavailable.");
  }
  return client;
}

async function requireOwnerId(client) {
  const { data, error } = await requireClient(client).auth.getUser();
  if (error) throw new Error("Your familiar session could not be verified.", { cause: error });
  if (!data?.user?.id) throw new Error("Sign in to save this familiar.");
  return data.user.id;
}

function parseOwnedRow(row, ownerId) {
  const parsed = familiarRowSchema.safeParse(row);
  if (!parsed.success) throw new Error("The saved familiar record is invalid.", { cause: parsed.error });
  if (parsed.data.user_id !== ownerId) throw new Error("Familiar ownership verification failed.");
  return parsed.data.selection;
}

export async function loadFamiliar(client = supabase) {
  const ownerId = await requireOwnerId(client);
  const { data, error } = await client
    .from("user_familiars")
    .select(FAMILIAR_SELECT)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("Your familiar could not be loaded.", { cause: error });
  return data ? parseOwnedRow(data, ownerId) : { ...DEFAULT_FAMILIAR };
}

export async function saveFamiliar(selection, client = supabase) {
  const ownerId = await requireOwnerId(client);
  const familiar = familiarSelectionSchema.parse(selection);
  const payload = {
    species: familiar.species,
    coat: familiar.coat,
    markings: familiar.markings,
    outfit: familiar.outfit,
    accessory: familiar.accessory,
    charm_fx: familiar.charmFx,
    catalog_version: 1,
  };
  const { data, error } = await client
    .from("user_familiars")
    .upsert(payload, { onConflict: "user_id" })
    .select(FAMILIAR_SELECT)
    .single();
  if (error) throw new Error("Your familiar could not be saved.", { cause: error });
  return parseOwnedRow(data, ownerId);
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function loadGuestFamiliar(storage = browserStorage()) {
  if (!storage) return { ...DEFAULT_FAMILIAR };
  try {
    const parsed = familiarSelectionSchema.safeParse(JSON.parse(storage.getItem(GUEST_FAMILIAR_STORAGE_KEY) || "null"));
    return parsed.success ? parsed.data : { ...DEFAULT_FAMILIAR };
  } catch {
    return { ...DEFAULT_FAMILIAR };
  }
}

export function saveGuestFamiliar(selection, storage = browserStorage()) {
  const familiar = familiarSelectionSchema.parse(selection);
  if (storage) storage.setItem(GUEST_FAMILIAR_STORAGE_KEY, JSON.stringify(familiar));
  return familiar;
}
