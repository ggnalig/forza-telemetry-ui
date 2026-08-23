import { useState, useEffect } from "react";
import type { TelemetryData, TelemetryResponse } from "../types";
import { handleGear } from "../utils/helper";

const DEFAULT_SHIFT_LIGHT_PERCENTS = { light1: 0.9, light2: 0.95, redline: 0.96 };

// Set to true to preview the dashboard without a live Forza session/API
// running (e.g. `npm run dev` with no forza-telemetry backend up).
const MOCK_DATA = false;

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
  carName: null,
  carOrdinal: null,
  activeTune: null,
  observedRpmCeiling: 0,
  shiftLightPercents: DEFAULT_SHIFT_LIGHT_PERCENTS,
};

// Deliberately NOT a hardcoded "localhost" default: when this page is opened
// from a phone via the PC's LAN IP (see vite.config.ts's server.host), the
// phone's own "localhost" means the phone itself, not the PC running the
// API - window.location.hostname is whatever host the page was actually
// loaded from, which is correct in both cases (dev machine or LAN client).
const DEFAULT_WS_URL = `ws://${window.location.hostname}:3001`;

export const useTelemetry = (url: string = DEFAULT_WS_URL) => {
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
            const { diagnostics, carInfo, activeTune } = payload;

            const currentGear = input?.gear ?? 0;

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
              //
              // rpmMax/redLine come from the backend's effective values, not
              // engine.maxRpm directly - TelemetryProcessor already applies
              // the active tune's manual overrides (if any), see
              // computeEffectiveRpm there.
              rpmMax: diagnostics?.effectiveMaxRpm ?? engine?.maxRpm ?? 0,
              redLine: diagnostics?.effectiveRedline ?? engine?.maxRpm ?? 0,
              carName: carInfo?.displayName ?? null,
              carOrdinal: car?.ordinal ?? null,
              activeTune: activeTune ?? null,
              observedRpmCeiling: diagnostics?.observedRpmCeiling ?? 0,
              shiftLightPercents: diagnostics?.shiftLightPercents ?? DEFAULT_SHIFT_LIGHT_PERCENTS,
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
      mockInterval = window.setInterval(() => {
        t += 0.05;
        const maxRpm = 12000; // Adjusted to 12000, scalable up to 6 digits
        const idleRpm = 800;

        // Dynamic scaling based on maxRpm to support arbitrary large numbers
        const amplitude = (maxRpm - idleRpm) / 2;
        const rpm = idleRpm + amplitude + Math.sin(t) * amplitude;

        const speedRatio = rpm / maxRpm;
        const speed = Math.max(0, speedRatio * 350); // Scale speed up to 350 km/h
        const gear = Math.max(1, Math.min(6, Math.ceil(speedRatio * 6))); // 1 to 6 gears

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
          redLine: maxRpm,
          carName: "1992 Nissan Skyline GT-R",
          carOrdinal: 4114,
          activeTune: null,
          observedRpmCeiling: Math.max(prev.observedRpmCeiling, rpm),
          shiftLightPercents: DEFAULT_SHIFT_LIGHT_PERCENTS,
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
