import React from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface HourlyData {
  hour: string;
  total_users: number;
  new_users: number;
  existing_users: number;
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
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}명
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const HourlyTrendLineChart: React.FC<HourlyTrendLineChartProps> = ({ data }) => {
  // 00부터 23시까지 전체 시간 데이터 생성 (데이터가 없는 시간은 0으로 채움)
  const generateFullHourData = (inputData: HourlyData[]): HourlyData[] => {
    const fullHourData: HourlyData[] = [];
    
    // 00부터 23까지 24시간 생성
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      const existingData = inputData?.find(item => item.hour === hourStr);
      
      if (existingData) {
        fullHourData.push(existingData);
      } else {
        // 데이터가 없는 시간은 0으로 채움
        fullHourData.push({
          hour: hourStr,
          total_users: 0,
          new_users: 0,
          existing_users: 0
        });
      }
    }
    
    return fullHourData;
  };

  const processedData = generateFullHourData(data);

  // 데이터 검증 및 로깅
  React.useEffect(() => {
    if (data && data.length > 0) {
      data.forEach((item, index) => {
        if (item.new_users > item.total_users) {
          console.error(`시간별 트렌드 데이터 오류 [${index}]:`, {
            hour: item.hour,
            total_users: item.total_users,
            new_users: item.new_users,
            existing_users: item.existing_users
          });
        }
      });
    }
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={processedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <XAxis
          dataKey="hour"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6B7280' }}
          interval={0}
          type="category"
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
          dataKey="total_users"
          stroke="#4F46E5"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2 }}
          name="전체 사용자"
        />
        <Line
          type="monotone"
          dataKey="new_users"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2 }}
          name="신규 사용자"
        />
        <Line
          type="monotone"
          dataKey="existing_users"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2 }}
          name="기존 사용자"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}; 