import React, { useState } from "react";
import type { GearboxTune } from "../types";
import { tuneApi } from "../services/tuneApi";

interface TuneFormProps {
  carOrdinal: number;
  initial: GearboxTune | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface RatioRow {
  gear: string;
  ratio: string;
}

interface GearRpmRow {
  gear: string;
  maxRpm: string;
}

/** Percent fields are edited as whole numbers (e.g. "90") and converted
 * to/from the 0-1 fractions GearboxTune actually stores. */
function percentToFraction(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n / 100;
}

export const TuneForm: React.FC<TuneFormProps> = ({
  carOrdinal,
  initial,
  onSaved,
  onCancel,
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [rows, setRows] = useState<RatioRow[]>(
    initial
      ? Object.entries(initial.gearRatios).map(([gear, ratio]) => ({
          gear,
          ratio: String(ratio),
        }))
      : [{ gear: "1", ratio: "" }],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initial?.maxRpmOverride ||
        initial?.redlineOverride ||
        initial?.shiftLightPercents ||
        initial?.maxRpmPerGearOverride,
    ),
  );
  const [maxRpmOverride, setMaxRpmOverride] = useState(
    initial?.maxRpmOverride !== undefined ? String(initial.maxRpmOverride) : "",
  );
  const [redlineOverride, setRedlineOverride] = useState(
    initial?.redlineOverride !== undefined ? String(initial.redlineOverride) : "",
  );
  const [light1Percent, setLight1Percent] = useState(
    initial?.shiftLightPercents ? String(Math.round(initial.shiftLightPercents.light1 * 100)) : "",
  );
  const [light2Percent, setLight2Percent] = useState(
    initial?.shiftLightPercents ? String(Math.round(initial.shiftLightPercents.light2 * 100)) : "",
  );
  const [redlinePercent, setRedlinePercent] = useState(
    initial?.shiftLightPercents ? String(Math.round(initial.shiftLightPercents.redline * 100)) : "",
  );
  const [gearRpmRows, setGearRpmRows] = useState<GearRpmRow[]>(
    initial?.maxRpmPerGearOverride
      ? Object.entries(initial.maxRpmPerGearOverride).map(([gear, maxRpm]) => ({
          gear,
          maxRpm: String(maxRpm),
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    const maxGear = rows.reduce((max, r) => Math.max(max, Number(r.gear) || 0), 0);
    setRows([...rows, { gear: String(maxGear + 1), ratio: "" }]);
  };

  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

  const updateRow = (index: number, field: keyof RatioRow, value: string) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addGearRpmRow = () => setGearRpmRows([...gearRpmRows, { gear: "1", maxRpm: "" }]);
  const removeGearRpmRow = (index: number) =>
    setGearRpmRows(gearRpmRows.filter((_, i) => i !== index));
  const updateGearRpmRow = (index: number, field: keyof GearRpmRow, value: string) => {
    setGearRpmRows(
      gearRpmRows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Nama tune wajib diisi");
      return;
    }

    const gearRatios: Record<number, number> = {};
    for (const row of rows) {
      const gear = Number(row.gear);
      const ratio = Number(row.ratio);
      if (!gear || !ratio || Number.isNaN(gear) || Number.isNaN(ratio)) {
        setError("Semua gigi/rasio harus diisi angka yang valid");
        return;
      }
      gearRatios[gear] = ratio;
    }
    if (Object.keys(gearRatios).length === 0) {
      setError("Minimal 1 gigi harus diisi");
      return;
    }

    let maxRpmPerGearOverride: Record<number, number> | undefined;
    if (gearRpmRows.length > 0) {
      maxRpmPerGearOverride = {};
      for (const row of gearRpmRows) {
        const gear = Number(row.gear);
        const maxRpm = Number(row.maxRpm);
        if (!gear || !maxRpm || Number.isNaN(gear) || Number.isNaN(maxRpm)) {
          setError("Override max RPM per gigi harus diisi angka yang valid");
          return;
        }
        maxRpmPerGearOverride[gear] = maxRpm;
      }
    }

    const light1 = percentToFraction(light1Percent);
    const light2 = percentToFraction(light2Percent);
    const redline = percentToFraction(redlinePercent);
    const shiftLightPercents =
      light1 !== undefined && light2 !== undefined && redline !== undefined
        ? { light1, light2, redline }
        : undefined;
    if ((light1 !== undefined || light2 !== undefined || redline !== undefined) && !shiftLightPercents) {
      setError("Isi ketiga persentase shift-light (atau kosongkan semuanya)");
      return;
    }

    const maxRpmOverrideValue = maxRpmOverride.trim() === "" ? undefined : Number(maxRpmOverride);
    const redlineOverrideValue = redlineOverride.trim() === "" ? undefined : Number(redlineOverride);

    setSaving(true);
    try {
      if (initial) {
        // `null` (not `undefined`) is how an edit tells the API "clear this
        // override" - JSON.stringify drops `undefined` keys entirely, so
        // they'd be indistinguishable from "field not touched" over the
        // wire (see tune-api-server.ts's PUT handler).
        await tuneApi.update(initial.id, {
          name,
          gearRatios,
          maxRpmOverride: maxRpmOverrideValue ?? null,
          redlineOverride: redlineOverrideValue ?? null,
          maxRpmPerGearOverride: maxRpmPerGearOverride ?? null,
          shiftLightPercents: shiftLightPercents ?? null,
        });
      } else {
        await tuneApi.create(carOrdinal, name, gearRatios, {
          maxRpmOverride: maxRpmOverrideValue,
          redlineOverride: redlineOverrideValue,
          maxRpmPerGearOverride,
          shiftLightPercents,
        });
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1">Nama tune</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder='misal "Skyline R33 - Biru"'
        className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white mb-4 outline-none focus:border-blue-600"
      />

      <label className="block text-gray-400 text-xs mb-1">
        Rasio gigi (dari menu Tuning Forza)
      </label>
      <div className="space-y-2 mb-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="number"
              value={row.gear}
              onChange={(e) => updateRow(i, "gear", e.target.value)}
              placeholder="Gigi"
              className="w-20 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
            />
            <input
              type="number"
              step="0.001"
              value={row.ratio}
              onChange={(e) => updateRow(i, "ratio", e.target.value)}
              placeholder="Rasio"
              className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
            />
            <button
              onClick={() => removeRow(i)}
              className="text-red-400 px-2 text-lg leading-none"
              aria-label="Hapus gigi ini"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="text-sm text-blue-400 mb-4">
        + Tambah gigi
      </button>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full text-left text-xs text-gray-400 hover:text-gray-200 mb-3 uppercase tracking-wider"
      >
        {showAdvanced ? "▾" : "▸"} Override RPM Manual (opsional)
      </button>

      {showAdvanced && (
        <div className="mb-4 space-y-3 bg-gray-900/50 border border-gray-800 rounded p-3">
          <p className="text-gray-500 text-xs">
            Buat mengoreksi max RPM/redline kalau data dari game meleset -
            lihat hasil test <span className="text-gray-400">Rev Ceiling</span>{" "}
            di dashboard atau export analisis sesi buat acuan angkanya.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Override Max RPM</label>
              <input
                type="number"
                value={maxRpmOverride}
                onChange={(e) => setMaxRpmOverride(e.target.value)}
                placeholder="mis. 9499"
                className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Redline Manual</label>
              <input
                type="number"
                value={redlineOverride}
                onChange={(e) => setRedlineOverride(e.target.value)}
                placeholder="mis. 9000"
                className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">
              Shift-Light % (dari Max RPM - ala SimHub)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={light1Percent}
                onChange={(e) => setLight1Percent(e.target.value)}
                placeholder="Light 1 % (90)"
                className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
              />
              <input
                type="number"
                value={light2Percent}
                onChange={(e) => setLight2Percent(e.target.value)}
                placeholder="Light 2 % (95)"
                className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
              />
              <input
                type="number"
                value={redlinePercent}
                onChange={(e) => setRedlinePercent(e.target.value)}
                placeholder="Redline % (96)"
                className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">
              Override Max RPM per Gigi (jarang dipakai)
            </label>
            <div className="space-y-2">
              {gearRpmRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={row.gear}
                    onChange={(e) => updateGearRpmRow(i, "gear", e.target.value)}
                    placeholder="Gigi"
                    className="w-20 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
                  />
                  <input
                    type="number"
                    value={row.maxRpm}
                    onChange={(e) => updateGearRpmRow(i, "maxRpm", e.target.value)}
                    placeholder="Max RPM"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white outline-none focus:border-blue-600"
                  />
                  <button
                    onClick={() => removeGearRpmRow(i)}
                    className="text-red-400 px-2 text-lg leading-none"
                    aria-label="Hapus override gigi ini"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addGearRpmRow} className="text-sm text-blue-400 mt-2">
              + Tambah override gigi
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded bg-blue-700 text-white font-semibold disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded bg-gray-700 text-white font-semibold"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
