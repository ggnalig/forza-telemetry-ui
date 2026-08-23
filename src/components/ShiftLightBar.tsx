import React, { useMemo } from "react";
import type { ShiftLightPercents } from "../types";

interface ShiftLightBarProps {
  rpm: number;
  /** Base the percentages are applied against - engine.maxRpm (or the
   * active tune's override), NOT the gauge's redline marker. Mirrors
   * SimHub's own formula: `thresholdRPM = maxRPM * percent` (see the SimHub
   * comparison research) - a fixed percentage of the engine's ceiling, not
   * anything learned/predicted. */
  maxRpm: number;
  percents: ShiftLightPercents;
}

const BAR_SIZE = 10;
const GREEN_POSITIONS = 5;
/** How far below light1 the approach-fill zone starts, as a fraction of
 * maxRpm - purely a UX nicety so the bar fills progressively rather than
 * snapping straight from off to full. */
const APPROACH_RANGE_RATIO = 0.15;

type Tier = "off" | "approaching" | "light1" | "light2" | "redline";

function classify(rpm: number, maxRpm: number, percents: ShiftLightPercents): Tier {
  const light1Rpm = maxRpm * percents.light1;
  const light2Rpm = maxRpm * percents.light2;
  const redlineRpm = maxRpm * percents.redline;
  const approachStart = light1Rpm - maxRpm * APPROACH_RANGE_RATIO;

  if (rpm >= redlineRpm) return "redline";
  if (rpm >= light2Rpm) return "light2";
  if (rpm >= light1Rpm) return "light1";
  if (rpm >= approachStart) return "approaching";
  return "off";
}

/**
 * Purely a function of the current rpm/maxRpm/percents - no server-side
 * state or per-frame light array needed (unlike the old learned-shift-engine
 * version this replaces). Blink is CSS-driven (Tailwind's animate-pulse)
 * instead of the server alternating frames.
 */
export const ShiftLightBar: React.FC<ShiftLightBarProps> = ({ rpm, maxRpm, percents }) => {
  const tier = useMemo(() => classify(rpm, maxRpm, percents), [rpm, maxRpm, percents]);

  const litCount = useMemo(() => {
    if (tier !== "approaching") return 0;
    const light1Rpm = maxRpm * percents.light1;
    const approachStart = light1Rpm - maxRpm * APPROACH_RANGE_RATIO;
    const progress = Math.max(0, Math.min(1, (rpm - approachStart) / (light1Rpm - approachStart)));
    return Math.round(progress * BAR_SIZE);
  }, [rpm, maxRpm, percents, tier]);

  const positions = Array.from({ length: BAR_SIZE }, (_, i) => {
    if (tier === "off") return "off";
    if (tier === "approaching") return i < litCount ? (i < GREEN_POSITIONS ? "green" : "yellow") : "off";
    if (tier === "light1") return i < GREEN_POSITIONS ? "green" : "yellow";
    if (tier === "light2") return "orange";
    return "red";
  });

  const blinking = tier === "light2" || tier === "redline";

  const colorClass: Record<string, string> = {
    green: "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]",
    yellow: "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]",
    orange: "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]",
    red: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]",
    off: "bg-gray-800 opacity-30",
  };

  return (
    <div className="w-full flex justify-center gap-2 py-4 px-6 bg-black border-b-2 border-gray-800">
      {positions.map((color, i) => (
        <div
          key={i}
          className={`w-8 h-8 rounded-full transition-all duration-75 ${colorClass[color]} ${
            blinking && color !== "off" ? "animate-pulse" : ""
          }`}
        />
      ))}
    </div>
  );
};
