const GUEST_PROFILE_KEY = "commhub_guest_profile";
const LOCAL_AVATAR_KEY = "commhub_user_avatar";

export function getGuestProfile() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getPublicDisplayName(user, fallback = "Guest") {
  const guest = getGuestProfile();
  return (
    user?.twitch_display_name ||
    user?.display_name ||
    user?.username ||
    guest?.name ||
    (user?.email ? user.email.split("@")[0] : "") ||
    fallback
  );
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
