"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

interface ScrollRevealProps {
  children: ReactNode;
  /** Stagger delay in ms — pass index * 60 in a list for a cascade effect. */
  delayMs?: number;
  className?: string;
}

/**
 * Fades and lifts its children into place the first time they enter the
 * viewport, then disconnects its observer (the reveal never re-triggers
 * on scroll back up — distracting on a second pass). Renders fully
 * visible immediately if the user prefers reduced motion.
 */
export function ScrollReveal({ children, delayMs = 0, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={className}
      style={
        reducedMotion
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.98)",
              filter: visible ? "blur(0px)" : "blur(3px)",
              transition: [
                `opacity 680ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
                `transform 680ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
                `filter 680ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
              ].join(", "),
            }
      }
    >
      {children}
    </div>
  );
}
