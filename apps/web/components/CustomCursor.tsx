"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function CustomCursor() {
  const reducedMotion = usePrefersReducedMotion();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion || typeof window === "undefined") return;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    const onHoverElement = () => setIsHovering(true);
    const onLeaveElement = () => setIsHovering(false);

    window.addEventListener("mousemove", onMouseMove);
    document.body.addEventListener("mouseleave", onMouseLeave);
    document.body.addEventListener("mouseenter", onMouseEnter);

    // Track hoverable elements
    const interactiveSelectors = "a, button, input, textarea, select, [role='button']";
    const addHoverListeners = () => {
      const elements = document.querySelectorAll(interactiveSelectors);
      elements.forEach((el) => {
        el.addEventListener("mouseenter", onHoverElement);
        el.addEventListener("mouseleave", onLeaveElement);
      });
    };

    addHoverListeners();

    // Re-bind listeners when DOM changes
    const observer = new MutationObserver(() => {
      addHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.body.removeEventListener("mouseleave", onMouseLeave);
      document.body.removeEventListener("mouseenter", onMouseEnter);
      observer.disconnect();
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[99999] transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        {/* Trailing Ring */}
        <div
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-nm-fragment-red mix-blend-difference transition-all duration-300 ease-out"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`,
            backgroundColor: isHovering ? "rgba(226, 82, 79, 0.1)" : "transparent",
            borderColor: isHovering ? "rgba(226, 82, 79, 0)" : "rgba(226, 82, 79, 0.5)",
          }}
        />
        {/* Core Dot */}
        <div
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-nm-fragment-red mix-blend-difference transition-transform duration-150"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `translate(-50%, -50%) scale(${isHovering ? 0 : 1})`,
          }}
        />
      </div>
    </>
  );
}
