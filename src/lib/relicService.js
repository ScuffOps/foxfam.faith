import { communityClient } from "@/api/communityClient";
import { DEFAULT_RELIC, normalizeCharm, normalizeRelic, rollRelicCharm } from "@/lib/relicCharms";

export const RELIC_ROLL_LOCK_REASON = "Relic charms are locked until the MIU -> Database -> Portal -> Twitch Extension loop is ready.";

export async function getOrCreateUserRelic() {
  await communityClient.auth.me();
  const existing = await communityClient.entities.UserRelic.list("-created_date", 1);
  if (existing[0]) {
    return normalizeRelic(existing[0]);
  }

  try {
    const created = await communityClient.entities.UserRelic.create(DEFAULT_RELIC);
    return normalizeRelic(created);
  } catch {
    const retry = await communityClient.entities.UserRelic.list("-created_date", 1);
    if (retry[0]) return normalizeRelic(retry[0]);
    throw new Error("Relic could not be created.");
  }
}

export async function saveUserRelic(relic) {
  const payload = normalizeRelic(relic);
  const existing = await communityClient.entities.UserRelic.list("-created_date", 1);

  if (existing[0]) {
    const updated = await communityClient.entities.UserRelic.update(existing[0].id, payload);
    return normalizeRelic(updated);
  }

  const created = await communityClient.entities.UserRelic.create(payload);
  return normalizeRelic(created);
}

export async function loadUserRelicInventory() {
  const [relic, charmRows] = await Promise.all([
    getOrCreateUserRelic(),
    communityClient.entities.UserRelicCharm.list("-created_date", 300).catch(() => []),
  ]);

  return {
    relic,
    charms: charmRows.map(normalizeCharm),
  };
}

export async function loadCharmRollEligibility() {
  return {
    canRoll: false,
    reason: RELIC_ROLL_LOCK_REASON,
    streamState: null,
  };
}

export async function rollUserRelicCharm() {
  const eligibility = await loadCharmRollEligibility();
  if (!eligibility.canRoll) {
    throw new Error(eligibility.reason);
  }

  const rolled = rollRelicCharm();
  const created = await communityClient.entities.UserRelicCharm.create({
    ...rolled,
    instance_id: crypto.randomUUID(),
    equipped: false,
    acquired_at: new Date().toISOString(),
  });
  return normalizeCharm(created);
}

export async function setEquippedCharm(charm, charms, equipped) {
  const sameSlotEquipped = charms.filter((item) => item.equipped && item.slot === charm.slot && item.id !== charm.id);
  await Promise.all(sameSlotEquipped.map((item) => communityClient.entities.UserRelicCharm.update(item.id, { equipped: false })));
  const updated = await communityClient.entities.UserRelicCharm.update(charm.id, { equipped });

  return charms.map((item) => {
    if (item.id === updated.id) return normalizeCharm(updated);
    if (sameSlotEquipped.some((slotItem) => slotItem.id === item.id)) return { ...item, equipped: false };
    return item;
  });
}
