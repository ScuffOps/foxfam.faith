export const EXPERIENCE_PREFERENCES_KEY = "foxfam.experience-preferences.v1";
export const EXPERIENCE_PREFERENCES_EVENT = "foxfam:experience-preferences";

export const DEFAULT_EXPERIENCE_PREFERENCES = Object.freeze({
  reduceMotion: false,
  muteSounds: false,
  reduceParticles: false,
  reduceTransparency: false,
});

export function readExperiencePreferences() {
  if (typeof window === "undefined") return { ...DEFAULT_EXPERIENCE_PREFERENCES };
  try {
    const stored = JSON.parse(window.localStorage.getItem(EXPERIENCE_PREFERENCES_KEY) || "{}");
    return { ...DEFAULT_EXPERIENCE_PREFERENCES, ...stored };
  } catch {
    return { ...DEFAULT_EXPERIENCE_PREFERENCES };
  }
}

export function applyExperiencePreferences(preferences = readExperiencePreferences()) {
  if (typeof document === "undefined") return preferences;
  const root = document.documentElement;
  root.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false";
  root.dataset.muteSounds = preferences.muteSounds ? "true" : "false";
  root.dataset.reduceParticles = preferences.reduceParticles ? "true" : "false";
  root.dataset.reduceTransparency = preferences.reduceTransparency ? "true" : "false";
  return preferences;
}

export function saveExperiencePreferences(preferences) {
  const normalized = { ...DEFAULT_EXPERIENCE_PREFERENCES, ...preferences };
  window.localStorage.setItem(EXPERIENCE_PREFERENCES_KEY, JSON.stringify(normalized));
  applyExperiencePreferences(normalized);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_PREFERENCES_EVENT, { detail: normalized }));
  return normalized;
}

export function arePortalSoundsMuted() {
  return typeof document !== "undefined" && document.documentElement.dataset.muteSounds === "true";
}
