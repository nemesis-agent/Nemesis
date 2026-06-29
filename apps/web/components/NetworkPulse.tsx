"use client";

import { useState, useEffect } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function NetworkPulse() {
  const [gas, setGas] = useState(0.001);
  const [block, setBlock] = useState(14502394);
  const [pulsing, setPulsing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    // Simulate 2-second block times on Base
    const interval = setInterval(() => {
      setBlock((b) => b + 1);
      
      // Base gas is usually around 0.001 - 0.005 Gwei
      const newGas = 0.001 + Math.random() * 0.003;
      setGas(newGas);
      
      // Trigger CSS pulse
      setPulsing(true);
      setTimeout(() => setPulsing(false), 300);
      
    }, 2000);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="network-pulse-card hidden items-center gap-3 overflow-hidden font-mono text-[10px] uppercase tracking-widest2 text-nm-muted sm:flex border border-nm-border bg-nm-surface px-2 py-1">
      <div className="flex items-center gap-2 border-r border-nm-border pr-3">
        <span className={`h-1.5 w-1.5 bg-nm-resolve transition-opacity duration-300 ${pulsing ? "opacity-100 scale-150" : "opacity-50 scale-100"}`} aria-hidden="true" />
        base + solana
      </div>
      <div className="flex gap-3">
        <span className="text-nm-fg">bl: <span className="text-nm-fragment-blue">{block}</span></span>
        <span className="text-nm-fg">gas: <span className="text-nm-fragment-red">{gas.toFixed(4)}</span></span>
      </div>
    </div>
  );
}
