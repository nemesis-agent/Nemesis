"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const BOOT_LOGS = [
  "NEMESIS_OS v1.0.4 initializing...",
  "Establishing secure connection to Base mainnet...",
  "Loading Master Agent parameters...",
  "Decrypting local state...",
  "Calibrating Sub-agent neural pathways...",
  "Verifying MCP protocols...",
  "OpenRouter intelligence online.",
  "Awaiting user input...",
];

export function BootSequence() {
  const [stage, setStage] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setIsBooting(false);
      return;
    }

    // Only run boot sequence once per session
    const hasBooted = sessionStorage.getItem("nemesis_booted");
    if (hasBooted) {
      setIsBooting(false);
      return;
    }

    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage++;
      setStage(currentStage);

      if (currentStage >= BOOT_LOGS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsBooting(false);
          sessionStorage.setItem("nemesis_booted", "true");
        }, 600); // Hold final frame briefly
      }
    }, 150); // Fast typing speed

    return () => clearInterval(interval);
  }, [reducedMotion]);

  if (!isBooting && !reducedMotion) return null;
  if (reducedMotion) return null;

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col items-start justify-end bg-nm-bg p-8 transition-opacity duration-700 ease-in-out ${
        stage >= BOOT_LOGS.length ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex w-full max-w-3xl flex-col gap-2 font-mono text-sm text-nm-muted">
        {BOOT_LOGS.slice(0, stage).map((log, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-nm-fragment-red">{`>`}</span>
            <span className={i === BOOT_LOGS.length - 1 ? "text-nm-resolve animate-pulse" : ""}>
              {log}
            </span>
          </div>
        ))}
      </div>
      
      {/* Decorative scanline overlay during boot */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />
    </div>
  );
}
