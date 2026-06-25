"use client";

import { useState, useEffect } from "react";
import { BacktestChart } from "./BacktestChart";
import { Button } from "./Button";

// Generate 30 days of mock price data for ETH/USD
function generateMockPriceData() {
  const data = [];
  let currentPrice = 3200;
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    
    // Random walk
    currentPrice = currentPrice * (1 + (Math.random() - 0.48) * 0.05);
    data.push({ time: dateStr, value: currentPrice });
  }
  return data;
}

export function SimulationView() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  
  const startSimulation = () => {
    setRunning(true);
    const priceData = generateMockPriceData();
    setData(priceData);
    
    // Mock algorithm finding execution points
    setTimeout(() => {
      const generatedMarkers = priceData
        .filter((_, i) => i > 5 && i % 8 === 0)
        .map((point, index) => ({
          time: point.time,
          position: index % 2 === 0 ? "belowBar" as const : "aboveBar" as const,
          color: index % 2 === 0 ? "#97c459" : "#e2524f",
          shape: index % 2 === 0 ? "arrowUp" as const : "arrowDown" as const,
          text: index % 2 === 0 ? "Buy (Dip)" : "Sell (Take Profit)",
        }));
      setMarkers(generatedMarkers);
      setRunning(false);
    }, 1500);
  };

  return (
    <div className="border border-nm-border bg-nm-bg p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
            Strategy Simulation
          </h3>
          <p className="mt-1 font-mono text-[10px] text-nm-muted uppercase tracking-widest2">
            Historical Backtest (30D)
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={startSimulation} disabled={running}>
          {running ? "Simulating..." : "Run Backtest"}
        </Button>
      </div>
      
      {data.length > 0 ? (
        <div className="mt-4 border border-nm-border bg-[#0a0a0a]">
          <BacktestChart data={data} markers={markers} />
          
          <div className="grid grid-cols-3 gap-px border-t border-nm-border bg-nm-border text-center">
            <div className="bg-nm-bg p-3">
              <div className="font-mono text-[10px] uppercase text-nm-muted">Est. APY</div>
              <div className="mt-1 font-mono text-sm font-bold text-nm-resolve">+14.2%</div>
            </div>
            <div className="bg-nm-bg p-3">
              <div className="font-mono text-[10px] uppercase text-nm-muted">Executions</div>
              <div className="mt-1 font-mono text-sm font-bold text-nm-fg">{markers.length}</div>
            </div>
            <div className="bg-nm-bg p-3">
              <div className="font-mono text-[10px] uppercase text-nm-muted">Win Rate</div>
              <div className="mt-1 font-mono text-sm font-bold text-nm-fg">68%</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[240px] items-center justify-center border border-nm-border border-dashed bg-nm-surface/30">
          <p className="font-mono text-[10px] uppercase text-nm-muted">
            Click Run Backtest to simulate strategy on historical data.
          </p>
        </div>
      )}
    </div>
  );
}
