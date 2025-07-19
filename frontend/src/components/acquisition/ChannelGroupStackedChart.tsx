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
    const mobilePercent = data?.mobile || 0;
    const desktopPercent = data?.desktop || 0;

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
        <p className="text-xs text-gray-500 mt-1">
          비율 합계: {(mobilePercent + desktopPercent).toFixed(1)}%
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
    <text x={0} y={14} textAnchor="middle" fill="#666" className="text-xs">
      {payload.value}%
    </text>
  </g>
);

// 커스텀 범례
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-4 mt-2 justify-center">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const ChannelGroupStackedChart: React.FC<ChannelGroupStackedChartProps> = ({
  data,
  refreshKey,
}) => {
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 원본 데이터 로깅
    console.log('원본 데이터:', data);

    const channelTotals = data.reduce((acc, item) => {
      acc[item.channel] = (acc[item.channel] || 0) + item.users;
      return acc;
    }, {} as Record<string, number>);

    const topChannels = Object.entries(channelTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([channel]) => channel);

    console.log('상위 채널:', topChannels);

    const filteredData = data.filter(
      item =>
        topChannels.includes(item.channel) &&
        item.channel &&
        item.channel.trim() !== ''
    );

    console.log('필터링된 데이터:', filteredData);

    const groupedByChannel = filteredData.reduce((acc, item) => {
      if (!acc[item.channel]) acc[item.channel] = {};
      acc[item.channel][item.device] = item.users;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    console.log('채널별 그룹화:', groupedByChannel);

    const allDeviceTypes = ['mobile', 'desktop'];

    const result = Object.entries(groupedByChannel)
      .filter(([channel]) => channel && channel.trim() !== '')
      .map(([channel, devices]) => {
        const mobileUsers = Number(devices['mobile'] || 0);
        const desktopUsers = Number(devices['desktop'] || 0);
        const total = mobileUsers + desktopUsers;

        console.log(`${channel} 채널:`, {
          mobile: mobileUsers,
          desktop: desktopUsers,
          total: total
        });

        const row: any = {
          channel: channel.trim(),
          totalUsers: total,
          mobile: total > 0 ? (mobileUsers / total) * 100 : 0,
          desktop: total > 0 ? (desktopUsers / total) * 100 : 0,
        };

        // 비율 검증
        const totalRatio = row.mobile + row.desktop;
        if (Math.abs(totalRatio - 100) > 0.1) {
          console.warn(`${channel} 채널 비율 오류:`, {
            mobile: row.mobile,
            desktop: row.desktop,
            total: totalRatio
          });
        }

        return row;
      });

    console.log('최종 처리된 데이터:', result);
    return result;
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
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
                  <BarChart
            data={safeData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 20, bottom: 80 }}
            barCategoryGap="15%"
          >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={<CustomXAxisTick />}
            tickCount={6}
            dy={20}
          />
          <YAxis
            type="category"
            dataKey="channel"
            tick={<CustomYAxisTick />}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

                     {/* Mobile */}
           <Bar
             dataKey="mobile"
             stackId="a"
             fill={DEVICE_COLORS.mobile}
             stroke={DEVICE_COLORS.mobile}
             strokeWidth={2}
             minPointSize={5}
             barSize={15}
          >
          {/* 
          <LabelList
            dataKey="mobile"
            position="insideRight"
            formatter={(value: any) => (value > 0 ? `${value.toFixed(1)}%` : '')}
            className="text-white text-xs font-semibold"
            fill="#FFFFFF"
          />
          */}
          </Bar>

                     {/* Desktop */}
           <Bar
             dataKey="desktop"
             stackId="a"
             fill={DEVICE_COLORS.desktop}
             stroke={DEVICE_COLORS.desktop}
             strokeWidth={2}
             minPointSize={5}
             barSize={15}
          >
          {/* 
          <LabelList
            dataKey="desktop"
            position="insideRight"
            formatter={(value: any) => (value > 0 ? `${value.toFixed(1)}%` : '')}
            className="text-white text-xs font-semibold"
            fill="#FFFFFF"
          />
          */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};
