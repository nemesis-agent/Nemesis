"use client";

import { useEffect, useRef } from "react";

interface Particle {
  /** Drift position, wraps at edges. */
  baseX: number;
  baseY: number;
  /** Rendered position, offset from baseX/Y when near the cursor. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
}

const COLORS = {
  gray: "rgba(122, 122, 122, 0.4)",
  red: "rgba(226, 82, 79, 0.6)",
  blue: "rgba(74, 143, 217, 0.6)",
};

const REPEL_RADIUS = 130;
const REPEL_STRENGTH = 30;

/**
 * Ambient particle field for the hero background. Small rectangular
 * fragments — the same visual unit as FragmentDivider and the mascot's
 * hair fragments — drift slowly and part gently around the cursor.
 *
 * Purely decorative: the canvas has pointer-events: none, so it never
 * blocks clicks on content above it. Mouse position is read from a
 * window-level listener and translated into container-relative
 * coordinates each frame.
 *
 * Renders nothing (no canvas, no listeners, no animation loop) when the
 * user prefers reduced motion.
 */
export function HeroParticles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let frameId = 0;
    let running = true;

    function seedParticles() {
      const count = Math.max(24, Math.min(70, Math.floor((width * height) / 16000)));
      particles = Array.from({ length: count }).map((_, i) => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        let color = COLORS.gray;
        if (i % 11 === 0) color = COLORS.red;
        else if (i % 17 === 0) color = COLORS.blue;
        return {
          baseX: x,
          baseY: y,
          x,
          y,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.1,
          width: 6 + Math.random() * 22,
          height: 2,
          color,
        };
      });
    }

    function resize() {
      if (!container || !canvas || !ctx) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function handleMouseMove(event: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    }

    function handleMouseLeaveWindow() {
      mouseX = -9999;
      mouseY = -9999;
    }

    function tick() {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.baseX += particle.vx;
        particle.baseY += particle.vy;

        if (particle.baseX < -24) particle.baseX = width + 24;
        if (particle.baseX > width + 24) particle.baseX = -24;
        if (particle.baseY < -24) particle.baseY = height + 24;
        if (particle.baseY > height + 24) particle.baseY = -24;

        const dx = particle.baseX - mouseX;
        const dy = particle.baseY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          const angle = Math.atan2(dy, dx);
          particle.x = particle.baseX + Math.cos(angle) * force;
          particle.y = particle.baseY + Math.sin(angle) * force;
        } else {
          particle.x = particle.baseX;
          particle.y = particle.baseY;
        }

        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
      }

      frameId = requestAnimationFrame(tick);
    }

    function handleVisibilityChange() {
      running = !document.hidden;
      if (running) {
        frameId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(frameId);
      }
    }

    resize();
    frameId = requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeaveWindow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeaveWindow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
