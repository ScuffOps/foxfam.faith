import { useState } from "react";

const KEY = "commhub_guest_profile";

export function useGuestProfile() {
  const [profile, setProfileState] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : { name: "", discordId: "" };
    } catch {
      return { name: "", discordId: "" };
    }
  });

  const saveProfile = (updates) => {
    const next = { ...profile, ...updates };
    setProfileState(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  return { profile, saveProfile };
}