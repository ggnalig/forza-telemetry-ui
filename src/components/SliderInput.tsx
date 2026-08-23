import React from "react";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Range slider + synced number box, matching the SimHub reference's
 * slider+box override editing style - used for every RPM/percent field in
 * Car Settings from here on instead of a bare number input. */
export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled = false,
}) => {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <label className="block text-gray-400 text-xs mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <div className="flex items-center gap-1 shrink-0 w-28">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-sm outline-none focus:border-blue-600 disabled:opacity-50"
          />
          {unit && <span className="text-gray-500 text-xs">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
