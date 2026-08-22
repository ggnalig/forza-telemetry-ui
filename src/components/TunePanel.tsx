import React, { useEffect, useState } from "react";
import type { GearboxTune } from "../types";
import { tuneApi } from "../services/tuneApi";
import { TuneForm } from "./TuneForm";

interface TunePanelProps {
  carOrdinal: number;
  activeTuneId: string | null;
  onClose: () => void;
}

export const TunePanel: React.FC<TunePanelProps> = ({
  carOrdinal,
  activeTuneId,
  onClose,
}) => {
  const [tunes, setTunes] = useState<GearboxTune[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GearboxTune | "new" | null>(null);

  const refresh = () => {
    setLoading(true);
    tuneApi
      .list(carOrdinal)
      .then(setTunes)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Deferred so the initial setState doesn't happen synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carOrdinal]);

  const handleActivate = async (tune: GearboxTune) => {
    setError(null);
    try {
      if (activeTuneId === tune.id) {
        await tuneApi.deactivate(carOrdinal);
      } else {
        await tuneApi.activate(tune.id);
      }
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (tune: GearboxTune) => {
    if (!window.confirm(`Hapus tune "${tune.name}"?`)) return;
    setError(null);
    try {
      await tuneApi.remove(tune.id);
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border-2 border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">Gearbox Tunes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

        {editing ? (
          <TuneForm
            carOrdinal={carOrdinal}
            initial={editing === "new" ? null : editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            {loading ? (
              <div className="text-gray-400">Memuat...</div>
            ) : tunes.length === 0 ? (
              <div className="text-gray-400 text-sm mb-4">
                Belum ada tune tersimpan buat mobil ini.
              </div>
            ) : (
              <ul className="space-y-2 mb-4">
                {tunes.map((tune) => (
                  <li
                    key={tune.id}
                    className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded p-3"
                  >
                    <div>
                      <div className="text-white font-semibold">{tune.name}</div>
                      <div className="text-gray-500 text-xs">
                        {Object.keys(tune.gearRatios).length} gigi
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleActivate(tune)}
                        className={`text-xs px-2 py-1 rounded font-bold ${
                          activeTuneId === tune.id
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {activeTuneId === tune.id ? "AKTIF" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => setEditing(tune)}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tune)}
                        className="text-xs px-2 py-1 rounded bg-red-900 text-red-200"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setEditing("new")}
              className="w-full py-2 rounded bg-blue-700 text-white font-semibold"
            >
              + Tune Baru
            </button>
          </>
        )}
      </div>
    </div>
  );
};
