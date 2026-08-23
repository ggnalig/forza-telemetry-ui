import React, { useEffect, useRef, useState } from "react";
import { useTelemetry } from "../hooks/useTelemetry";
import { Gauge } from "./Gauge";
import { ShiftLightBar } from "./ShiftLightBar";

// Gauge.tsx renders a fixed 500x500 SVG with no viewBox - can't be sized via
// width/height props, only via CSS `zoom` (transform:scale needs manual
// crop-box math, see Sessions replay's earlier use of the same trick).
const GAUGE_NATIVE_SIZE = 500;

/** Standalone, chrome-free tachometer for a phone - reachable at /mobile
 * (see App.tsx) so it can be opened directly without the sidebar shell ever
 * flashing first. Nothing but the gauge + shift-light bar: no nav, no side
 * panels, no session/tune management - purely "put this fullscreen on a
 * phone mounted in the car." */
export const MobileTachometer: React.FC = () => {
  const { data, connected } = useTelemetry();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resize = () => {
      // Fit the 500x500 gauge into whatever space is left after the top bar
      // and shift-light strip, on either a tall phone or a landscape mount.
      const available = Math.min(el.clientWidth, el.clientHeight);
      setZoom(Math.max(0.3, available / GAUGE_NATIVE_SIZE));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      // Fullscreen API requires a user gesture - only ever called from this
      // button's onClick, never automatically.
      document.documentElement.requestFullscreen().catch(() => {
        // Some mobile browsers (notably iOS Safari) don't support the
        // Fullscreen API at all - fail silently, the page still works fine
        // un-fullscreened (e.g. via "Add to Home Screen" standalone mode).
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            connected ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 animate-pulse"
          }`}
        />
        <button
          onClick={toggleFullscreen}
          className="text-gray-400 text-xs px-3 py-1.5 rounded bg-gray-900 border border-gray-800"
        >
          {isFullscreen ? "Keluar Fullscreen" : "⛶ Fullscreen"}
        </button>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center px-2">
        <div style={{ zoom }}>
          <Gauge
            rpm={data.rpm}
            rpmMax={data.rpmMax}
            gear={data.gear}
            speed={data.speed}
            redline={data.redLine}
          />
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <ShiftLightBar rpm={data.rpm} maxRpm={data.rpmMax} percents={data.shiftLightPercents} />
      </div>
    </div>
  );
};
