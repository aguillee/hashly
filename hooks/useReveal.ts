"use client";

import { useRef, useCallback } from "react";

/**
 * Scroll reveal hook. Adds `.revealed` class when element enters
 * the visible area of its scroll container.
 *
 * Uses a callback ref so it works with conditionally rendered elements
 * (e.g. content that appears after a loading state).
 */
export function useReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((el: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!el) return;

    // Find the nearest scrollable ancestor
    let scrollParent: HTMLElement | null = null;
    let parent = el.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight
      ) {
        scrollParent = parent;
        break;
      }
      parent = parent.parentElement;
    }

    // Fallback: if no usable viewport (headless, SSR, etc.), reveal immediately
    if (window.innerHeight === 0 && (!scrollParent || scrollParent.clientHeight === 0)) {
      el.classList.add("revealed");
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observerRef.current?.unobserve(el);
        }
      },
      {
        root: scrollParent,
        threshold: 0.05,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    observerRef.current.observe(el);
  }, []);

  return ref;
}
