import React from "react";

interface ValueDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  align?: "left" | "right";
  highlight?: string;
  blink?: boolean;
}

export const ValueDisplay: React.FC<ValueDisplayProps> = ({
  label,
  value,
  unit,
  align = "left",
  highlight,
  blink = false,
}) => {
  return (
    <div
      className={`flex flex-col ${align === "right" ? "items-end" : "items-start"} p-2 border border-gray-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)] bg-olive-100 h-28 ${blink ? "animate-blink-bg-red" : ""}`}
    >
      <div className="flex items-baseline gap-1">
        <span
          className={`text-7xl font-bold text-black font-digital tracking-tighter ${highlight}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-3xl font-semibold text-black">{unit}</span>
        )}
      </div>
      <span className="text-xl font-bold text-black uppercase">{label}</span>
    </div>
  );
};
