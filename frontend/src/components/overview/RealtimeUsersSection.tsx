import React from 'react';
// import { useRealtimeOverview } from '../../hooks/useRealtimeOverview'; // 사용하지 않음

// 타입 정의
interface TrendData { time: string; users: number; }
interface SourceData { source: string; users: number; }
interface SummaryData {
  active_users_30min: number;
  totalEvents?: number;
  pageviews?: number;
  clicks?: number;
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
            &nbsp;({data[hoveredBar].time})
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

export const RealtimeUsersSection = ({ activeUsers = 0, trend = [], sources = [], loading = false }) => {
  // props로 데이터를 받도록 수정
  
  // 트렌드 데이터 포맷 변환
  const formattedTrend = trend.map((item, index) => ({
    time: item.timestamp || `${30-index}:00`,
    users: item.value || 0
  }));
  
  // 소스 데이터 포맷 변환
  const formattedSources = sources.map(src => ({
    source: src.source || '',
    users: src.count || src.users || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow p-8 flex flex-col justify-start">
      <div>
        <div className="text-base font-semibold text-gray-700 mb-1">지난 5분 동안의 활성 사용자</div>
        <div className="text-3xl font-extrabold text-blue-700 mb-4">
          {loading ? <div className="h-9 w-20 bg-gray-200 animate-pulse rounded"></div> : activeUsers}
        </div>
        <RealtimeChart data={formattedTrend} loading={loading} />
        <div className="text-xs text-gray-400 text-left mb-4">분당 활성 사용자</div>
      </div>
      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/5"></div>
          </div>
        ) : (
          (() => {
            const maxUser = Math.max(...formattedSources.map((s) => s.users), 1);
            return formattedSources.map((src) => (
              <div key={src.source} className="flex items-center mb-2">
                <span className="w-24 text-xs text-gray-600 truncate" title={src.source}>{src.source}</span>
                <div className="flex-1 h-2 bg-blue-100 rounded w-full">
                  <div
                    style={{ width: `${(src.users / maxUser) * 100}%` }}
                    className="h-2 bg-blue-500 rounded"
                  />
                </div>
                <span className="text-xs text-gray-700 font-semibold ml-2">{src.users}</span>
              </div>
            ));
          })()
        )}
      </div>
    </div>
  );
};