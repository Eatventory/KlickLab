import React from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface HourlyData {
  hour: string;
  visitors: number;
}

interface HourlyTrendLineChartProps {
  data: HourlyData[];
  refreshKey: number;
}

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="text-xs text-gray-500">{`시간: ${label}`}</p>
        <p className="text-sm font-semibold text-indigo-600">{`방문자: ${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

export const HourlyTrendLineChart: React.FC<HourlyTrendLineChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <XAxis
          dataKey="hour"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Line
          type="monotone"
          dataKey="visitors"
          stroke="#4F46E5"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}; 