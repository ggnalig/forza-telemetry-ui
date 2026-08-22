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

    setSaving(true);
    try {
      if (initial) {
        await tuneApi.update(initial.id, { name, gearRatios });
      } else {
        await tuneApi.create(carOrdinal, name, gearRatios);
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
