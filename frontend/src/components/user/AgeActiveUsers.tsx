import React, { useState } from 'react';

interface AgeData {
  id: string;
  ageRange: string;
  users: number;
  color: string;
}

interface MousePosition {
  x: number;
  y: number;
}

export const AgeActiveUsers: React.FC = () => {
  const [hoveredAge, setHoveredAge] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // 연령대별 사용자 데이터
  const ageData: AgeData[] = [
    { id: '18-24', ageRange: '18-24', users: 58000, color: '#4f46e5' },
    { id: '25-34', ageRange: '25-34', users: 42000, color: '#4f46e5' },
    { id: '35-44', ageRange: '35-44', users: 25000, color: '#4f46e5' },
    { id: '45-54', ageRange: '45-54', users: 18000, color: '#4f46e5' },
    { id: '55-64', ageRange: '55-64', users: 12000, color: '#4f46e5' },
    { id: '65+', ageRange: '65+', users: 8000, color: '#4f46e5' }
  ];

  const maxUsers = Math.max(...ageData.map(age => age.users));

  const handleAgeHover = (ageId: string, event: React.MouseEvent) => {
    setHoveredAge(ageId);
    setShowTooltip(true);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleAgeLeave = () => {
    setHoveredAge(null);
    setShowTooltip(false);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredAge) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  const getAgeData = (ageId: string) => {
    return ageData.find(age => age.id === ageId);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // 툴팁 위치 계산 (커서 오른쪽에 위치)
  const getTooltipStyle = () => {
    return {
      left: `${mousePosition.x + 10}px`,
      top: `${mousePosition.y - 60}px`,
      transform: mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'translateX(0)',
    };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">연령 별 활성 사용자</h3>
      </div>

      {/* 막대 그래프 영역 */}
      <div className="relative flex-1 flex flex-col justify-center">
        {/* 배경 그리드 */}
        <div className="absolute left-16 right-13 top-0 bottom-0 flex justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-px h-full bg-gray-200 opacity-20"></div>
          ))}
        </div>
        
        <div className="space-y-3 relative z-10">
          {ageData.map((age) => {
            const barWidth = (age.users / maxUsers) * 100;
            const isHovered = hoveredAge === age.id;
            
            return (
              <div key={age.id} className="flex items-center">
                {/* 연령대 라벨 */}
                <div className="w-12 text-right text-sm font-medium text-gray-700 mr-4">
                  {age.ageRange}
                </div>
                
                {/* 막대 그래프 */}
                <div className="flex-1 relative mr-3">
                  <div className="w-full bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 cursor-pointer relative"
                      style={{
                        width: `${barWidth}%`,
                        background: isHovered 
                          ? 'linear-gradient(90deg, #4338ca 0%, #6366f1 100%)' 
                          : 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                        boxShadow: isHovered 
                          ? '0 2px 8px rgba(79, 70, 229, 0.3)' 
                          : '0 1px 3px rgba(79, 70, 229, 0.2)',
                        transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                      onMouseEnter={(event) => handleAgeHover(age.id, event)}
                      onMouseLeave={handleAgeLeave}
                      onMouseMove={handleMouseMove}
                    />
                  </div>
                </div>
                
                {/* 사용자 수 표시 */}
                <div className="w-10 text-right text-xs font-medium text-gray-600">
                  {(age.users / 10000).toFixed(0)}만
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X축 눈금 */}
      <div className="mt-8 ml-16 mr-13">
        <div className="flex justify-between text-xs text-gray-400 font-medium mb-2">
          <span>0</span>
          <span>2만</span>
          <span>4만</span>
          <span>6만</span>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
      </div>

      {/* 툴팁 */}
      {showTooltip && hoveredAge && (
        <div
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm z-50 pointer-events-none"
          style={getTooltipStyle()}
        >
          <div className="text-xs text-gray-500 mb-1">6월 20일~2025년 7월 17일</div>
          <div className="text-xs text-gray-600 mb-2">활성 사용자</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {getAgeData(hoveredAge)?.ageRange}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {getAgeData(hoveredAge) && formatNumber(getAgeData(hoveredAge)!.users)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 