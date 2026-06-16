const ACTOR_KEY = "commhub_guest_actor_id";

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value || "").trim().toLowerCase();
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getCommunityActorKey(user) {
  if (user?.id) return `user:${user.id}`;
  if (user?.email) return `user:${stableHash(user.email)}`;
  if (typeof window === "undefined") return "guest:server";

  let id = localStorage.getItem(ACTOR_KEY);
  if (!id) {
    const randomId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    id = `guest:${randomId}`;
    localStorage.setItem(ACTOR_KEY, id);
  }
  return id;
}

export function isGuestActor(actorKey) {
  return String(actorKey || "").startsWith("guest:");
}

export function getPrivateUserKey(user) {
  if (user?.id) return `user:${user.id}`;
  if (user?.email) return `user:${stableHash(user.email)}`;
  return "";
}
