import React, { useState } from "react";
import type { GearboxTune } from "../types";
import { tuneApi } from "../services/tuneApi";
import { SliderInput } from "./SliderInput";

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

// Row position IS the gear number - no manual gear-number input. Row 0 is
// the combined "N/R" bucket (see processor.ts's `perGearKey` - Neutral and
// the -1 Reverse sentinel share this one entry), row i>=1 is forward gear i.
const gearRpmLabel = (index: number) => (index === 0 ? "N/R" : String(index));

const RPM_SLIDER_MIN = 0;
const RPM_SLIDER_MAX = 20000;
const RPM_SLIDER_STEP = 50;
const PERCENT_SLIDER_MIN = 0;
const PERCENT_SLIDER_MAX = 100;

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

  // Each override is an explicit on/off toggle (like SimHub's per-field
  // toggle) rather than "empty string means off" - clearer intent, and the
  // slider always has a real number to show even before being enabled.
  const [maxRpmOverrideOn, setMaxRpmOverrideOn] = useState(initial?.maxRpmOverride !== undefined);
  const [maxRpmOverride, setMaxRpmOverride] = useState(initial?.maxRpmOverride ?? 9000);

  const [redlineOverrideOn, setRedlineOverrideOn] = useState(initial?.redlineOverride !== undefined);
  const [redlineOverride, setRedlineOverride] = useState(initial?.redlineOverride ?? 9000);

  const [shiftLightOn, setShiftLightOn] = useState(Boolean(initial?.shiftLightPercents));
  const [light1Percent, setLight1Percent] = useState(
    Math.round((initial?.shiftLightPercents?.light1 ?? 0.9) * 100),
  );
  const [light2Percent, setLight2Percent] = useState(
    Math.round((initial?.shiftLightPercents?.light2 ?? 0.95) * 100),
  );
  const [redlinePercent, setRedlinePercent] = useState(
    Math.round((initial?.shiftLightPercents?.redline ?? 0.96) * 100),
  );

  const [perGearOn, setPerGearOn] = useState(Boolean(initial?.maxRpmPerGearOverride));
  // Indexed by position: gearRpmRows[0] is the N/R bucket, gearRpmRows[i] is
  // forward gear i. Existing data is sorted by its old (possibly
  // user-typed, possibly sparse) gear-number keys and laid out positionally
  // from there - any gaps are compacted away once resaved through this UI.
  const [gearRpmRows, setGearRpmRows] = useState<number[]>(
    initial?.maxRpmPerGearOverride
      ? Object.entries(initial.maxRpmPerGearOverride)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, maxRpm]) => maxRpm)
      : [9000],
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

  const addGearRpmRow = () => setGearRpmRows([...gearRpmRows, 9000]);
  const removeGearRpmRow = (index: number) =>
    setGearRpmRows(gearRpmRows.filter((_, i) => i !== index));
  const updateGearRpmValue = (index: number, maxRpm: number) => {
    setGearRpmRows(gearRpmRows.map((v, i) => (i === index ? maxRpm : v)));
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
    if (perGearOn) {
      maxRpmPerGearOverride = {};
      gearRpmRows.forEach((maxRpm, gear) => {
        maxRpmPerGearOverride![gear] = maxRpm;
      });
    }

    const shiftLightPercents = shiftLightOn
      ? { light1: light1Percent / 100, light2: light2Percent / 100, redline: redlinePercent / 100 }
      : undefined;

    const maxRpmOverrideValue = maxRpmOverrideOn ? maxRpmOverride : undefined;
    const redlineOverrideValue = redlineOverrideOn ? redlineOverride : undefined;

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
      <button onClick={addRow} className="text-sm text-blue-400 mb-5">
        + Tambah gigi
      </button>

      <div className="space-y-5 bg-gray-900/50 border border-gray-800 rounded p-3">
        <p className="text-gray-500 text-xs">
          Override RPM manual - buat mengoreksi max RPM/redline kalau data dari
          game meleset. Lihat <span className="text-gray-400">Rev Ceiling</span>{" "}
          di Home atau export analisis sesi buat acuan angkanya.
        </p>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={maxRpmOverrideOn}
            onChange={(e) => setMaxRpmOverrideOn(e.target.checked)}
          />
          Override maximum RPM
        </label>
        <SliderInput
          label="Max RPM"
          value={maxRpmOverride}
          min={RPM_SLIDER_MIN}
          max={RPM_SLIDER_MAX}
          step={RPM_SLIDER_STEP}
          unit="RPM"
          onChange={setMaxRpmOverride}
          disabled={!maxRpmOverrideOn}
        />

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={redlineOverrideOn}
            onChange={(e) => setRedlineOverrideOn(e.target.checked)}
          />
          Redline manual (independen dari Max RPM)
        </label>
        <SliderInput
          label="Redline"
          value={redlineOverride}
          min={RPM_SLIDER_MIN}
          max={RPM_SLIDER_MAX}
          step={RPM_SLIDER_STEP}
          unit="RPM"
          onChange={setRedlineOverride}
          disabled={!redlineOverrideOn}
        />

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={shiftLightOn}
            onChange={(e) => setShiftLightOn(e.target.checked)}
          />
          Shift-light % khusus tune ini (ala SimHub, default pakai General Settings)
        </label>
        <div className="space-y-3 pl-1">
          <SliderInput
            label="Shift light 1 %"
            value={light1Percent}
            min={PERCENT_SLIDER_MIN}
            max={PERCENT_SLIDER_MAX}
            unit="%"
            onChange={setLight1Percent}
            disabled={!shiftLightOn}
          />
          <SliderInput
            label="Shift light 2 %"
            value={light2Percent}
            min={PERCENT_SLIDER_MIN}
            max={PERCENT_SLIDER_MAX}
            unit="%"
            onChange={setLight2Percent}
            disabled={!shiftLightOn}
          />
          <SliderInput
            label="Redline %"
            value={redlinePercent}
            min={PERCENT_SLIDER_MIN}
            max={PERCENT_SLIDER_MAX}
            unit="%"
            onChange={setRedlinePercent}
            disabled={!shiftLightOn}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={perGearOn}
            onChange={(e) => setPerGearOn(e.target.checked)}
          />
          Per gear redline definition (jarang dipakai)
        </label>
        {perGearOn && (
          <div className="space-y-3 pl-1">
            {gearRpmRows.map((maxRpm, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <SliderInput
                    label={`Gigi ${gearRpmLabel(i)}`}
                    value={maxRpm}
                    min={RPM_SLIDER_MIN}
                    max={RPM_SLIDER_MAX}
                    step={RPM_SLIDER_STEP}
                    unit="RPM"
                    onChange={(v) => updateGearRpmValue(i, v)}
                  />
                </div>
                <button
                  onClick={() => removeGearRpmRow(i)}
                  className="text-red-400 px-2 text-lg leading-none self-end mb-1"
                  aria-label="Hapus override gigi ini"
                >
                  &times;
                </button>
              </div>
            ))}
            <button onClick={addGearRpmRow} className="text-sm text-blue-400">
              + Tambah gigi ({gearRpmLabel(gearRpmRows.length)})
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-red-400 text-sm my-3">{error}</div>}

      <div className="flex gap-2 mt-4">
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
