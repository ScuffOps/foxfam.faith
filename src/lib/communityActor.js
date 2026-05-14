const ACTOR_KEY = "commhub_guest_actor_id";

export function getCommunityActorKey(user) {
  if (user?.email) return user.email;
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
