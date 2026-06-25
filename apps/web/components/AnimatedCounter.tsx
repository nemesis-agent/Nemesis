"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` on mount using an eased requestAnimationFrame
 * loop. Renders the final value immediately (no animation) if the user
 * prefers reduced motion.
 */
export function AnimatedCounter({ value, durationMs = 700, className = "" }: AnimatedCounterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs, reducedMotion]);

  return <span className={className}>{display}</span>;
}
