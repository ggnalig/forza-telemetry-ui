import React, { useMemo } from "react";
import HalteggLogo from "../assets/haltegg-logo.png";

interface GaugeProps {
  rpm: number;
  rpmMax: number;
  gear: string;
  speed: number;
  redline: number;
}

export const Gauge: React.FC<GaugeProps> = ({
  rpm,
  rpmMax,
  gear,
  speed,
  redline,
}) => {
  const radius = 210; // Increased radius for 400x400 SVG
  const strokeWidth = 80; // Slightly thicker track
  const cx = 250; // Center X for 400 width
  const cy = 250; // Center Y for 400 height

  // Visual background arc (from bottom cut 90 to right cut 360)
  const bgStartAngle = 90;
  const bgEndAngle = 360;

  // Logical RPM needle and tick arc (leaves empty padding near the cuts)
  const paddingAngle = 8; // Degrees of padding to stay away from the flat cut edges
  const logicalStartAngle = bgStartAngle + paddingAngle;
  const logicalEndAngle = bgEndAngle - paddingAngle;
  const totalAngle = logicalEndAngle - logicalStartAngle;

  const rpmNormalized = Math.min(Math.max(rpm, 0), rpmMax);
  const currentAngle =
    logicalStartAngle + (rpmNormalized / rpmMax) * totalAngle;

  const redlineAngle = logicalStartAngle + (redline / rpmMax) * totalAngle;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number,
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    r: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const start = polarToCartesian(x, y, r, startAngle);
    const end = polarToCartesian(x, y, r, endAngle);
    // If the angle is exactly the same, SVG might not draw anything or act weird,
    // but a 0-degree arc is naturally empty.
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      1,
      end.x,
      end.y,
    ].join(" ");
  };

  const ticks = useMemo(() => {
    const arr = [];

    // Dynamically calculate tick step for large RPM ranges (up to 6 digits)
    let tickStep = 1000;
    if (rpmMax >= 100000) tickStep = 10000;
    else if (rpmMax >= 20000) tickStep = 2000;

    const maxTick = Math.floor(rpmMax / tickStep);
    for (let i = 0; i <= maxTick; i++) {
      const rpmAtTick = i * tickStep;

      // Calculate the angle perfectly aligned with the real data
      const angle = logicalStartAngle + (rpmAtTick / rpmMax) * totalAngle;

      // Calculate exact coordinates along the radius
      const { x, y } = polarToCartesian(cx, cy, 210 - strokeWidth + 80, angle);

      // Determine text anchor based on angle to prevent overlap without shifting coordinates
      // Left side ticks -> anchor start (left aligned)
      // Right side ticks -> anchor end (right aligned)
      // Top/Bottom ticks -> anchor middle
      let anchor = "middle";
      let baseline = "middle";

      arr.push({ value: rpmAtTick / 1000, x, y, anchor, baseline });
    }
    return arr;
  }, [rpmMax, logicalStartAngle, totalAngle]);

  return (
    <div className="relative flex flex-col items-center justify-center bg-gray-950 rounded-full p-2 border-4 border-gray-800 shadow-[inset_0_0_40px_rgba(0,0,0,1)]">
      <svg width="500" height="500" className="drop-shadow-2xl">
        <circle
          cx={cx}
          cy={cy}
          r={130}
          strokeWidth={5}
          stroke="#eab308"
          fill="none"
          className="shadow-lg"
        />

        {/* Background Arc */}
        <path
          d={describeArc(cx, cy, radius, bgStartAngle, bgEndAngle)}
          fill="none"
          stroke="#f0f5e9" // gray-800
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        {/* Redline Arc Background */}
        <path
          d={describeArc(cx, cy, radius, redlineAngle, bgEndAngle)}
          fill="none"
          stroke="#7f1d1d" // red-900
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        {/* Active RPM Arc */}
        <path
          d={describeArc(cx, cy, radius, bgStartAngle, currentAngle)}
          fill="none"
          stroke={rpm >= redline ? "#ef4444" : "#eab308"} // red-500 : yellow-500
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        {/* Haltegg Logo */}
        <image
          href={HalteggLogo}
          x={cx - 80}
          y={cy - 110}
          width="160"
          height="90"
          opacity="0.8"
        />

        {/* Ticks */}
        {ticks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={tick.y}
            fill="#000000"
            fontSize="46"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-digital"
          >
            {tick.value}
          </text>
        ))}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={
            polarToCartesian(cx, cy, radius - strokeWidth + 90, currentAngle).x
          }
          y2={
            polarToCartesian(cx, cy, radius - strokeWidth + 90, currentAngle).y
          }
          stroke="#ef4444"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="14" fill="#ef4444" className="shadow-lg" />
        <circle cx={cx} cy={cy} r="6" fill="#111" />
      </svg>

      {/* Center Data */}
      <div
        className="absolute top-1/2 left-1/2 pointer-events-none overflow-hidden"
        style={{
          width: "250px",
          height: "250px",
          borderBottomRightRadius: "250px",
        }}
      >
        <div
          className="absolute flex flex-col pt-3 pl-3 bg-gray-800"
          style={{
            top: "22.5px", // exact 55% offset
            left: "18px", // exact 54% offset
            right: 0,
            bottom: 0,
          }}
        >
          <div className="flex gap-2">
            <div
              className="flex flex-col items-center justify-center bg-olive-100 px-2 py-1.5 border-1 border-gray-800 shadow-[inset_0_0_2px_rgba(0,0,0,1)]"
              style={{
                width: "70px",
                height: "80px",
              }}
            >
              <span className="text-5xl font-black text-black font-digital leading-none tracking-tighter">
                {gear}
              </span>
              <span className="text-xs text-black font-bold tracking-widest mt-[1px]">
                GEAR
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center bg-olive-100 px-2 py-1.5 border-1 border-gray-800 shadow-[inset_0_0_2px_rgba(0,0,0,1)]"
              style={{
                width: "100px",
                height: "80px",
              }}
            >
              <span className="text-5xl font-bold text-black font-digital leading-none">
                {Math.round(speed)}
              </span>
              <span className="text-xs text-black font-bold tracking-wider mt-[1px]">
                KM/H
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div
              className="flex flex-col items-center justify-center bg-olive-100 px-2 py-1.5 border-1 border-gray-800 shadow-[inset_0_0_2px_rgba(0,0,0,1)]"
              style={{
                width: "115px",
                height: "70px",
              }}
            >
              <span className="text-5xl font-bold text-black font-digital leading-none">
                {Math.round(rpm)}
              </span>
              <span className="text-xs text-black font-bold tracking-wider mt-[1px]">
                RPM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
