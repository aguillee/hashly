"use client";

import { useRef, useCallback } from "react";

/**
 * Mouse-tracking spotlight effect for premium cards.
 * Sets --x and --y CSS custom properties on the element.
 * Use with `.card-spotlight` CSS class.
 */
export function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
  }, []);

  return { ref, onMouseMove: handleMouseMove };
}
