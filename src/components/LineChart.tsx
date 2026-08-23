import React, { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface LineChartProps {
  /** [xValues[], series1Values[], series2Values[], ...] - same shape uPlot expects. */
  data: uPlot.AlignedData;
  /** One entry per data series (not counting x), in the same order as `data`. */
  series: { label: string; color: string }[];
  /** x-axis values (frame indices) to draw a vertical dashed marker at - used
   * for lap-boundary lines during session analysis. */
  markers?: number[];
  height?: number;
}

/** Thin wrapper around uPlot (a real React binding doesn't exist upstream) -
 * uPlot is an imperative canvas library, so a plain instance is created once
 * and its data/size are pushed to it via effects rather than re-rendered as
 * JSX on every update. */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  series,
  markers,
  height = 180,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const lapMarkerPlugin: uPlot.Plugin = {
      hooks: {
        draw: [
          (u) => {
            if (!markers || markers.length === 0) return;
            const { ctx } = u;
            ctx.save();
            ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            for (const x of markers) {
              const px = u.valToPos(x, "x", true);
              ctx.beginPath();
              ctx.moveTo(px, u.bbox.top);
              ctx.lineTo(px, u.bbox.top + u.bbox.height);
              ctx.stroke();
            }
            ctx.restore();
          },
        ],
      },
    };

    const options: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height,
      // x values here are frame indices, not unix timestamps - without this,
      // uPlot's default time-axis formatting renders them as 1970 dates.
      scales: { x: { time: false } },
      series: [
        { label: "Frame" },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.color,
          width: 2,
          points: { show: false },
        })),
      ],
      axes: [
        { stroke: "#6b7280", grid: { stroke: "#1f2937" } },
        { stroke: "#6b7280", grid: { stroke: "#1f2937" } },
      ],
      legend: { show: true },
      cursor: { show: true },
      plugins: [lapMarkerPlugin],
    };

    const plot = new uPlot(options, data, containerRef.current);
    plotRef.current = plot;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        plot.setSize({ width: containerRef.current.clientWidth, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
    // Only re-create the plot when the series/marker config changes - `data`
    // updates are pushed via setData below instead of a full re-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, markers, height]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} />;
};
