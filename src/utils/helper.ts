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

export const handleShiftRecommendation = (recommendation: string) => {
  if (recommendation === "WAIT") return "WAIT";
  if (recommendation === "UP") return "UP";
  if (recommendation === "DOWN") return "DOWN";
  return "WAIT";
};

export const handleGear = (gear: number) => {
  if (gear === 0) return "R";
  if (gear === 11) return "N";
  return gear.toString();
};
