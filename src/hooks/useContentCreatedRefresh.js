import { useEffect, useRef } from "react";

export function useContentCreatedRefresh(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const refresh = () => callbackRef.current?.();
    window.addEventListener("foxfam:content-created", refresh);
    return () => window.removeEventListener("foxfam:content-created", refresh);
  }, []);
}
