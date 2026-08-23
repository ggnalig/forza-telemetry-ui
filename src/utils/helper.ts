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

// Forza's raw gear byte is 0 for both Neutral AND Reverse - it never
// distinguishes them on its own. The API's parser (src/udp/parser.ts) folds
// in the sign of the raw speed field (negative while reversing) to tell
// them apart, and reports Reverse as -1 (a sentinel the game itself never
// sends, since the raw byte is unsigned) - see that file's `isReversing`
// comment for why. 1-10 stay actual forward gears.
export const handleGear = (gear: number) => {
  if (gear === -1) return "R";
  if (gear >= 1 && gear <= 10) return gear.toString();
  return "N";
};
