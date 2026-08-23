import React, { useEffect, useMemo, useState } from "react";
import type uPlot from "uplot";
import type { SessionSummary, SessionFrame } from "../types";
import { sessionApi } from "../services/sessionApi";
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

const NO_TUNE_LABEL = "Tanpa Tune";

type Metric = "rpm" | "speed" | "throttle" | "brake";

const METRIC_LABEL: Record<Metric, string> = {
  rpm: "RPM",
  speed: "Speed (km/h)",
  throttle: "Throttle (%)",
  brake: "Brake (%)",
};

// Cycled per selected session in the overlay chart - not tied to any
// particular metric's meaning (unlike the old fixed RPM=green/Speed=blue).
const OVERLAY_COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

function formatDuration(session: SessionSummary): string {
  const end = session.endedAt ?? Date.now();
  const seconds = Math.max(0, Math.round((end - session.startedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function carLabel(session: SessionSummary): string {
  return session.carInfo?.displayName ?? `Car #${session.carOrdinal}`;
}

function sessionLabel(session: SessionSummary): string {
  return `${carLabel(session)} · ${new Date(session.startedAt).toLocaleTimeString()}`;
}

function metricValue(frame: SessionFrame, metric: Metric): number {
  switch (metric) {
    case "rpm":
      return frame.rpm;
    case "speed":
      return frame.speed;
    case "throttle":
      return frame.throttle * 100;
    case "brake":
      return frame.brake * 100;
  }
}

/** Frame indices where lap.number changes from the previous frame - drawn as
 * vertical markers on the analysis chart. Only meaningful with exactly one
 * session selected (each session has its own lap numbering). */
function lapBoundaries(frames: SessionFrame[]): number[] {
  const boundaries: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].lapNumber !== frames[i - 1].lapNumber) {
      boundaries.push(i);
    }
  }
  return boundaries;
}

export const SessionsView: React.FC = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [framesById, setFramesById] = useState<Record<string, SessionFrame[]>>({});
  const [metric, setMetric] = useState<Metric>("rpm");
  const [exportingBuildKey, setExportingBuildKey] = useState<string | null>(null);

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

  const toggleSession = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    if (!framesById[id]) {
      sessionApi
        .frames(id)
        .then((frames) => setFramesById((prev) => ({ ...prev, [id]: frames })))
        .catch((e) => setError(String(e)));
    }
  };

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
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refresh();
    } catch (err) {
      setError(String(err));
    }
  };

  // Grouped by build (== by tune, or by raw car config when untuned - see
  // computeBuildKey/processor.ts), ordered tune-name-first then car-name, per
  // the user's explicit ask ("diawali nama tuningan - nama mobil").
  const groupedByBuild = useMemo(() => {
    const groups = new Map<string, SessionSummary[]>();
    for (const session of sessions) {
      const list = groups.get(session.buildKey) ?? [];
      list.push(session);
      groups.set(session.buildKey, list);
    }
    return Array.from(groups.entries()).sort(([, a], [, b]) => {
      const tuneA = a[0].tuneName ?? NO_TUNE_LABEL;
      const tuneB = b[0].tuneName ?? NO_TUNE_LABEL;
      if (tuneA !== tuneB) return tuneA.localeCompare(tuneB);
      return carLabel(a[0]).localeCompare(carLabel(b[0]));
    });
  }, [sessions]);

  const selectedSessions = selectedIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter((s): s is SessionSummary => Boolean(s));

  const overlayData = useMemo((): uPlot.AlignedData => {
    const seriesFrames = selectedSessions.map((s) => framesById[s.id] ?? []);
    const maxLen = Math.max(0, ...seriesFrames.map((f) => f.length));
    const x = Array.from({ length: maxLen }, (_, i) => i);
    const series = seriesFrames.map((frames) =>
      Array.from({ length: maxLen }, (_, i) => (i < frames.length ? metricValue(frames[i], metric) : null)),
    );
    return [x, ...series] as uPlot.AlignedData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessions.map((s) => s.id).join(","), framesById, metric]);

  const markers = useMemo(() => {
    if (selectedSessions.length !== 1) return [];
    return lapBoundaries(framesById[selectedSessions[0].id] ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessions.map((s) => s.id).join(","), framesById]);

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mx-auto">
        <h1 className="text-white text-xl font-bold mb-3">Sessions</h1>
        <div className="flex gap-1 mb-4 border-b border-gray-800">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-3">
            Sesi Tersimpan
          </h2>
        </div>
        <div className="flex gap-4 h-[calc(100vh-140px)]">
          {/* Session list, grouped tune -> car */}
          <div className="w-80 shrink-0 border border-gray-800 rounded bg-gray-950 overflow-y-auto p-3">
            
            {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
            {loading ? (
              <div className="text-gray-400 text-sm">Memuat...</div>
            ) : sessions.length === 0 ? (
              <div className="text-gray-500 text-sm">
                Belum ada sesi terekam. Tekan Record di Home untuk mulai merekam.
              </div>
            ) : (
              groupedByBuild.map(([buildKey, group]) => (
                <div key={buildKey} className="mb-4">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="text-gray-400 text-[10px] uppercase tracking-wider truncate">
                      {group[0].tuneName ?? NO_TUNE_LABEL} - {carLabel(group[0])}
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
                        className={`flex items-center gap-2 p-2 rounded border ${
                          selectedIds.includes(session.id)
                            ? "bg-gray-800 border-blue-700"
                            : "bg-gray-900 border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(session.id)}
                          onChange={() => toggleSession(session.id)}
                          className="accent-blue-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleSession(session.id)}>
                          <div className="text-white text-xs font-semibold truncate">
                            {new Date(session.startedAt).toLocaleString()}
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
                          className="text-red-400 px-1 text-sm leading-none shrink-0"
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

          {/* Analysis - no tachometer, pure charts */}
          <div className="flex-1 min-w-0 border border-gray-800 rounded bg-gray-950 p-4 overflow-y-auto">
            {selectedSessions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                Centang satu atau lebih sesi di sebelah kiri untuk analisis. Bisa
                pilih lebih dari satu sesi buat dibandingkan (overlay).
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded p-3">
                  <span className="text-gray-400 text-xs">Metrik:</span>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as Metric)}
                    className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700"
                  >
                    {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
                      <option key={m} value={m}>
                        {METRIC_LABEL[m]}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-[10px] ml-auto">
                    {selectedSessions.length} sesi dipilih
                  </span>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded p-2">
                  <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 px-1">
                    {METRIC_LABEL[metric]} - overlay per frame
                  </div>
                  <LineChart
                    data={overlayData}
                    series={selectedSessions.map((s, i) => ({
                      label: sessionLabel(s),
                      color: OVERLAY_COLORS[i % OVERLAY_COLORS.length],
                    }))}
                    markers={markers}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
