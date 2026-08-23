import React, { useEffect, useMemo, useState } from "react";
import type { TuneWithCarInfo } from "../types";
import { tuneApi } from "../services/tuneApi";
import { TuneForm } from "./TuneForm";
import { SliderInput } from "./SliderInput";

type Tab = "general" | "perCar";

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold border-b-2 ${
      active ? "border-blue-600 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
    }`}
  >
    {children}
  </button>
);

const GeneralSettingsTab: React.FC = () => {
  const [light1Percent, setLight1Percent] = useState(90);
  const [light2Percent, setLight2Percent] = useState(95);
  const [redlinePercent, setRedlinePercent] = useState(96);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      tuneApi
        .getGeneralSettings()
        .then((s) => {
          setLight1Percent(Math.round(s.shiftLightPercents.light1 * 100));
          setLight2Percent(Math.round(s.shiftLightPercents.light2 * 100));
          setRedlinePercent(Math.round(s.shiftLightPercents.redline * 100));
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await tuneApi.setGeneralSettings({
        shiftLightPercents: {
          light1: light1Percent / 100,
          light2: light2Percent / 100,
          redline: redlinePercent / 100,
        },
      });
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Memuat...</div>;

  return (
    <div className="max-w-xl space-y-5">
      <p className="text-gray-500 text-xs">
        Default shift-light % yang dipakai kalau tune yang aktif gak punya
        setting sendiri - berlaku global untuk semua mobil (ala SimHub's
        General Settings). 90/95/96% adalah default bawaan.
      </p>
      <SliderInput
        label="Shift light 1 %"
        value={light1Percent}
        min={0}
        max={100}
        unit="%"
        onChange={setLight1Percent}
      />
      <SliderInput
        label="Shift light 2 %"
        value={light2Percent}
        min={0}
        max={100}
        unit="%"
        onChange={setLight2Percent}
      />
      <SliderInput
        label="Redline %"
        value={redlinePercent}
        min={0}
        max={100}
        unit="%"
        onChange={setRedlinePercent}
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {saved && !error && <div className="text-green-400 text-sm">Tersimpan.</div>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-700 text-white font-semibold disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
};

const PerCarOverridesTab: React.FC = () => {
  const [tunes, setTunes] = useState<TuneWithCarInfo[]>([]);
  const [activeByCarOrdinal, setActiveByCarOrdinal] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTuneId, setSelectedTuneId] = useState<string | null>(null);
  const [creatingForCarOrdinal, setCreatingForCarOrdinal] = useState<number | null>(null);
  const [newCarOrdinalInput, setNewCarOrdinalInput] = useState("");

  const refresh = () => {
    setLoading(true);
    tuneApi
      .listAll()
      .then(async (all) => {
        setTunes(all);
        const carOrdinals = [...new Set(all.map((t) => t.carOrdinal))];
        const entries = await Promise.all(
          carOrdinals.map(async (ordinal) => [ordinal, (await tuneApi.getActive(ordinal))?.id ?? null] as const),
        );
        setActiveByCarOrdinal(Object.fromEntries(entries));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const groupedByCar = useMemo(() => {
    const groups = new Map<number, TuneWithCarInfo[]>();
    for (const tune of tunes) {
      const list = groups.get(tune.carOrdinal) ?? [];
      list.push(tune);
      groups.set(tune.carOrdinal, list);
    }
    return Array.from(groups.entries());
  }, [tunes]);

  const selectedTune = tunes.find((t) => t.id === selectedTuneId) ?? null;

  const handleActivate = async (tune: TuneWithCarInfo) => {
    setError(null);
    try {
      if (activeByCarOrdinal[tune.carOrdinal] === tune.id) {
        await tuneApi.deactivate(tune.carOrdinal);
      } else {
        await tuneApi.activate(tune.id);
      }
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (tune: TuneWithCarInfo) => {
    if (!window.confirm(`Hapus tune "${tune.name}"?`)) return;
    setError(null);
    try {
      await tuneApi.remove(tune.id);
      if (selectedTuneId === tune.id) setSelectedTuneId(null);
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddCar = () => {
    const ordinal = Number(newCarOrdinalInput);
    if (!ordinal || Number.isNaN(ordinal)) return;
    setSelectedTuneId(null);
    setCreatingForCarOrdinal(ordinal);
    setNewCarOrdinalInput("");
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Tree: Car (ordinal + name) -> Tune (name) */}
      <div className="w-72 shrink-0 border border-gray-800 rounded bg-gray-950 overflow-y-auto p-3">
        <div className="flex gap-1 mb-3">
          <input
            value={newCarOrdinalInput}
            onChange={(e) => setNewCarOrdinalInput(e.target.value)}
            placeholder="Car ordinal"
            type="number"
            className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-600"
          />
          <button
            onClick={handleAddCar}
            className="text-xs px-2 py-1 rounded bg-blue-700 text-white font-semibold shrink-0"
          >
            + Mobil baru
          </button>
        </div>

        {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
        {loading ? (
          <div className="text-gray-400 text-sm">Memuat...</div>
        ) : groupedByCar.length === 0 ? (
          <div className="text-gray-500 text-xs">
            Belum ada tune. Masukkan car ordinal di atas buat mulai.
          </div>
        ) : (
          groupedByCar.map(([carOrdinal, carTunes]) => (
            <div key={carOrdinal} className="mb-3">
              <div className="text-gray-300 text-xs font-bold uppercase tracking-wider mb-1 truncate">
                {carTunes[0].carInfo?.displayName ?? `Car #${carOrdinal}`}
              </div>
              <ul className="space-y-1">
                {carTunes.map((tune) => (
                  <li
                    key={tune.id}
                    onClick={() => {
                      setCreatingForCarOrdinal(null);
                      setSelectedTuneId(tune.id);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm ${
                      selectedTuneId === tune.id
                        ? "bg-blue-700 text-white"
                        : "text-gray-300 hover:bg-gray-900"
                    }`}
                  >
                    <span className="truncate">{tune.name}</span>
                    {activeByCarOrdinal[carOrdinal] === tune.id && (
                      <span className="text-[10px] text-green-400 font-bold shrink-0 ml-1">AKTIF</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Selected tune's editor */}
      <div className="flex-1 min-w-0 border border-gray-800 rounded bg-gray-950 p-4 overflow-y-auto">
        {creatingForCarOrdinal !== null ? (
          <TuneForm
            carOrdinal={creatingForCarOrdinal}
            initial={null}
            onSaved={() => {
              setCreatingForCarOrdinal(null);
              refresh();
            }}
            onCancel={() => setCreatingForCarOrdinal(null)}
          />
        ) : selectedTune ? (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleActivate(selectedTune)}
                className={`text-xs px-3 py-1.5 rounded font-bold ${
                  activeByCarOrdinal[selectedTune.carOrdinal] === selectedTune.id
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {activeByCarOrdinal[selectedTune.carOrdinal] === selectedTune.id ? "AKTIF" : "Aktifkan"}
              </button>
              <button
                onClick={() => handleDelete(selectedTune)}
                className="text-xs px-3 py-1.5 rounded bg-red-900 text-red-200 font-bold"
              >
                Hapus Tune
              </button>
            </div>
            <TuneForm
              key={selectedTune.id}
              carOrdinal={selectedTune.carOrdinal}
              initial={selectedTune}
              onSaved={refresh}
              onCancel={() => setSelectedTuneId(null)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Pilih tune di sebelah kiri, atau tambah mobil baru buat mulai.
          </div>
        )}
      </div>
    </div>
  );
};

export const CarSettingsView: React.FC = () => {
  const [tab, setTab] = useState<Tab>("perCar");

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mx-auto">
        <h1 className="text-white text-xl font-bold mb-3">Car Settings</h1>
        <div className="flex gap-1 mb-4 border-b border-gray-800">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            General Settings
          </TabButton>
          <TabButton active={tab === "perCar"} onClick={() => setTab("perCar")}>
            Per Car Overrides
          </TabButton>
        </div>
        {tab === "general" ? <GeneralSettingsTab /> : <PerCarOverridesTab />}
      </div>
    </div>
  );
};
