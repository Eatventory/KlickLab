import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
  [key: string]: any;
}

interface HorizontalLineChartProps {
  data: DataPoint[];
  tooltipRenderer?: (payload: DataPoint) => React.ReactNode;
}

const HorizontalLineChart: React.FC<HorizontalLineChartProps> = ({
  data,
  tooltipRenderer,
}) => {
  const [hoveredItem, setHoveredItem] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          onMouseMove={(e: any) => {
            if (e?.activePayload?.[0]) {
              const item = e.activePayload[0].payload;
              setHoveredItem(item);
              setTooltipPos({ x: e.chartX + 12, y: e.chartY + 12 });
            }
          }}
          onMouseLeave={() => {
            setHoveredItem(null);
          }}
        >
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              value >= 10000 ? `${value / 10000}만` : value
            }
          />
          <CartesianGrid
            stroke="#e5e7eb"
            strokeDasharray="1 1"
            vertical={false}
            horizontal={true}
          />
          <Tooltip
            content={() => null}
            cursor={{
              stroke: '#e5e7eb',
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>

      {hoveredItem && tooltipRenderer && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg text-sm text-gray-800 px-3 py-2 whitespace-nowrap"
          style={{
            top: tooltipPos.y,
            left: tooltipPos.x,
            pointerEvents: 'none',
          }}
        >
          {tooltipRenderer(hoveredItem)}
        </div>
      )}
    </div>
  );
};

export default HorizontalLineChart;
