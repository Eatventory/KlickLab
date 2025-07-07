import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 타입 정의를 직접 포함
interface PageTimeData {
  page: string;
  averageTime: number; // 분 단위
  visitCount: number;
}

interface PageTimeChartProps {
  data: PageTimeData[];
}

export const PageTimeChart: React.FC<PageTimeChartProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}초`;
    }
    return `${minutes.toFixed(1)}분`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            평균 체류시간: {formatTime(data.averageTime)}
          </p>
          <p className="text-sm text-gray-600">
            방문 수: {data.visitCount}회
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">페이지별 평균 체류시간</h3>
        <p className="text-sm text-gray-600">사용자가 각 페이지에서 머무는 시간</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="page" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}분`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="averageTime" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">최고 체류시간</p>
          <p className="text-lg font-bold text-blue-900">
            {formatTime(Math.max(...data.map(d => d.averageTime)))}
          </p>
          <p className="text-xs text-blue-600">
            {data.find(d => d.averageTime === Math.max(...data.map(d => d.averageTime)))?.page}
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium">평균 체류시간</p>
          <p className="text-lg font-bold text-green-900">
            {formatTime(data.reduce((sum, d) => sum + d.averageTime, 0) / data.length)}
          </p>
          <p className="text-xs text-green-600">전체 페이지</p>
        </div>
      </div>
    </div>
  );
}; 