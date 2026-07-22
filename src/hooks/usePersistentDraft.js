import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DRAFT_PREFIX = "foxfam.draft";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readDraft(storageKey, fallback) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function writeDraft(storageKey, draft) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Draft persistence should never block text entry.
  }
}

function removeDraft(storageKey) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // No-op: local draft cleanup is best effort.
  }
}

function hasStoredDraft(storageKey, fallback) {
  if (!canUseStorage()) return false;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return false;
    return JSON.stringify(JSON.parse(stored)) !== JSON.stringify(fallback);
  } catch {
    return false;
  }
}

export function usePersistentDraft(scope, initialDraft) {
  const storageKey = useMemo(() => `${DRAFT_PREFIX}.${scope}.v1`, [scope]);
  const skipNextWriteRef = useRef(false);
  const initialDraftRef = useRef(initialDraft);
  const [wasRestored, setWasRestored] = useState(() => hasStoredDraft(storageKey, initialDraft));
  const [draft, setDraftState] = useState(() => readDraft(storageKey, initialDraft));
  const draftRef = useRef(draft);

  useEffect(() => {
    skipNextWriteRef.current = false;
    initialDraftRef.current = initialDraft;
    setWasRestored(hasStoredDraft(storageKey, initialDraft));
    const restoredDraft = readDraft(storageKey, initialDraft);
    draftRef.current = restoredDraft;
    setDraftState(restoredDraft);
    // Rehydrate only when the form identity changes.
  }, [storageKey]);

  useEffect(() => {
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      removeDraft(storageKey);
      return;
    }

    writeDraft(storageKey, draft);
  }, [draft, storageKey]);

  useEffect(() => {
    const flushDraft = () => writeDraft(storageKey, draftRef.current);
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", flushDraft);
    return () => {
      flushDraft();
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", flushDraft);
    };
  }, [storageKey]);

  const setDraft = useCallback((nextDraft) => {
    setDraftState((current) => {
      const resolvedDraft = typeof nextDraft === "function" ? nextDraft(current) : nextDraft;
      draftRef.current = resolvedDraft;
      writeDraft(storageKey, resolvedDraft);
      return resolvedDraft;
    });
  }, [storageKey]);

  const updateDraft = useCallback((field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, [setDraft]);

  const clearDraft = useCallback(
    (nextDraft = initialDraft) => {
      skipNextWriteRef.current = true;
      removeDraft(storageKey);
      setWasRestored(false);
      draftRef.current = nextDraft;
      setDraftState(nextDraft);
    },
    [initialDraft, storageKey]
  );

  const hasDraft = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraftRef.current),
    [draft],
  );

  return [draft, setDraft, { clearDraft, hasDraft, storageKey, updateDraft, wasRestored }];
}
