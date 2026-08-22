import React from "react";

interface ShiftLightsProps {
  /**
   * Raw 10-position light bar straight from the API. Each position is
   * rendered literally as its own color, in place - this is NOT a rolling
   * history to aggregate into a single "active count"/"color"/"blink" flag.
   *
   * The API's design (see forza-telemetry's shift-engine.ts): default all
   * "⚫" (off); green fills in from position 1 as rpm rises, yellow for the
   * last few positions as it gets close; then the WHOLE bar becomes uniform
   * orange (at the optimal shift window) or red (past it) - and the API
   * itself alternates that uniform color with an all-"⚫" frame every few
   * telemetry frames to blink. Rendering each position exactly as received,
   * on every incoming frame, reproduces that blink naturally through the
   * normal re-render cycle - no client-side blink/color inference needed
   * (and inferring it from "does the array contain ⚫ anywhere" doesn't
   * work: an unlit position in the fill-bar and an "off" blink frame both
   * use "⚫", so that heuristic can't tell them apart).
   */
  lights: string[];
}

const LIGHT_STYLES: Record<string, { bg: string; glow: string }> = {
  "🟢": { bg: "bg-green-500", glow: "shadow-[0_0_15px_rgba(34,197,94,0.8)]" },
  "🟡": { bg: "bg-yellow-400", glow: "shadow-[0_0_15px_rgba(250,204,21,0.8)]" },
  "🟠": { bg: "bg-orange-500", glow: "shadow-[0_0_15px_rgba(249,115,22,0.8)]" },
  "🔴": { bg: "bg-red-500", glow: "shadow-[0_0_15px_rgba(239,68,68,0.8)]" },
};

export const ShiftLights: React.FC<ShiftLightsProps> = ({ lights }) => {
  return (
    <div className="w-full flex justify-center gap-2 py-4 px-6 bg-black border-b-2 border-gray-800">
      {lights.map((symbol, i) => {
        const style = LIGHT_STYLES[symbol];

        return (
          <div
            key={i}
            className={`w-8 h-8 rounded-full transition-all duration-75
              ${style ? `${style.bg} ${style.glow} opacity-100` : "bg-gray-800 opacity-30"}
            `}
          />
        );
      })}
    </div>
  );
};
