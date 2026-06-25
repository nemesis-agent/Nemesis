"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi, SeriesMarker } from "lightweight-charts";

interface BacktestChartProps {
  data: { time: string; value: number }[];
  markers?: { time: string; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "arrowUp" | "arrowDown"; text: string }[];
}

export function BacktestChart({ data, markers = [] }: BacktestChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#666666",
        fontFamily: "'IBM Plex Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "rgba(226, 82, 79, 0.4)", width: 1, style: 3 },
        horzLine: { color: "rgba(226, 82, 79, 0.4)", width: 1, style: 3 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
    });

    const newSeries = chart.addAreaSeries({
      lineColor: "rgba(74, 143, 217, 0.8)",
      topColor: "rgba(74, 143, 217, 0.2)",
      bottomColor: "rgba(74, 143, 217, 0.0)",
      lineWidth: 2,
    });

    newSeries.setData(data as any);

    if (markers.length > 0) {
      // Create lightweight-charts markers
      const seriesMarkers: SeriesMarker<any>[] = markers.map((m) => ({
        time: m.time,
        position: m.position,
        color: m.color,
        shape: m.shape,
        text: m.text,
        size: 1,
      }));
      newSeries.setMarkers(seriesMarkers);
    }

    chart.timeScale().fitContent();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, markers]);

  return <div ref={chartContainerRef} className="w-full" />;
}
