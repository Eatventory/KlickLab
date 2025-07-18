import React, { useState, useMemo, useCallback } from 'react';

// 타입 정의
type GenderId = 'male' | 'female';

interface GenderData {
  id: GenderId;
  name: string;
  users: number;
  percentage: number;
  color: string;
}

interface MousePosition {
  x: number;
  y: number;
}

// 성별별 색상 매핑 (API 데이터와 독립적)
const GENDER_COLORS: Record<GenderId, string> = {
  male: '#3541A8',    // 짙은 파란색 - Male
  female: '#C8DAFA',  // 연한 파란색 - Female
} as const;

// 차트 설정 상수
const CHART_CONFIG = {
  width: 320,
  height: 320,
  viewBox: '0 0 320 320',
  centerX: 160,
  centerY: 160,
  outerRadius: 125,
  innerRadius: 75,
  strokeWidth: 3,
} as const;

export const GenderActiveUsers: React.FC = () => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [hoveredGender, setHoveredGender] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // 성별별 사용자 데이터 - 메모화
  const genderData = useMemo((): GenderData[] => [
    { id: 'male', name: 'MALE', users: 267000, percentage: 60.6, color: GENDER_COLORS.male },
    { id: 'female', name: 'FEMALE', users: 175000, percentage: 39.4, color: GENDER_COLORS.female }
  ], []);

  // 총 사용자 수 계산 - 메모화
  const totalUsers = useMemo(() => 
    genderData.reduce((sum, gender) => sum + gender.users, 0)
  , [genderData]);

  // 이벤트 핸들러들 - 메모화
  const handleGenderClick = useCallback((genderId: string) => {
    setSelectedGender(prev => prev === genderId ? null : genderId);
  }, []);

  const handleGenderHover = useCallback((genderId: string, event: React.MouseEvent) => {
    setHoveredGender(genderId);
    setShowTooltip(true);
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleGenderLeave = useCallback(() => {
    setHoveredGender(null);
    setShowTooltip(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoveredGender) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, [hoveredGender]);

  // 유틸리티 함수들 - 메모화
  const getGenderData = useCallback((genderId: string) => {
    return genderData.find(gender => gender.id === genderId);
  }, [genderData]);

  const formatNumber = useCallback((num: number) => {
    return num.toLocaleString();
  }, []);

  // 툴팁 위치 계산 - 메모화
  const getTooltipStyle = useCallback(() => {
    return {
      left: `${mousePosition.x + 10}px`,
      top: `${mousePosition.y - 60}px`,
      transform: mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'translateX(0)',
    };
  }, [mousePosition]);

  // SVG 경로 계산 함수 - 메모화
  const createGenderPath = useCallback((startPercentage: number, endPercentage: number) => {
    const { outerRadius, innerRadius, centerX, centerY } = CHART_CONFIG;
    const startAngle = (startPercentage / 100) * 360;
    const endAngle = (endPercentage / 100) * 360;
    const largeArcFlag = (endPercentage - startPercentage) > 50 ? 1 : 0;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    // 외부 호
    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);
    
    // 내부 호
    const x3 = centerX + innerRadius * Math.cos(endAngleRad);
    const y3 = centerY + innerRadius * Math.sin(endAngleRad);
    const x4 = centerX + innerRadius * Math.cos(startAngleRad);
    const y4 = centerY + innerRadius * Math.sin(startAngleRad);

    return [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');
  }, []);

  return (
    <div className="bg-white rounded-lg border p-6 relative h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">성별 별 활성 사용자</h3>
      </div>

      {/* 도넛 차트 영역 */}
      <div className="flex justify-center mb-8">
        <div 
          className="relative w-80 h-80"
          onMouseMove={handleMouseMove}
        >
          <svg width={CHART_CONFIG.width} height={CHART_CONFIG.height} viewBox={CHART_CONFIG.viewBox} className="transform -rotate-90">
            {(() => {
              let cumulativePercentage = 0;
              return genderData.map((gender) => {
                const startPercentage = cumulativePercentage;
                const endPercentage = cumulativePercentage + gender.percentage;
                const pathData = createGenderPath(startPercentage, endPercentage);

                cumulativePercentage += gender.percentage;

                return (
                  <path
                    key={gender.id}
                    d={pathData}
                    fill={gender.color}
                    stroke="white"
                    strokeWidth={CHART_CONFIG.strokeWidth}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedGender === gender.id ? 'opacity-100' : 
                      hoveredGender && hoveredGender !== gender.id ? 'opacity-5' : 'opacity-100'
                    } hover:brightness-100`}
                    onClick={() => handleGenderClick(gender.id)}
                    onMouseEnter={(event) => handleGenderHover(gender.id, event)}
                    onMouseLeave={handleGenderLeave}
                  />
                );
              });
            })()}

          </svg>
          
          {/* 중앙 텍스트 - HTML 오버레이 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-sm font-medium text-gray-600">총 사용자</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(totalUsers)}</div>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-8">
        {genderData.map((gender) => (
          <div 
            key={gender.id}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              selectedGender === gender.id ? 'opacity-100' : 
              hoveredGender && hoveredGender !== gender.id ? 'opacity-60' : 'opacity-100'
            } hover:opacity-100`}
            onClick={() => handleGenderClick(gender.id)}
            onMouseEnter={(event) => handleGenderHover(gender.id, event)}
            onMouseLeave={handleGenderLeave}
            onMouseMove={handleMouseMove}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: gender.color }}
            />
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 uppercase">
                {gender.name}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {gender.percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 툴팁 */}
      {showTooltip && hoveredGender && (
        <div
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm z-50 pointer-events-none"
          style={getTooltipStyle()}
        >
          <div className="text-xs text-gray-500 mb-1">6월 20일~2025년 7월 17일</div>
          <div className="text-xs text-gray-600 mb-2">활성 사용자</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {getGenderData(hoveredGender)?.name.toLowerCase()}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {getGenderData(hoveredGender) && formatNumber(getGenderData(hoveredGender)!.users)} ({getGenderData(hoveredGender)?.percentage}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 