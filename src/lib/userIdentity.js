const GUEST_PROFILE_KEY = "commhub_guest_profile";
const LOCAL_AVATAR_KEY = "commhub_user_avatar";

export function getGuestProfile() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function cleanName(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "";
}

export function getPublicDisplayName(user, fallback = "Guest") {
  const guest = getGuestProfile();
  return cleanName(user?.twitch_display_name)
    || cleanName(user?.display_name)
    || cleanName(user?.username)
    || cleanName(user?.user_metadata?.user_name)
    || cleanName(user?.user_metadata?.preferred_username)
    || cleanName(user?.user_metadata?.name)
    || cleanName(guest?.name)
    || cleanName(fallback)
    || "Guest";
}

export function getPublicAvatar(user) {
  return user?.avatar_url || localStorage.getItem(LOCAL_AVATAR_KEY) || "";
}

export function getInitials(name) {
  return String(name || "Guest")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "G";
}
