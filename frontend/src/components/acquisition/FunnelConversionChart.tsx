import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface FunnelData {
  stage: string;
  visitors: number;
  conversionRate: number;
}

interface FunnelConversionChartProps {
  data: FunnelData[];
  refreshKey: number;
}

export const FunnelConversionChart: React.FC<FunnelConversionChartProps> = ({ data, refreshKey }) => {
  const colors = ['#3B82F6', '#10B981'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            방문자: {payload[0].value.toLocaleString()}명
          </p>
          <p className="text-sm text-green-600">
            전환율: {payload[0].payload.conversionRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <XAxis 
            dataKey="stage" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="visitors" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 