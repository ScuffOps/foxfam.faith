export const ROLE_VALUES = {
  admin: "admin",
  leadMod: "lead_mod",
  mod: "mod",
  creator: "creator",
  favored: "favored",
  regular: "regular",
  viewer: "viewer",
  guest: "guest",
};

export const ROLE_LABELS = {
  [ROLE_VALUES.admin]: "Admin",
  [ROLE_VALUES.leadMod]: "Lead Mod",
  [ROLE_VALUES.mod]: "Mod",
  [ROLE_VALUES.creator]: "Creator",
  [ROLE_VALUES.favored]: "Favored",
  [ROLE_VALUES.regular]: "Regular",
  [ROLE_VALUES.viewer]: "Viewer",
  [ROLE_VALUES.guest]: "Guest",
};

const LEGACY_ROLE_MAP = {
  user: ROLE_VALUES.regular,
  vip: ROLE_VALUES.favored,
  verified: ROLE_VALUES.regular,
  lead_mods: ROLE_VALUES.leadMod,
  leadmods: ROLE_VALUES.leadMod,
};

const ROLE_WEIGHT = {
  [ROLE_VALUES.guest]: 0,
  [ROLE_VALUES.viewer]: 1,
  [ROLE_VALUES.regular]: 2,
  [ROLE_VALUES.favored]: 3,
  [ROLE_VALUES.creator]: 4,
  [ROLE_VALUES.mod]: 5,
  [ROLE_VALUES.leadMod]: 6,
  [ROLE_VALUES.admin]: 7,
};

export function normalizeRole(role) {
  const key = String(role || ROLE_VALUES.guest).trim().toLowerCase();
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

export function canCreateForumThread(user) {
  return hasRoleAtLeast(user, ROLE_VALUES.favored);
}

export function canBookCollab(user) {
  return hasRoleAtLeast(user, ROLE_VALUES.creator) || canModerate(user);
}
