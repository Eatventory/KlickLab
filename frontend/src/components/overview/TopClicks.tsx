import React from 'react';

interface TopClickItem {
  label: string;
  count: number;
}

interface TopClicksProps {
  data: TopClickItem[];
  loading?: boolean;
}

export const TopClicks: React.FC<TopClicksProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
        <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 animate-pulse rounded w-3/5"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-gray-400 text-sm">데이터가 없습니다</div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.count), 1);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 font-semibold text-sm text-gray-500">
        <span>이벤트</span>
        <span className="text-right">발생횟수</span>
      </div>
      {data.map((item, index) => (
        <div key={index} className="grid grid-cols-2 text-sm text-gray-700 border-t pt-2 items-center">
          <span>{item.label}</span>
          <span className="text-right font-medium flex items-center gap-2 justify-end">
            <div className="bg-blue-100 rounded h-2 w-20 mr-2 relative">
              <div
                className="bg-blue-500 h-2 rounded"
                style={{ width: `${(item.count / maxValue) * 100}%` }}
              />
            </div>
            {(item.count ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};