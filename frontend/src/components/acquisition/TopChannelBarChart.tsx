import React, { useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface TopChannelData {
  channel: string;
  users: number;
  clicks: number;
}

interface TopChannelBarChartProps {
  data: TopChannelData[];
  refreshKey: number;
}

const COLORS = ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const clicks = payload[0].payload.clicks;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-indigo-600">
          방문자: {payload[0].payload.users.toLocaleString()}명
        </p>
        {clicks !== undefined && (
          <p className="text-sm text-gray-600">
            클릭: {clicks.toLocaleString()}회
          </p>
        )}
      </div>
    );
  }
  return null;
};

const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, data } = props;
  const currentData = data.find((d: any) => d.channel === payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#6B7280" fontSize={12}>
        {payload.value}
      </text>
      {currentData && (
        <text x={100} y={0} dy={4} textAnchor="start" fill="#374151" fontSize={12} fontWeight="500">
          {currentData.users.toLocaleString()}
        </text>
      )}
    </g>
  );
};


export const TopChannelBarChart: React.FC<TopChannelBarChartProps> = ({ data }) => {
  useEffect(() => {
    console.log('[TopChannel Data]', data);
  }, [data]);
  const topChannels = data.slice(0, 5);

  return (
    <div className="bg-white shadow-md rounded-xl p-5 h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-md font-semibold">상위 유입 채널</h2>
          <p className="text-xs text-gray-500">최근 7일, 고유 방문자 기준</p>
        </div>
        <a href="#" className="text-xs text-blue-600 hover:underline">전체 보기 →</a>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={topChannels}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="channel"
            type="category"
            axisLine={false}
            tickLine={false}
            width={150}
            tick={<CustomizedAxisTick data={topChannels} />}
          />
          <Tooltip cursor={{ fill: '#f3f4f6' }} content={<CustomTooltip />} />
          <Bar dataKey="users" barSize={20} radius={[0, 4, 4, 0]}>
            {topChannels.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 