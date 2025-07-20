
import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface RealtimeData {
  activeUsers: number;
  trend: { minute: string; users: number }[];
  topSources: { source: string; users: number }[];
}

export const RealtimeUserCart: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRealtimeData = async () => {
    try {
      const token = localStorage.getItem('klicklab_token');
      const response = await fetch('/api/realtime/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, [refreshKey]);

  if (isLoading || !data) {
    return <div className="animate-pulse bg-gray-100 h-96 rounded-lg"></div>;
  }

  const maxUsers = Math.max(...data.trend.map(t => t.users), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-600">지난 30분 동안의 활성 사용자</h3>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">실시간</span>
        </div>
      </div>

      {/* 큰 숫자 */}
      <div className="text-5xl font-bold text-gray-900 mb-6">
        {data.activeUsers.toLocaleString()}
      </div>

      {/* 분 단위 차트 */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-2">분당 활성 사용자</div>
        <div className="flex items-end gap-0.5 h-20">
          {data.trend.map((item, index) => (
            <div
              key={index}
              className="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
              style={{
                height: `${(item.users / maxUsers) * 100}%`,
                minHeight: '2px'
              }}
              title={`${item.minute}: ${item.users}명`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>30분 전</span>
          <span>현재</span>
        </div>
      </div>

      {/* 상위 소스 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">상위 소스</span>
          <span className="text-xs text-gray-500">활성 사용자</span>
        </div>
        <div className="space-y-2">
          {data.topSources.slice(0, 3).map((source, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{source.source}</span>
              <span className="text-sm font-medium text-gray-900">{source.users}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
