import type { GearboxTune, ShiftLightPercents, TuneWithCarInfo, GeneralSettings } from "../types";

// Not hardcoded "localhost" - see useTelemetry.ts's DEFAULT_WS_URL comment
// for why (a phone opening this page via the PC's LAN IP needs that same
// host here too, not its own localhost).
const BASE_URL = `http://${window.location.hostname}:3002`;

interface GearboxTuneOverrides {
  maxRpmOverride?: number;
  maxRpmPerGearOverride?: Record<number, number>;
  redlineOverride?: number;
  shiftLightPercents?: ShiftLightPercents;
}

/** Same fields, but allowing `null` too - the wire sentinel for "clear this
 * override" on an update (see tune-api-server.ts's PUT handler; JSON.stringify
 * drops `undefined` keys entirely, so `null` is the only way to express
 * "explicitly cleared" over HTTP). */
interface GearboxTuneOverrideUpdates {
  maxRpmOverride?: number | null;
  maxRpmPerGearOverride?: Record<number, number> | null;
  redlineOverride?: number | null;
  shiftLightPercents?: ShiftLightPercents | null;
}

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

export const tuneApi = {
  list: (carOrdinal: number) =>
    request<{ tunes: GearboxTune[] }>(`/tunes?carOrdinal=${carOrdinal}`).then(
      (r) => r.tunes,
    ),

  // Every tune across every car, car name resolved server-side - the Car
  // Settings tree's data source.
  listAll: () =>
    request<{ tunes: TuneWithCarInfo[] }>("/tunes/all").then((r) => r.tunes),

  getActive: (carOrdinal: number) =>
    request<{ tune: GearboxTune | null }>(`/tunes/active?carOrdinal=${carOrdinal}`).then(
      (r) => r.tune,
    ),

  getGeneralSettings: () => request<GeneralSettings>("/settings/general"),

  setGeneralSettings: (settings: GeneralSettings) =>
    request<GeneralSettings>("/settings/general", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  create: (
    carOrdinal: number,
    name: string,
    gearRatios: Record<number, number>,
    overrides: GearboxTuneOverrides = {},
  ) =>
    request<{ tune: GearboxTune }>("/tunes", {
      method: "POST",
      body: JSON.stringify({ carOrdinal, name, gearRatios, ...overrides }),
    }).then((r) => r.tune),

  update: (
    id: string,
    updates: { name?: string; gearRatios?: Record<number, number> } & GearboxTuneOverrideUpdates,
  ) =>
    request<{ tune: GearboxTune }>(`/tunes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }).then((r) => r.tune),

  remove: (id: string) =>
    request<{ success: boolean }>(`/tunes/${id}`, { method: "DELETE" }),

  activate: (id: string) =>
    request<{ tune: GearboxTune }>(`/tunes/${id}/activate`, {
      method: "POST",
    }).then((r) => r.tune),

  deactivate: (carOrdinal: number) =>
    request<{ success: boolean }>("/tunes/deactivate", {
      method: "POST",
      body: JSON.stringify({ carOrdinal }),
    }),
};
