"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting reactively. Every
 * animated component in this app (particles, magnetic buttons, scroll
 * reveals, counters) reads this and falls back to an instant/static
 * state when true — see CONTEXT.md, "Non-negotiable constraints" is
 * silent on this specifically, but it's required by the frontend-design
 * quality floor: reduced motion is always respected.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    function handleChange(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
