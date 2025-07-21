"use client";
import React, { useEffect, useRef } from "react";

interface PerformanceMonitorProps {
  name: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function PerformanceMonitor({
  name,
  children,
  enabled = process.env.NODE_ENV === "development",
}: PerformanceMonitorProps) {
  const renderCount = useRef(0);
  const startTime = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    startTime.current = performance.now();

    return () => {
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current;
        console.log(
          `[Performance] ${name}: Render #${
            renderCount.current
          } took ${renderTime.toFixed(2)}ms`
        );
      }
    };
  });

  if (!enabled) {
    return <>{children}</>;
  }

  return <div data-performance-monitor={name}>{children}</div>;
}

// Hook for measuring function execution time
export function usePerformanceMeasure(name: string) {
  const enabled = process.env.NODE_ENV === "development";

  return useRef((fn: () => void) => {
    if (!enabled) {
      fn();
      return;
    }

    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }).current;
}
