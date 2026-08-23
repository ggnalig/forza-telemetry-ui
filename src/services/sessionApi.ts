import type { SessionSummary, SessionFrame, RpmAnalysisReport, RecordingStatus } from "../types";

// Not hardcoded "localhost" - see useTelemetry.ts's DEFAULT_WS_URL comment.
const BASE_URL = `http://${window.location.hostname}:3003`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export const sessionApi = {
  list: (buildKey?: string) =>
    request<{ sessions: SessionSummary[] }>(
      buildKey ? `/sessions?buildKey=${encodeURIComponent(buildKey)}` : "/sessions",
    ).then((r) => r.sessions),

  get: (id: string) =>
    request<{ session: SessionSummary }>(`/sessions/${id}`).then((r) => r.session),

  frames: (id: string, lap?: number) =>
    request<{ frames: SessionFrame[] }>(
      lap !== undefined ? `/sessions/${id}/frames?lap=${lap}` : `/sessions/${id}/frames`,
    ).then((r) => r.frames),

  remove: (id: string) =>
    request<{ success: boolean }>(`/sessions/${id}`, { method: "DELETE" }),

  analysis: (buildKey: string) =>
    request<{ report: RpmAnalysisReport }>(
      `/analysis?buildKey=${encodeURIComponent(buildKey)}`,
    ).then((r) => r.report),

  // Recording is a manual on/off toggle (the "Record" button) - neither
  // isRaceOn nor lap.number reliably distinguishes a timed event from
  // free-roam driving (confirmed in-game), so there's no way to infer this
  // automatically; see the API's session-recorder.ts doc comment.
  recordingStatus: () => request<RecordingStatus>("/recording"),
  startRecording: () => request<RecordingStatus>("/recording/start", { method: "POST" }),
  stopRecording: () => request<RecordingStatus>("/recording/stop", { method: "POST" }),
};
