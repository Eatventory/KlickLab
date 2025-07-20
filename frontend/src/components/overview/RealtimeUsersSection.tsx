import React, { useState } from 'react';

// 호버 가능한 실시간 차트 컴포넌트
const RealtimeChart = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (index, event) => {
    setHoveredBar(index);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div className="relative">
      {/* 호버 툴팁 */}
      {hoveredBar !== null && (
        <div 
          className="fixed z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none"
          style={{ 
            left: mousePosition.x + 10, 
            top: mousePosition.y - 30 
          }}
        >
          <div>30분 전</div>
          <div className="font-bold">활성 사용자: {data[hoveredBar]?.users || 0}</div>
        </div>
      )}
      
      {/* 차트 */}
      <div className="h-28 mb-6 overflow-hidden">
        <div className="flex items-end h-full gap-0.5">
          {data.map((d, i) => (
            <div 
              key={i} 
              style={{ height: `${d.users * 2}px` }} 
              className={`flex-1 rounded-t cursor-pointer transition-colors ${
                hoveredBar === i ? 'bg-blue-600' : 'bg-blue-400'
              }`}
              onMouseEnter={(e) => handleMouseEnter(i, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const RealtimeUsersSection = () => {
    // --- 실시간 사용자 mock 데이터 ---
    const realtimeUserCount = 59;
    const realtimeUserTrend = Array.from({ length: 30 }, (_, i) => ({
        minute: i + 1,
        users: Math.floor(20 + Math.random() * 20 + Math.sin(i / 5) * 10)
    }));
    const realtimeSourceData = [
        { source: '(direct)', users: 6 },
        { source: 'google', users: 2 },
        { source: '(not set)', users: 1 }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-8 flex flex-col justify-start">
          <div>
            <div className="text-base font-semibold text-gray-700 mb-1">지난 30분 동안의 활성 사용자</div>
            <div className="text-3xl font-extrabold text-blue-700 mb-4">{realtimeUserCount}</div>
            {/* 호버 가능한 분당 활성 사용자 막대그래프 */}
            <RealtimeChart data={realtimeUserTrend} />
            <div className="text-xs text-gray-400 text-left mb-4">분당 활성 사용자</div>
          </div>
          {/* 유입경로별 막대그래프 */}
          <div className="mt-8">
            {/* 최대값 계산 */}
            {(() => {
              const maxUser = Math.max(...realtimeSourceData.map(s => s.users), 1);
              return realtimeSourceData.map((src, i) => (
                <div key={src.source} className="flex items-center mb-2">
                  <span className="w-16 text-xs text-gray-600">{src.source}</span>
                  <div className="flex-1 h-2 bg-blue-100 rounded w-full">
                    <div
                      style={{ width: `${(src.users / maxUser) * 100}%` }}
                      className="h-2 bg-blue-500 rounded"
                    />
                  </div>
                  <span className="text-xs text-gray-700 font-semibold ml-2">{src.users}</span>
                </div>
              ));
            })()}

          </div>
        </div>
    );
}