import React from 'react';

// 타입 정의
interface TrendData { time: string; users: number; }
interface SourceData { source: string; users: number; }
interface SummaryData {
  active_users_30min: number;
  totalEvents?: number;
  pageviews?: number;
  clicks?: number;
}

interface RealtimeUsersSectionProps {
  activeUsers?: number;
  trend?: TrendData[];
  locations?: any[];
  loading?: boolean;
}

// 호버 가능한 실시간 차트 컴포넌트
const RealtimeChart: React.FC<{ data: TrendData[]; loading: boolean }> = ({ data = [], loading = false }) => {
  const [hoveredBar, setHoveredBar] = React.useState<number | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  if (loading) {
    return (
      <div className="h-28 mb-6 bg-gray-100 animate-pulse rounded"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-28 mb-6 flex items-center justify-center bg-gray-50 rounded">
        <span className="text-gray-400 text-sm">데이터가 없습니다</span>
      </div>
    );
  }

  // 최대값 계산 (차트 높이 조정용)
  const maxUsers = Math.max(...data.map((d) => d.users), 1);
  const chartHeight = 112; // h-28 = 7rem = 112px

  const handleMouseEnter = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredBar(index);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div className="relative">
      {/* 호버 툴팁 */}
      {hoveredBar !== null && data[hoveredBar] && (
        <div
          className="fixed z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 30,
          }}
        >
          <div>
            {(() => {
              const idx = hoveredBar;
              if (idx === 0) return '30분 전';
              if (idx === data.length - 1) return '1분 미만';
              return `${30 - idx}분 전`;
            })()}
            &nbsp;({(() => {
              // DB 시간을 한국 시간으로 변환 (+9)
              const dbTime = new Date(data[hoveredBar].time);
              const koreaTime = new Date(dbTime.getTime() + (9 * 60 * 60 * 1000));
              const year = koreaTime.getFullYear();
              const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
              const day = String(koreaTime.getDate()).padStart(2, '0');
              const hours = String(koreaTime.getHours()).padStart(2, '0');
              const minutes = String(koreaTime.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day} ${hours}:${minutes}`;
            })()})
          </div>
          <div className="font-bold">활성 사용자: {data[hoveredBar].users}명</div>
        </div>
      )}

      {/* 차트 */}
      <div className="h-28 mb-6 overflow-hidden">
        <div className="flex items-end h-full gap-0.5">
          {data.map((d, i) => {
            const barHeight = maxUsers > 0 ? (d.users / maxUsers) * chartHeight : 0;
            return (
              <div
                key={i}
                style={{ height: `${Math.max(barHeight, 2)}px` }}
                className={`flex-1 rounded-t cursor-pointer transition-colors ${
                  hoveredBar === i ? 'bg-blue-600' : 'bg-blue-400'
                }`}
                onMouseEnter={(e) => handleMouseEnter(i, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const RealtimeUsersSection: React.FC<RealtimeUsersSectionProps> = ({ 
  activeUsers = 0, 
  trend = [], 
  locations = [], 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-28 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // 숫자 변환 보장
  const displayUsers = parseInt(activeUsers.toString()) || 0;
  const displayTrend = trend.map((item: any) => ({
    time: item.time,
    users: parseInt(item.users?.toString()) || 0
  }));
  const displayLocations = locations.map((location: any) => ({
    location: location.location,
    users: parseInt(location.users?.toString()) || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">실시간 활성 사용자</h2>
        <div className="text-3xl font-bold text-blue-600">
          {displayUsers.toLocaleString()}명
        </div>
        <p className="text-sm text-gray-500 mt-1">최근 30분간 활성 사용자</p>
      </div>

      {/* 실시간 차트 */}
      <RealtimeChart data={displayTrend} loading={loading} />

      {/* 주요 지역 요약 */}
      {displayLocations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">주요 지역</h3>
          <div className="space-y-1">
            {displayLocations.slice(0, 3).map((location, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{location.location}</span>
                <span className="font-medium">{location.users.toLocaleString()}명</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};