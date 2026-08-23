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

// Forza's gear byte: 0 = neutral, 1-10 = forward gears. Reverse isn't
// confirmed to have a distinct encoding in this telemetry format, so any
// value outside that range falls back to "N" defensively rather than
// guessing.
export const handleGear = (gear: number) => {
  if (gear >= 1 && gear <= 10) return gear.toString();
  return "N";
};
