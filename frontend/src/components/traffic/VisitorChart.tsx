import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 타입 정의를 직접 포함
interface VisitorData {
  date: string;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
}

interface VisitorChartProps {
  data: VisitorData[];
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export const VisitorChart: React.FC<VisitorChartProps> = ({ data, period = 'daily' }) => {
  // 집계 단위별 라벨 포맷 함수
  const formatDate = (dateString: string) => {
    if (period === 'hourly') {
      // YYYY-MM-DD HH
      if (dateString.includes(' ')) {
        const [date, hour] = dateString.split(' ');
        return `${date}\n${hour}시`;
      }
      return dateString; // hour가 없으면 날짜만
    } else if (period === 'weekly') {
      // ISO 주차: 2024-23 -> 2024년 23주차
      const parts = dateString.split('-');
      if (parts.length === 2) {
        const [year, week] = parts;
        return `${year}년 ${week}주차`;
      }
      return dateString;
    } else if (period === 'monthly') {
      // YYYY-MM -> 2024년 6월
      const parts = dateString.split('-');
      if (parts.length === 2) {
        const [year, month] = parts;
        return `${year}년 ${Number(month)}월`;
      }
      return dateString;
    } else {
      // YYYY-MM-DD -> 6월 10일
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      }
      return dateString;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()}명
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">방문자 추이</h3>
        <p className="text-sm text-gray-600">최근 7일간의 방문자 변화</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}명`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="visitors" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="총 방문자"
            />
            <Line 
              type="monotone" 
              dataKey="newVisitors" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              name="신규 방문자"
            />
            <Line 
              type="monotone" 
              dataKey="returningVisitors" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              name="재방문자"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 