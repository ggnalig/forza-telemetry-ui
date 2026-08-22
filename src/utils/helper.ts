export const highlightPercentageValue = (value: number) => {
  if (isNaN(value)) return "text-gray-500";
  switch (true) {
    case value < 10:
      return "text-red-500";
    case value > 10:
      return "none";
    default:
      return "text-gray-500";
  }
};

export const highlightShiftRecommendation = (recommendation: string) => {
  if (recommendation === "UP") return "animate-blink-bg-green";
  if (recommendation === "DOWN") return "animate-blink-bg-red";
  return "none";
};

// Forza's gear byte: 0 = neutral, 1-10 = forward gears (per the API's own
// MAX_SUPPORTED_GEAR). Reverse isn't confirmed to have a distinct encoding
// in this telemetry format, so any value outside that range falls back to
// "N" defensively rather than guessing.
export const handleGear = (gear: number) => {
  if (gear >= 1 && gear <= 10) return gear.toString();
  return "N";
};
