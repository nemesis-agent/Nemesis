"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type Variant = "primary" | "secondary" | "resolve";
type Size = "md" | "sm";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Shared button with three layers of tactile feedback:
 * 1. Magnetic cursor pull (opt-in via `magnetic`)
 * 2. Press-down scale on click
 * 3. Left-to-right fill sweep on hover (CSS class, no JS)
 */
export function Button({
  href,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  magnetic = false,
  className = "",
  children,
}: ButtonProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const motionEnabled = magnetic && !reducedMotion && !disabled;

  function handleMouseMove(event: React.MouseEvent<HTMLSpanElement>) {
    if (!motionEnabled || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    const max = 10;
    setOffset({
      x: Math.max(-max, Math.min(max, relX * 0.25)),
      y: Math.max(-max, Math.min(max, relY * 0.25)),
    });
  }

  function handleMouseEnter() { setHovered(true); }
  function reset() { setOffset({ x: 0, y: 0 }); setPressed(false); setHovered(false); }
  function press() { if (!disabled) setPressed(true); }
  function release() { setPressed(false); }

  const scale = pressed && !reducedMotion ? 0.95 : 1;
  const wrapperStyle: CSSProperties = reducedMotion
    ? {}
    : {
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transition: pressed
          ? "transform 80ms ease-out"
          : "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      };

  // Sweep fill is driven by a CSS class; colors are per-variant
  const sweepClass =
    variant === "primary"  ? "btn-sweep-red"  :
    variant === "resolve"  ? "btn-sweep-green" :
    "btn-sweep-muted";

  const sizeStyles: Record<Size, string> = {
    md: "px-5 py-3 text-xs",
    sm: "px-4 py-2 text-[10px]",
  };

  // Text color flips to dark on fill (only for solid-fill variants)
  const textFlip =
    (variant === "primary" || variant === "resolve") && hovered && !reducedMotion
      ? "text-nm-bg"
      : variant === "primary"
        ? "text-nm-fragment-red"
        : variant === "resolve"
          ? "text-nm-resolve"
          : hovered && !reducedMotion
            ? "text-nm-fg"
            : "text-nm-muted";

  const borderColor =
    variant === "primary"  ? "border-nm-fragment-red" :
    variant === "resolve"  ? "border-nm-resolve"       :
    hovered && !reducedMotion ? "border-nm-fg"         : "border-nm-border";

  const classes = [
    "inline-block select-none border text-center font-mono uppercase tracking-widest2",
    "relative overflow-hidden isolate",
    sweepClass,
    sizeStyles[size],
    borderColor,
    textFlip,
    "transition-colors duration-200",
    disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = href && !disabled ? (
    <Link href={href} className={classes}>
      <span className="relative z-10">{children}</span>
    </Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      <span className="relative z-10">{children}</span>
    </button>
  );

  return (
    <span
      ref={wrapperRef}
      className="inline-block"
      style={wrapperStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={reset}
      onMouseDown={press}
      onMouseUp={release}
      onTouchStart={press}
      onTouchEnd={release}
    >
      {inner}
    </span>
  );
}
