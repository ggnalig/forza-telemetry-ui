import type { SessionSummary, SessionFrame } from "../types";

const BASE_URL = "http://localhost:3003";

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
};
