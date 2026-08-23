import React, { useEffect, useMemo, useState } from "react";
import type { SessionSummary, SessionFrame } from "../types";
import { sessionApi } from "../services/sessionApi";
import { handleGear } from "../utils/helper";
import { Gauge } from "./Gauge";
import { ValueDisplay } from "./ValueDisplay";
import { LineChart } from "./LineChart";

const STATUS_LABEL: Record<SessionSummary["status"], string> = {
  recording: "MEREKAM",
  completed: "SELESAI",
  aborted: "DIBATALKAN",
};

const STATUS_COLOR: Record<SessionSummary["status"], string> = {
  recording: "text-green-400",
  completed: "text-blue-400",
  aborted: "text-gray-500",
};

function formatDuration(session: SessionSummary): string {
  const end = session.endedAt ?? Date.now();
  const seconds = Math.max(0, Math.round((end - session.startedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Frame indices where lap.number changes from the previous frame - drawn as
 * vertical markers on the analysis charts. */
function lapBoundaries(frames: SessionFrame[]): number[] {
  const boundaries: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].lapNumber !== frames[i - 1].lapNumber) {
      boundaries.push(i);
    }
  }
  return boundaries;
}

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

export const SessionsView: React.FC = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frames, setFrames] = useState<SessionFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const refresh = () => {
    setLoading(true);
    sessionApi
      .list()
      .then(setSessions)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Deferred so the initial setState doesn't happen synchronously in the
    // effect body (react-hooks/set-state-in-effect) - mirrors CarSettingsView.
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  const selectSession = (id: string) => {
    setSelectedId(id);
    setFrames([]);
    setFrameIndex(0);
    setPlaying(false);
    sessionApi.frames(id).then(setFrames).catch((e) => setError(String(e)));
  };

  const [exportingBuildKey, setExportingBuildKey] = useState<string | null>(null);

  const handleExportAnalysis = async (buildKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingBuildKey(buildKey);
    setError(null);
    try {
      const report = await sessionApi.analysis(buildKey);
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rpm-analysis-${buildKey.replace(/:/g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err));
    } finally {
      setExportingBuildKey(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Hapus sesi ini?")) return;
    try {
      await sessionApi.remove(id);
      if (selectedId === id) {
        setSelectedId(null);
        setFrames([]);
      }
      refresh();
    } catch (err) {
      setError(String(err));
    }
  };

  // Playback: advances frameIndex on an interval scaled by `speed`, mirroring
  // roughly one telemetry frame's worth of real time (~16ms at 60Hz).
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const interval = window.setInterval(() => {
      setFrameIndex((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 16 / speed);
    return () => window.clearInterval(interval);
  }, [playing, speed, frames.length]);

  const groupedByBuild = useMemo(() => {
    const groups = new Map<string, SessionSummary[]>();
    for (const session of sessions) {
      const list = groups.get(session.buildKey) ?? [];
      list.push(session);
      groups.set(session.buildKey, list);
    }
    return Array.from(groups.entries());
  }, [sessions]);

  const currentFrame = frames[frameIndex] ?? null;
  const markers = useMemo(() => lapBoundaries(frames), [frames]);

  const rpmSpeedData = useMemo(
    (): [number[], number[], number[]] => [
      frames.map((_, i) => i),
      frames.map((f) => f.rpm),
      frames.map((f) => f.speed),
    ],
    [frames],
  );

  const throttleBrakeData = useMemo(
    (): [number[], number[], number[]] => [
      frames.map((_, i) => i),
      frames.map((f) => f.throttle * 100),
      frames.map((f) => f.brake * 100),
    ],
    [frames],
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-4">
      <div className="w-full max-w-6xl bg-gray-950 rounded-2xl border-4 border-gray-800 overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
        {/* Session list */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-gray-800 p-3 overflow-y-auto max-h-[600px]">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-3">
            Sesi Tersimpan
          </h2>
          {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
          {loading ? (
            <div className="text-gray-400 text-sm">Memuat...</div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Belum ada sesi terekam. Sesi otomatis mulai direkam saat kamu
              menjalankan event timed di game.
            </div>
          ) : (
            groupedByBuild.map(([buildKey, group]) => (
              <div key={buildKey} className="mb-4">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider truncate">
                    Build {buildKey}
                  </div>
                  <button
                    onClick={(e) => handleExportAnalysis(buildKey, e)}
                    disabled={exportingBuildKey === buildKey}
                    className="text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50 shrink-0"
                    title="Export analisis RPM (JSON) untuk build ini"
                  >
                    {exportingBuildKey === buildKey ? "..." : "⬇ Export"}
                  </button>
                </div>
                <ul className="space-y-1">
                  {group.map((session) => (
                    <li
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer border ${
                        selectedId === session.id
                          ? "bg-gray-800 border-blue-700"
                          : "bg-gray-900 border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div>
                        <div className="text-white text-xs font-semibold">
                          Car #{session.carOrdinal}
                        </div>
                        <div className="text-gray-500 text-[10px]">
                          {formatDuration(session)} · {session.frameCount} frame ·{" "}
                          <span className={STATUS_COLOR[session.status]}>
                            {STATUS_LABEL[session.status]}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="text-red-400 px-1 text-sm leading-none"
                        aria-label="Hapus sesi"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Replay / analysis */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[600px]">
          {!selectedSession ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Pilih sesi di sebelah kiri untuk replay & analisis.
            </div>
          ) : frames.length === 0 ? (
            <div className="text-gray-400 text-sm">Memuat frame...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                {/* Gauge.tsx renders a fixed 500x500 SVG with no viewBox, so
                    it can't be sized via a narrower container - `zoom`
                    reflows layout (unlike transform:scale), so the
                    container shrinks to fit without a manual crop box. */}
                <div style={{ zoom: 0.5 }}>
                  <Gauge
                    rpm={currentFrame?.rpm ?? 0}
                    rpmMax={selectedSession.maxRpm}
                    gear={handleGear(currentFrame?.gear ?? 0)}
                    speed={currentFrame?.speed ?? 0}
                    redline={selectedSession.maxRpm}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ValueDisplay
                  label="Throttle"
                  value={Math.round((currentFrame?.throttle ?? 0) * 100)}
                  unit="%"
                />
                <ValueDisplay
                  label="Brake"
                  value={Math.round((currentFrame?.brake ?? 0) * 100)}
                  unit="%"
                />
                <ValueDisplay label="Lap" value={currentFrame?.lapNumber ?? "-"} />
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded p-3">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="px-3 py-1 rounded bg-blue-700 text-white text-sm font-bold"
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, frames.length - 1)}
                  value={frameIndex}
                  onChange={(e) => {
                    setPlaying(false);
                    setFrameIndex(Number(e.target.value));
                  }}
                  className="flex-1"
                />
                <span className="text-gray-400 text-xs tabular-nums w-16 text-right">
                  {frameIndex + 1}/{frames.length}
                </span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700"
                >
                  {PLAYBACK_SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
              </div>

              {/* Analysis charts */}
              <div className="bg-gray-900 border border-gray-800 rounded p-2">
                <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 px-1">
                  RPM / Speed
                </div>
                <LineChart
                  data={rpmSpeedData}
                  series={[
                    { label: "RPM", color: "#22c55e" },
                    { label: "Speed (km/h)", color: "#3b82f6" },
                  ]}
                  markers={markers}
                />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded p-2">
                <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 px-1">
                  Throttle / Brake (%)
                </div>
                <LineChart
                  data={throttleBrakeData}
                  series={[
                    { label: "Throttle", color: "#22c55e" },
                    { label: "Brake", color: "#ef4444" },
                  ]}
                  markers={markers}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
