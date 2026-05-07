import { useState, useEffect } from "react";
import type { TelemetryData, TelemetryResponse } from "../types";
import { handleGear } from "../utils/helper";

const MOCK_DATA = true; // Set to true to use mock data

const initialData: TelemetryData = {
  gear: handleGear(11),
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
  shiftWindow: { min: 6500, max: 7500 },
  shiftRecommendation: {
    upShift: false,
    downShift: false,
    recommendation: "WAIT",
  },
  shiftLights: { active: 0, blink: false, color: "green" },
};

export const useTelemetry = (url: string = "ws://localhost:3001") => {
  const [data, setData] = useState<TelemetryData>(initialData);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mockInterval: number | null = null;

    if (!MOCK_DATA) {
      const connectWebSocket = () => {
        ws = new WebSocket(url);

        ws.onopen = () => {
          setConnected(true);
          console.log("WebSocket Connected");
        };

        ws.onclose = () => {
          setConnected(false);
          console.log("WebSocket Disconnected. Reconnecting in 2s...");
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket Error:", error);
          ws?.close();
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as TelemetryResponse;
            console.log(payload.parsed, "<-- parsed");
            if (!payload || !payload.parsed) return;

            const { engine, performance, input, lap } = payload.parsed;
            const { efficiency } = payload;

            // Safe fallback extractions
            const currentGear = input?.gear ?? 1;
            const mapEntry = efficiency?.map?.[currentGear];

            // Parse shift lights logic
            const lightsArray = efficiency?.lights || [];

            const activeLightsCount = lightsArray.filter((l: string) =>
              ["🟢", "🟡", "🟠", "🔴"].includes(l),
            ).length;

            const isBlinking = lightsArray.includes("⚫");

            let color = "green";
            if (lightsArray.includes("🔴")) color = "red";
            else if (lightsArray.includes("🟠") || lightsArray.includes("🟡"))
              color = "yellow";

            const range = engine.maxRpm - engine.idleRpm;
            const dynamicOffset = Math.min(1000, Math.max(1000, range * 0.04));

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
              rpmMax: Math.round((engine?.maxRpm ?? 0) / 1000) * 1000,
              shiftWindow: {
                min: mapEntry?.shiftWindow?.[0] ?? 6500,
                max: mapEntry?.shiftWindow?.[1] ?? 7500,
              },
              redLine: engine.maxRpm - dynamicOffset,
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
              shiftLights: {
                active: activeLightsCount,
                blink: isBlinking,
                color,
              },
            };

            setData(transformedData);
            console.log(transformedData, "<-- transformedData");
          } catch (e) {
            console.error("Failed to parse telemetry data", e);
          }
        };
      };

      connectWebSocket();
    } else {
      setConnected(true);
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

        const lightStartRpm = maxRpm * 0.75;
        const activeLights = Math.floor(
          Math.max(0, (rpm - lightStartRpm) / ((maxRpm - lightStartRpm) / 13)),
        );

        const range = maxRpm - idleRpm;
        const dynamicOffset = Math.min(
          maxRpm * 0.1,
          Math.max(200, range * 0.05),
        );

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
          redLine: maxRpm - dynamicOffset,
          shiftLights: {
            active: activeLights,
            blink: rpm > maxRpm * 0.95,
            color:
              rpm > maxRpm * 0.95
                ? "red"
                : rpm > maxRpm * 0.85
                  ? "yellow"
                  : "green",
          },
        }));
      }, 16); // ~60Hz
    }
    console.log(data, "<-- data");
    return () => {
      if (ws) {
        ws.onclose = null; // Prevent reconnect loop on unmount
        ws.close();
      }
      if (mockInterval) window.clearInterval(mockInterval);
    };
  }, [url]);

  return { data, connected };
};
