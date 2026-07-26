import { DEFAULT_FAMILIAR } from "./familiarCatalog.js";

export function resolveVisibleFamiliar({ ownerId, loadedOwnerId, saved, guest }) {
  if (!ownerId) return guest || { ...DEFAULT_FAMILIAR };
  if (loadedOwnerId !== ownerId) return { ...DEFAULT_FAMILIAR };
  return saved || { ...DEFAULT_FAMILIAR };
}
