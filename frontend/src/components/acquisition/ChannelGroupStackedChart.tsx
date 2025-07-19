import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  mobile: '#3b82f6',    // 파란색
  desktop: '#10b981',   // 초록색
  tablet: '#f59e0b',    // 주황색
  unknown: '#6b7280'    // 회색
};

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString()}명
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 커스텀 Y축 라벨
const CustomYAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#666" className="text-xs">
        {payload.value}
      </text>
    </g>
  );
};

export const ChannelGroupStackedChart: React.FC<ChannelGroupStackedChartProps> = ({ 
  data, 
  refreshKey 
}) => {
  // 데이터 전처리: 채널별로 디바이스 데이터를 그룹화하고 상위 5개 채널만 선택
  const processedData = useMemo(() => {
    // 채널별 총 사용자 수 계산
    const channelTotals = data.reduce((acc, item) => {
      acc[item.channel] = (acc[item.channel] || 0) + item.users;
      return acc;
    }, {} as Record<string, number>);

    // 상위 5개 채널 선택
    const topChannels = Object.entries(channelTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([channel]) => channel);

    // 선택된 채널들의 데이터만 필터링하고 Recharts 형식으로 변환
    const filteredData = data.filter(item => topChannels.includes(item.channel));
    
    // 채널별로 디바이스 데이터를 그룹화
    const groupedByChannel = filteredData.reduce((acc, item) => {
      if (!acc[item.channel]) {
        acc[item.channel] = {};
      }
      acc[item.channel][item.device] = item.users;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Recharts 형식으로 변환
    return Object.entries(groupedByChannel).map(([channel, devices]) => ({
      channel,
      ...devices
    }));
  }, [data, refreshKey]);

  // 디바이스 타입들 추출 (데이터에서 실제 사용되는 디바이스만)
  const deviceTypes = useMemo(() => {
    const devices = new Set(data.map(item => item.device));
    return Array.from(devices).sort();
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
        >
          <XAxis 
            type="number" 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <YAxis 
            dataKey="channel" 
            type="category"
            axisLine={false}
            tickLine={false}
            tick={<CustomYAxisTick />}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {deviceTypes.map((device) => (
            <Bar
              key={device}
              dataKey={device}
              stackId="a"
              fill={DEVICE_COLORS[device as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown}
              radius={[0, 2, 2, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 