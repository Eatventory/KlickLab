import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// 타입 정의를 직접 포함
interface ExitPageData {
  page: string;
  exitCount: number;
  percentage: number;
}

interface ExitPageChartProps {
  data: ExitPageData[];
}

export const ExitPageChart: React.FC<ExitPageChartProps> = ({ data }) => {
  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.page}</p>
          <p className="text-sm text-gray-600">
            이탈 수: {data.exitCount.toLocaleString()}회
          </p>
          <p className="text-sm text-gray-600">
            비율: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600">
            {entry.value} ({data[index]?.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">이탈 페이지 분석</h3>
        <p className="text-sm text-gray-600">사용자가 가장 많이 이탈하는 페이지</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ page, percentage }) => `${page} (${percentage}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="exitCount"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">주요 인사이트</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• {data[0]?.page}에서 가장 많은 이탈 발생 ({data[0]?.percentage}%)</li>
          <li>• 상위 3개 페이지에서 전체 이탈의 {data.slice(0, 3).reduce((sum, item) => sum + item.percentage, 0)}% 차지</li>
          <li>• 결제/장바구니 페이지 이탈률이 높음</li>
        </ul>
      </div>
    </div>
  );
}; 