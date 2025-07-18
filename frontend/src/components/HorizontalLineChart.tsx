import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Area,
} from 'recharts';

interface HorizontalLineChartProps {
  data: Record<string, any>[];
  lines: {
    key: string;
    name?: string;
    color?: string;
    dash?: string;
  }[];
  areas?: {
    key: string;
    name?: string;
    color?: string;
  }[];
  height?: number;
  showLegend?: boolean;
  tooltipRenderer?: (item: any) => React.ReactNode;
  legendTooltipRenderer?: (item: any, key: string) => React.ReactNode;
}

const defaultColors = ['#3b82f6', '#10b981', '#f97316', '#6366f1', '#ef4444'];

const HorizontalLineChart: React.FC<HorizontalLineChartProps> = ({
  data,
  lines,
  areas,
  tooltipRenderer,
  legendTooltipRenderer,
  height = 200,
  showLegend = false,
}) => {
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);
  const [hoveredLegendItem, setHoveredLegendItem] = useState<{ item: any; key: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const latestItem = data[data.length - 1];

  function formatValue(value: number) {
    if (value >= 10000) return `${Math.round(value / 10000 * 10) / 10}만`;
    if (value >= 1000) return `${Math.round(value / 1000 * 10) / 10}천`;
    return value?.toLocaleString();
  }

  return (
    <div className="relative flex w-full" style={{ height: height }}>
      <div className="flex-1 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            height={height}
            onMouseMove={(e: any) => {
              if (e?.activePayload?.[0]) {
                setHoveredItem(e.activePayload[0].payload);
                setTooltipPos({ x: e.chartX + 12, y: e.chartY + 12 });
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                value >= 10000 ? `${value / 10000}만` : value
              }
            />
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="1 1" vertical={false} />
            <Tooltip
              content={() => null}
              cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            {areas?.map((area, idx) => (
              <Area
                key={`area-${area.key}`}
                type="monotone"
                dataKey={area.key}
                stroke="none"
                fill={area.color || defaultColors[idx % defaultColors.length]}
                fillOpacity={0.2}
                isAnimationActive={true}
                animationDuration={600}
              />
            ))}
            {lines.map((line, idx) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color || defaultColors[idx % defaultColors.length]}
                strokeWidth={2}
                strokeDasharray={line.dash || "0"}
                dot={{
                  r: 4,
                  stroke: line.color || defaultColors[idx % defaultColors.length],
                  strokeWidth: 2,
                  fill: '#fff',
                }}
                activeDot={{ r: 4 }}
                isAnimationActive={true}
                animationDuration={600}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showLegend && latestItem && (
        <div className="ml-4 p-2 flex flex-col justify-start items-start gap-2 text-sm">
          {lines.map((line, idx) => {
            const val = latestItem?.[line.key];
            const color = line.color || defaultColors[idx % defaultColors.length];
            const tooltipItem = { date: latestItem.date, [line.key]: val };

            return (
              <div
                key={line.key}
                className="flex flex-col items-start text-xs text-gray-600 whitespace-nowrap w-full hover:bg-gray-100 px-2 py-1 rounded rounded-4"
                onMouseEnter={() => {
                  setHoveredLegendItem({ item: tooltipItem, key: line.key });
                }}
                onMouseMove={(e) => {
                  setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
                }}
                onMouseLeave={() => setHoveredLegendItem(null)}
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{line.name}</span>
                </div>
                <div className="text-xl font-semibold text-gray-900 ml-2">
                  {formatValue(val)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tooltipRenderer && hoveredItem && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg text-sm text-gray-800 px-3 py-2 whitespace-nowrap"
          style={{ top: tooltipPos.y, left: tooltipPos.x, pointerEvents: 'none' }}
        >
          {tooltipRenderer(hoveredItem)}
        </div>
      )}

      {legendTooltipRenderer && hoveredLegendItem && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg text-sm text-gray-800 px-3 py-2 whitespace-nowrap"
          style={{ top: tooltipPos.y, left: tooltipPos.x, pointerEvents: 'none' }}
        >
          {legendTooltipRenderer(hoveredLegendItem.item, hoveredLegendItem.key)}
        </div>
      )}
    </div>
  );
};

export default HorizontalLineChart;
