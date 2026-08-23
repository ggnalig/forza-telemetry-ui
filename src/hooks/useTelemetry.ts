import { useState, useEffect } from "react";
import type { TelemetryData, TelemetryResponse } from "../types";
import { handleGear } from "../utils/helper";

// Set to true to preview the dashboard without a live Forza session/API
// running (e.g. `npm run dev` with no forza-telemetry backend up).
const MOCK_DATA = false;

const OFF_LIGHTS = new Array(10).fill("⚫");

const initialData: TelemetryData = {
  gear: handleGear(0),
  rpm: 0,
  speed: 0,
  torque: 0,
  throttle: 0,
  brake: 0,
  boost: 0,
  power: 0,
  fuel: 0,
  position: 1,
  lap: 0,
  redLine: 0,
  rpmMax: 8000,
  showRecommendation: false,
  carName: null,
  carOrdinal: null,
  activeTune: null,
  shiftRecommendation: {
    upShift: false,
    downShift: false,
    recommendation: "WAIT",
  },
  shiftLights: OFF_LIGHTS,
};

export const useTelemetry = (url: string = "ws://localhost:3001") => {
  const [data, setData] = useState<TelemetryData>(initialData);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mockInterval: number | null = null;
    let connectTimer: number | null = null;

    if (!MOCK_DATA) {
      const connectWebSocket = () => {
        ws = new WebSocket(url);

        ws.onopen = () => {
          setConnected(true);
          console.log(`WebSocket connected to ${url}`);
        };

        ws.onclose = () => {
          setConnected(false);
          console.log("WebSocket disconnected, reconnecting in 2s...");
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
          ws?.close();
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as TelemetryResponse;
            if (!payload || !payload.parsed) return;

            const { engine, performance, input, lap, car } = payload.parsed;
            const { efficiency, carInfo, showRecommendation, activeTune } = payload;

            const currentGear = input?.gear ?? 0;

            // Deliberately NOT using efficiency.finalShiftRPM here: that's
            // the model's current *recommended shift point*, which is a
            // volatile, still-converging estimate early in a session (it can
            // sit far below the engine's actual redline while the model
            // hasn't yet observed the power curve's peak). The gauge's
            // redline is meant to be a stable "how close to the engine's
            // real max rpm" marker, a different concept from "when should I
            // shift" - so it's derived straight from maxRpm instead.
            //
            // Deliberately NOT gated by showRecommendation either: that flag
            // only controls the still-learning predictive UI (shift
            // recommendation, shift lights), not this gauge. Forza's own
            // EngineMaxRpm field is documented by the community as literally
            // "the redline rpm of the car", so redLine always reads it as-is
            // regardless of the flag's state.
            const redLine = engine.maxRpm;

            const transformedData: TelemetryData = {
              gear: handleGear(currentGear),
              rpm: engine?.rpm ?? 0,
              speed: performance?.speedKmh ?? 0,
              torque: performance?.torqueNm ?? 0,
              throttle: input?.throttle ?? 0,
              brake: input?.brake ?? 0,
              boost: performance?.boost > 0 ? performance?.boost : 0,
              power: performance?.powerKw ?? 0,
              fuel: performance?.fuel ?? 0,
              position: lap?.position ?? 1,
              lap: lap?.number ?? 1,
              // Deliberately NOT rounded: Gauge.tsx normalizes both the
              // needle and the redline arc as a fraction of this value
              // (rpm/rpmMax, redline/rpmMax). Rounding it here while
              // `redLine` stayed unrounded meant the two were different
              // representations of "max rpm" mixed into the same ratio -
              // e.g. maxRpm=7200 rounded down to rpmMax=7000 made
              // redline/rpmMax = 7200/7000 = 1.03, pushing the redline arc
              // PAST the visual end of the gauge. Tick labels still come out
              // as clean round numbers regardless (Gauge.tsx computes those
              // separately via `Math.floor(rpmMax / tickStep)`).
              rpmMax: engine?.maxRpm ?? 0,
              redLine,
              showRecommendation: showRecommendation ?? false,
              carName: carInfo?.displayName ?? null,
              carOrdinal: car?.ordinal ?? null,
              activeTune: activeTune ?? null,
              shiftRecommendation: {
                upShift:
                  efficiency?.recommendations?.upshiftRecommended ?? false,
                downShift:
                  efficiency?.recommendations?.downshiftRecommended ?? false,
                recommendation: efficiency?.recommendations?.upshiftRecommended
                  ? "UP"
                  : efficiency?.recommendations?.downshiftRecommended
                    ? "DOWN"
                    : "WAIT",
              },
              // Passed straight through - see ShiftLights.tsx for why this
              // isn't reduced to an active-count/color/blink summary here.
              shiftLights: efficiency?.lights ?? OFF_LIGHTS,
            };

            setData(transformedData);
          } catch (e) {
            console.error("Failed to parse telemetry data", e);
          }
        };
      };

      connectWebSocket();
    } else {
      // Deferred so the initial setState doesn't happen synchronously in the
      // effect body (react-hooks/set-state-in-effect).
      connectTimer = window.setTimeout(() => setConnected(true), 0);

      let t = 0;
      let blinkTick = 0;
      mockInterval = window.setInterval(() => {
        t += 0.05;
        blinkTick += 1;
        const maxRpm = 12000; // Adjusted to 12000, scalable up to 6 digits
        const idleRpm = 800;

        // Dynamic scaling based on maxRpm to support arbitrary large numbers
        const amplitude = (maxRpm - idleRpm) / 2;
        const rpm = idleRpm + amplitude + Math.sin(t) * amplitude;

        const speedRatio = rpm / maxRpm;
        const speed = Math.max(0, speedRatio * 350); // Scale speed up to 350 km/h
        const gear = Math.max(1, Math.min(6, Math.ceil(speedRatio * 6))); // 1 to 6 gears

        const range = maxRpm - idleRpm;
        const dynamicOffset = Math.min(
          maxRpm * 0.1,
          Math.max(200, range * 0.05),
        );
        const redLine = maxRpm - dynamicOffset;

        // Mirrors the API's shift-light shape (fill bar -> uniform blink)
        // closely enough for a local preview, using redLine as the mock
        // "optimal shift point" since there's no learned finalShiftRPM here.
        const optimalStart = redLine;
        const optimalEnd = optimalStart + maxRpm * 0.04;
        const approachStart = optimalStart - maxRpm * 0.15;
        const blinkOn = blinkTick % 6 < 3;

        let shiftLights: string[];
        if (rpm > optimalEnd) {
          shiftLights = new Array(10).fill(blinkOn ? "🔴" : "⚫");
        } else if (rpm >= optimalStart) {
          shiftLights = new Array(10).fill(blinkOn ? "🟠" : "⚫");
        } else if (rpm < approachStart) {
          shiftLights = OFF_LIGHTS;
        } else {
          const progress = Math.max(
            0,
            Math.min(1, (rpm - approachStart) / (optimalStart - approachStart)),
          );
          const litCount = Math.round(progress * 10);
          shiftLights = Array.from({ length: 10 }, (_, i) =>
            i >= litCount ? "⚫" : i < 5 ? "🟢" : "🟡",
          );
        }

        setData((prev) => ({
          ...prev,
          rpm,
          speed,
          gear: handleGear(gear),
          throttle: Math.max(0, Math.sin(t) * 0.5 + 0.5),
          brake: Math.max(0, -Math.sin(t) * 0.5),
          boost: Math.max(0, Math.sin(t) * 20),
          power: speedRatio * 800,
          fuel: Number((50 + Math.cos((t * Math.PI) / 100) * 50).toFixed(1)),
          torque: speedRatio * 700,
          rpmMax: maxRpm,
          redLine,
          showRecommendation: true,
          carName: "1992 Nissan Skyline GT-R",
          carOrdinal: 4114,
          activeTune: null,
          shiftLights,
        }));
      }, 16); // ~60Hz
    }

    return () => {
      if (ws) {
        ws.onclose = null; // Prevent reconnect loop on unmount
        ws.close();
      }
      if (mockInterval) window.clearInterval(mockInterval);
      if (connectTimer) window.clearTimeout(connectTimer);
    };
  }, [url]);

  return { data, connected };
};
