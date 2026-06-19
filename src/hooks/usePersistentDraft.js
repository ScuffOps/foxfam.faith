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

export function usePersistentDraft(scope, initialDraft) {
  const storageKey = useMemo(() => `${DRAFT_PREFIX}.${scope}.v1`, [scope]);
  const skipNextWriteRef = useRef(false);
  const [draft, setDraft] = useState(() => readDraft(storageKey, initialDraft));

  useEffect(() => {
    skipNextWriteRef.current = false;
    setDraft(readDraft(storageKey, initialDraft));
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

  const updateDraft = useCallback((field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const clearDraft = useCallback(
    (nextDraft = initialDraft) => {
      skipNextWriteRef.current = true;
      removeDraft(storageKey);
      setDraft(nextDraft);
    },
    [initialDraft, storageKey]
  );

  return [draft, setDraft, { clearDraft, storageKey, updateDraft }];
}
