export const ROLE_VALUES = {
  admin:   "admin",
  leadMod: "lead_mod",
  mod:     "mod",
  favored: "favored",
  creator: "creator",
  foxfam:  "foxfam",
  verified:"verified",
  user:    "user",
  guest:   "guest",
};

export const ROLE_LABELS = {
  [ROLE_VALUES.admin]:   "Admin",
  [ROLE_VALUES.leadMod]: "Lead Mod",
  [ROLE_VALUES.mod]:     "Mod",
  [ROLE_VALUES.favored]: "Favored",
  [ROLE_VALUES.creator]: "Creator",
  [ROLE_VALUES.foxfam]:  "Foxfam",
  [ROLE_VALUES.verified]:"Verified",
  [ROLE_VALUES.user]:    "User",
  [ROLE_VALUES.guest]:   "Guest",
};

export const ROLE_OPTIONS = [
  ROLE_VALUES.admin,
  ROLE_VALUES.leadMod,
  ROLE_VALUES.mod,
  ROLE_VALUES.favored,
  ROLE_VALUES.creator,
  ROLE_VALUES.foxfam,
  ROLE_VALUES.verified,
  ROLE_VALUES.user,
  ROLE_VALUES.guest,
];

// Map old/legacy role strings to canonical values
const LEGACY_ROLE_MAP = {
  regular:   ROLE_VALUES.user,
  viewer:    ROLE_VALUES.guest,
  vip:       ROLE_VALUES.favored,
  lead_mod:  ROLE_VALUES.leadMod,
  lead_mods: ROLE_VALUES.leadMod,
  leadmods:  ROLE_VALUES.leadMod,
};

export const ROLE_WEIGHT = {
  [ROLE_VALUES.guest]:   0,
  [ROLE_VALUES.user]:    1,
  [ROLE_VALUES.verified]:2,
  [ROLE_VALUES.foxfam]:  3,
  [ROLE_VALUES.creator]: 4,
  [ROLE_VALUES.favored]: 5,
  [ROLE_VALUES.mod]:     6,
  [ROLE_VALUES.leadMod]: 7,
  [ROLE_VALUES.admin]:   8,
};

export function normalizeRole(role) {
  const key = String(role || ROLE_VALUES.guest).trim().toLowerCase().replace(/-/g, "_");
  return LEGACY_ROLE_MAP[key] || key;
}

export function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS[ROLE_VALUES.guest];
}

export function hasRole(user, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.map(normalizeRole).includes(normalizeRole(user?.role));
}

export function hasRoleAtLeast(user, minimumRole) {
  const current = ROLE_WEIGHT[normalizeRole(user?.role)] ?? 0;
  const minimum = ROLE_WEIGHT[normalizeRole(minimumRole)] ?? 0;
  return current >= minimum;
}

export function canModerate(user) {
  return hasRoleAtLeast(user, ROLE_VALUES.mod);
}

export function canUseAdminPanel(user) {
  return canModerate(user);
}

export function canManageRoles(user) {
  return hasRole(user, ROLE_VALUES.admin);
}

export function canCreateForumThread(user) {
  return hasRoleAtLeast(user, ROLE_VALUES.foxfam);
}

export function canBookCollab(user) {
  return hasRoleAtLeast(user, ROLE_VALUES.creator) || canModerate(user);
}
