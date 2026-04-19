import { useRef, useCallback } from "react";

export function useMouseShine() {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--shine-x", `${x}px`);
    card.style.setProperty("--shine-y", `${y}px`);
    card.style.setProperty("--shine-opacity", "1");
  }, []);

  const onMouseLeave = useCallback(() => {
    const card = ref.current;
    if (!card) return;
    card.style.setProperty("--shine-opacity", "0");
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}