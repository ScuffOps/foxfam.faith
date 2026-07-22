import { useEffect, useState } from "react";
import {
  EXPERIENCE_PREFERENCES_EVENT,
  readExperiencePreferences,
  saveExperiencePreferences,
} from "@/lib/experiencePreferences";

export function useExperiencePreferences() {
  const [preferences, setPreferences] = useState(readExperiencePreferences);

  useEffect(() => {
    const syncPreferences = (event) => setPreferences(event.detail || readExperiencePreferences());
    window.addEventListener(EXPERIENCE_PREFERENCES_EVENT, syncPreferences);
    return () => window.removeEventListener(EXPERIENCE_PREFERENCES_EVENT, syncPreferences);
  }, []);

  const updatePreference = (key, value) => {
    const next = saveExperiencePreferences({ ...preferences, [key]: Boolean(value) });
    setPreferences(next);
  };

  return { preferences, updatePreference };
}
