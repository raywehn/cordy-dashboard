import { scaleTime, scaleLinear, line as d3line, max, min, area as d3area, curveMonotoneX } from "d3";
import { ClientTooltip, TooltipTrigger, TooltipContent } from "./ClientTooltip";

export type DataPoint = {
  date: Date;
  value: number;
};

export function GrowthRateChart({ data }: { data: DataPoint[] }) {
  // Make sure we have data to avoid errors
  if (!data || data.length === 0) {
    return <div className="h-72 w-full flex items-center justify-center text-gray-500">No data available</div>;
  }

  let xScale = scaleTime()
    .domain([data[0].date, data[data.length - 1].date])
    .range([0, 100]);

  // For growth rate, we handle possible negative values
  const minValue = min(data.map((d) => d.value)) ?? 0;
  const maxValue = max(data.map((d) => d.value)) ?? 0;
  const padding = (maxValue - minValue) * 0.1; // Add 10% padding

  let yScale = scaleLinear()
    .domain([minValue < 0 ? minValue - padding : 0, maxValue + padding])
    .range([100, 0]);

  let line = d3line<(typeof data)[number]>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.value))
    .curve(curveMonotoneX);

  let area = d3area<(typeof data)[number]>()
    .x((d) => xScale(d.date))
    .y0(yScale(0)) // Zero line
    .y1((d) => yScale(d.value))
    .curve(curveMonotoneX);

  let areaPath = area(data) ?? undefined;
  let d = line(data);

  if (!d) {
    return null;
  }

  return (
    <div className="relative h-72 w-full">
      <div
        className="absolute inset-0
        h-full
        w-full
        overflow-visible"
      >
        {/* Chart area */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Zero line */}
          <line
            x1={0}
            y1={yScale(0)}
            x2={100}
            y2={yScale(0)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-zinc-300 dark:text-zinc-600"
            vectorEffect="non-scaling-stroke"
          />

          {/* Area */}
          <path d={areaPath} className="text-green-200" fill="url(#growthRateGradient)" />
          <defs>
            {/* Gradient definition */}
            <linearGradient id="growthRateGradient" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                className="text-green-500/20 dark:text-green-500/20"
                stopColor="currentColor"
              />
              <stop
                offset="100%"
                className="text-green-50/5 dark:text-green-900/5"
                stopColor="currentColor"
              />
            </linearGradient>
          </defs>

          {/* Line */}
          <path
            d={d}
            fill="none"
            className="text-green-500 dark:text-green-400"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Invisible Tooltip Area */}
          {data.map((d, index) => (
            <ClientTooltip key={index}>
              <TooltipTrigger>
                <g className="group/tooltip">
                  {/* Tooltip Line */}
                  <line
                    x1={xScale(d.date)}
                    y1={0}
                    x2={xScale(d.date)}
                    y2={100}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="opacity-0 group-hover/tooltip:opacity-100 text-zinc-300 dark:text-zinc-700 transition-opacity"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Invisible area closest to a specific point for the tooltip trigger */}
                  <rect
                    x={(() => {
                      const prevX = index > 0 ? xScale(data[index - 1].date) : xScale(d.date);
                      return (prevX + xScale(d.date)) / 2;
                    })()}
                    y={0}
                    width={(() => {
                      const prevX = index > 0 ? xScale(data[index - 1].date) : xScale(d.date);
                      const nextX =
                        index < data.length - 1 ? xScale(data[index + 1].date) : xScale(d.date);
                      const leftBound = (prevX + xScale(d.date)) / 2;
                      const rightBound = (xScale(d.date) + nextX) / 2;
                      return rightBound - leftBound;
                    })()}
                    height={100}
                    fill="transparent"
                  />
                </g>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  {d.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                  })}
                </div>
                <div className="text-gray-500 text-sm">
                  {d.value > 0 ? '+' : ''}{d.value.toLocaleString("en-US")} users
                </div>
              </TooltipContent>
            </ClientTooltip>
          ))}
        </svg>

        {/* X axis */}
        {data.map((day, i) => {
          // show 1 every x labels
          if (i % 6 !== 0 || i === 0 || i >= data.length - 3) return;
          return (
            <div
              key={i}
              style={{
                left: `${xScale(day.date)}%`,
                top: "90%",
              }}
              className="absolute text-xs text-zinc-500 -translate-x-1/2"
            >
              {day.date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          );
        })}
      </div>
      {/* Y axis */}
      {yScale
        .ticks(8)
        .map(yScale.tickFormat(8, "d"))
        .map((value, i) => {
            return (
            <div
                key={i}
                style={{
                top: `${yScale(+value)}%`,
                right: "3%",
                }}
                className="absolute text-xs tabular-nums text-zinc-400 -translate-y-1/2"
            >
                {+value > 0 ? '+' : ''}{value}
            </div>
            );
        })}
    </div>
  );
}