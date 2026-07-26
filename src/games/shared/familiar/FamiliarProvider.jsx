import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { DEFAULT_FAMILIAR } from "./familiarCatalog";
import { loadFamiliar, loadGuestFamiliar, saveFamiliar, saveGuestFamiliar } from "./familiarService";
import { resolveVisibleFamiliar } from "./familiarSession";

export const FamiliarContext = createContext(null);

export default function FamiliarProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const ownerId = isAuthenticated && user?.id ? user.id : "";
  const activeOwnerRef = useRef(ownerId);
  const epochRef = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  activeOwnerRef.current = ownerId;
  const [state, setState] = useState(() => ({
    loadedOwnerId: "",
    saved: { ...DEFAULT_FAMILIAR },
    guest: loadGuestFamiliar(),
    status: "loading",
    error: "",
  }));

  useEffect(() => {
    const epoch = ++epochRef.current;
    let cancelled = false;
    setState((current) => ({
      ...current,
      loadedOwnerId: "",
      saved: { ...DEFAULT_FAMILIAR },
      status: isLoadingAuth ? "loading" : (ownerId ? "loading" : "guest"),
      error: "",
      guest: ownerId ? current.guest : loadGuestFamiliar(),
    }));
    if (isLoadingAuth || !ownerId) return () => { cancelled = true; };

    loadFamiliar()
      .then((familiar) => {
        if (cancelled || epochRef.current !== epoch || activeOwnerRef.current !== ownerId) return;
        setState((current) => ({ ...current, loadedOwnerId: ownerId, saved: familiar, status: "ready", error: "" }));
      })
      .catch((error) => {
        if (cancelled || epochRef.current !== epoch || activeOwnerRef.current !== ownerId) return;
        setState((current) => ({ ...current, loadedOwnerId: "", saved: { ...DEFAULT_FAMILIAR }, status: "error", error: error.message }));
      });
    return () => { cancelled = true; };
  }, [isLoadingAuth, loadAttempt, ownerId]);

  const familiar = resolveVisibleFamiliar({ ownerId, ...state });
  const save = useCallback(async (selection) => {
    if (!ownerId) {
      const guest = saveGuestFamiliar(selection);
      setState((current) => ({ ...current, guest, status: "guest", error: "" }));
      return guest;
    }
    if (state.loadedOwnerId !== ownerId || state.status !== "ready") {
      throw new Error("Retry loading your familiar before saving changes.");
    }
    const savingOwnerId = ownerId;
    setState((current) => ({ ...current, status: "saving", error: "" }));
    try {
      const saved = await saveFamiliar(selection);
      if (activeOwnerRef.current !== savingOwnerId) return saved;
      setState((current) => ({ ...current, loadedOwnerId: savingOwnerId, saved, status: "ready", error: "" }));
      return saved;
    } catch (error) {
      if (activeOwnerRef.current === savingOwnerId) {
        setState((current) => ({ ...current, status: "error", error: error.message }));
      }
      throw error;
    }
  }, [ownerId, state.loadedOwnerId, state.status]);

  const retryLoad = useCallback(() => {
    if (ownerId) setLoadAttempt((current) => current + 1);
  }, [ownerId]);

  const value = useMemo(() => ({
    familiar,
    saveFamiliar: save,
    status: state.status,
    error: state.error,
    isGuest: !ownerId,
    retryFamiliar: retryLoad,
  }), [familiar, ownerId, retryLoad, save, state.error, state.status]);

  return <FamiliarContext.Provider value={value}>{children}</FamiliarContext.Provider>;
}
