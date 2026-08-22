import React from "react";
import { useTelemetry } from "../hooks/useTelemetry";
import { CarNameplate } from "./CarNameplate";
import { ShiftLights } from "./ShiftLights";
import { Gauge } from "./Gauge";
import { ValueDisplay } from "./ValueDisplay";
import {
  highlightPercentageValue,
  highlightShiftRecommendation,
} from "../utils/helper";

export const Dashboard: React.FC = () => {
  const { data, connected } = useTelemetry();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-gray-950 rounded-2xl border-4 border-gray-800 overflow-hidden shadow-2xl relative">
        {/* Connection Status Indicator */}
        <div
          className={`absolute top-2 right-4 w-3 h-3 rounded-full ${connected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500 animate-pulse"}`}
        />

        {/* Top: Car Nameplate */}
        <CarNameplate carName={data.carName} />

        {/* Shift Lights */}
        <ShiftLights lights={data.shiftLights} />

        {/* Main Content */}
        <div className="flex justify-between items-center p-2 gap-8 bg-gradient-to-b from-gray-900 to-black">
          {/* Left Panel */}
          <div className="flex flex-col gap-4 w-64 ">
            <ValueDisplay
              label="Boost"
              value={data.boost.toFixed(1)}
              unit="PSI"
            />
            <ValueDisplay
              label="Power"
              value={Math.round(data.power)}
              unit="kW"
            />
            <ValueDisplay
              label="Torque"
              value={Math.round(data.torque)}
              unit="Nm"
            />
            <ValueDisplay
              label="Fuel Level"
              value={data.fuel}
              unit="%"
              highlight={highlightPercentageValue(data.fuel)}
              blink={data.fuel < 10}
            />
          </div>

          {/* Center: Gauge */}
          <div className="z-10 flex-1 flex justify-center">
            <Gauge
              rpm={data.rpm}
              rpmMax={data.rpmMax}
              gear={data.gear}
              speed={data.speed}
              redline={data.redLine}
            />
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-4 w-64">
            <ValueDisplay
              label="Throttle"
              value={Math.round(data.throttle * 100)}
              unit="%"
              align="right"
            />
            <ValueDisplay
              label="Brake"
              value={Math.round(data.brake * 100)}
              unit="%"
              align="right"
            />
            <div className="flex gap-4 w-full">
              <div className="grid grid-cols-2 gap-4 w-full">
                <ValueDisplay label="Pos" value={data.position} align="right" />
                <ValueDisplay label="Lap" value={data.lap} align="right" />
              </div>
            </div>
            <div
              className={`p-2 text-right border-b border-gray-800 bg-olive-100 shadow-[inset_0_0_10px_rgba(0,0,0,1)] h-28 ${highlightShiftRecommendation(data.shiftRecommendation.recommendation)}`}
            >
              <div
                className={`text-7xl font-bold text-black font-digital tracking-tighter`}
              >
                {data.shiftRecommendation.recommendation}
              </div>
              <span className="text-xl font-bold text-black uppercase">
                SHIFT REC
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
