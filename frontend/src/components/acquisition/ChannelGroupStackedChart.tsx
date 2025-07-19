import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';

interface ChannelGroupData {
  channel: string;
  device: string;
  users: number;
}

interface ChannelGroupStackedChartProps {
  data: ChannelGroupData[];
  refreshKey?: number;
}

// 디바이스별 색상 정의
const DEVICE_COLORS = {
  mobile: '#3B82F6', // 파랑
  desktop: '#10B981', // 초록
};

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const totalUsers = data?.totalUsers || 0;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(1) || 0}% ({Math.round((entry.value / 100) * totalUsers).toLocaleString()}명)
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-700 mt-2 pt-2 border-t border-gray-100">
          총 {totalUsers.toLocaleString()}명
        </p>
      </div>
    );
  }
  return null;
};

// Y축 레이블
const CustomYAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text x={-5} y={8} textAnchor="end" fill="#666" className="text-xs">
      {payload.value}
    </text>
  </g>
);

// X축 레이블
const CustomXAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text x={0} y={0} textAnchor="middle" fill="#666" className="text-xs">
      {payload.value}%
    </text>
  </g>
);

export const ChannelGroupStackedChart: React.FC<ChannelGroupStackedChartProps> = ({
  data,
  refreshKey,
}) => {
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const channelTotals = data.reduce((acc, item) => {
      acc[item.channel] = (acc[item.channel] || 0) + item.users;
      return acc;
    }, {} as Record<string, number>);

    const topChannels = Object.entries(channelTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([channel]) => channel);

    const filteredData = data.filter(
      item =>
        topChannels.includes(item.channel) &&
        item.channel &&
        item.channel.trim() !== ''
    );

    const groupedByChannel = filteredData.reduce((acc, item) => {
      if (!acc[item.channel]) acc[item.channel] = {};
      acc[item.channel][item.device] = item.users;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const allDeviceTypes = ['mobile', 'desktop'];

    return Object.entries(groupedByChannel)
      .filter(([channel]) => channel && channel.trim() !== '')
      .map(([channel, devices]) => {
        const total = allDeviceTypes.reduce(
          (sum, device) => sum + (Number(devices[device] || 0)),
          0
        );

        const row: any = {
          channel: channel.trim(),
          totalUsers: total,
        };

        allDeviceTypes.forEach(device => {
          const value = Number(devices[device] || 0);
          row[device] = total > 0 ? (value / total) * 100 : 0;
        });

        return row;
      });
  }, [data, refreshKey]);

  const safeData = processedData
    .map(item => ({
      ...item,
      mobile: typeof item.mobile === 'number' && !isNaN(item.mobile) ? item.mobile : 0,
      desktop:
        typeof item.desktop === 'number' && !isNaN(item.desktop) ? item.desktop : 0,
      totalUsers:
        typeof item.totalUsers === 'number' && !isNaN(item.totalUsers)
          ? item.totalUsers
          : 0,
    }))
    .filter(item => item.mobile + item.desktop > 0);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: '270px' }}>
      <ResponsiveContainer width="100%" height="100%">
                  <BarChart
            data={safeData}
            layout="vertical"
            margin={{ top: 18, right: 30, left: 54, bottom: 18 }}
            barCategoryGap="25%"
          >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={<CustomXAxisTick />}
          />
          <YAxis
            type="category"
            dataKey="channel"
            tick={<CustomYAxisTick />}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" />

                     {/* Mobile */}
           <Bar
             dataKey="mobile"
             stackId="a"
             fill={DEVICE_COLORS.mobile}
             stroke={DEVICE_COLORS.mobile}
             strokeWidth={1.5}
             minPointSize={4}
             barSize={15}
          >
            <LabelList
              dataKey="mobile"
              position="insideRight"
              formatter={(value: any) => (value > 0 ? `${value.toFixed(1)}%` : '')}
              className="text-white text-xs"
            />
          </Bar>

                     {/* Desktop */}
           <Bar
             dataKey="desktop"
             stackId="a"
             fill={DEVICE_COLORS.desktop}
             stroke={DEVICE_COLORS.desktop}
             strokeWidth={1.5}
             minPointSize={4}
             barSize={15}
          >
            <LabelList
              dataKey="desktop"
              position="insideRight"
              formatter={(value: any) => (value > 0 ? `${value.toFixed(1)}%` : '')}
              className="text-white text-xs"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
