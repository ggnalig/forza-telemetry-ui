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

// Confirmed empirically against real FH6 telemetry (an earlier hypothesis -
// that Reverse was signaled by a negative raw speed value - was tried and
// shown wrong live in-game): the raw gear byte is 0 = Reverse, 1-10 =
// forward gears, 11 = Neutral. Passed straight through from the API
// unchanged (see src/udp/parser.ts), so this is the only place that
// interprets the numbers.
export const handleGear = (gear: number) => {
  if (gear === 11) return "N";
  if (gear >= 1 && gear <= 10) return gear.toString();
  return "R";
};
