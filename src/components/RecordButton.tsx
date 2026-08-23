import React, { useEffect, useState } from "react";
import { sessionApi } from "../services/sessionApi";

/**
 * Manual session-recording toggle. Deliberately NOT automatic - neither
 * isRaceOn nor lap.number reliably distinguishes a timed event from
 * ordinary free-roam driving (confirmed in-game), so there's no telemetry
 * signal left to infer "record this" from. See the API's
 * session-recorder.ts doc comment for the full story.
 */
export const RecordButton: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Deferred so the initial setState doesn't happen synchronously in the
    // effect body (react-hooks/set-state-in-effect) - mirrors CarSettingsView.
    const timer = window.setTimeout(() => {
      sessionApi
        .recordingStatus()
        .then((status) => setRecording(status.recording))
        .catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      const status = recording
        ? await sessionApi.stopRecording()
        : await sessionApi.startRecording();
      setRecording(status.recording);
    } catch (e) {
      console.error("Failed to toggle recording", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`absolute top-1.5 right-24 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 disabled:opacity-50 ${
        recording ? "text-red-500" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          recording ? "bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" : "bg-gray-600"
        }`}
      />
      {recording ? "Recording" : "Record"}
    </button>
  );
};
