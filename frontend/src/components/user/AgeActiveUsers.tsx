
import React, { useState, useMemo, useCallback } from 'react';
import { getRangeLabel } from '../../utils/getRangeLabel';
import dayjs from 'dayjs';

// 타입 정의
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


interface ApiDataItem {
  segment_type: string;
  segment_value: string;
  user_count: number;
}

interface AgeActiveUsersProps {
  dateRange?: { startDate: Date; endDate: Date; key: string };
  data?: ApiDataItem[];
  loading?: boolean;
}

// 연령대 순서 및 라벨 매핑
const ageOrder = ['10s', '20s', '30s', '40s', '50s', '60s+'];

const ageLabels: Record<string, string> = {
  '10s': '10대',
  '20s': '20대', 
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60s+': '60+'
};

const ageLabelsSummary: Record<string, string> = {
  '10s': '10대',
  '20s': '20대', 
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60s+': '60대 이상'
};

export const AgeActiveUsers: React.FC<AgeActiveUsersProps> = ({ 
  dateRange, 
  data, 
  loading: externalLoading = false 
}) => {
  const [hoveredAge, setHoveredAge] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);


  // 연령 데이터 처리 (메모화)
  const ageData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const ageMap: Record<string, number> = {};
    
    data.forEach((row) => {
      if (row.segment_type === 'user_age' && row.segment_value) {
        const age = row.segment_value;
        if (!ageMap[age]) ageMap[age] = 0;
        ageMap[age] += parseInt(row.user_count.toString());
      }
    });

    // 최대값 계산하여 색상 강도 결정
    const maxUsersInData = Math.max(...Object.values(ageMap));

    // 연령대 순서에 따라 데이터 정렬 및 변환
    const formattedData: AgeData[] = ageOrder
      .filter(age => ageMap[age] && ageMap[age] > 0)
      .map((age, index) => ({
        id: age,
        ageRange: ageLabels[age],
        users: ageMap[age] || 0,
        color: `hsl(220, 70%, ${85 - (index * 10)}%)`
      }));

    return formattedData;
  }, [data]);

  // 동적 단위 처리 (메모화)
  const displayUnit = useMemo(() => {
    const maxValue = Math.max(...ageData.map(d => d.users));
    if (maxValue >= 10000) {
      return { unit: '만', divisor: 10000 };
    } else if (maxValue >= 1000) {
      return { unit: '천', divisor: 1000 };
    } else {
      return { unit: '', divisor: 1 };
    }
  }, [ageData]);

  // 최대 높이 계산 (메모화)
  const maxBarHeight = useMemo(() => {
    const maxUsers = Math.max(...ageData.map(d => d.users));
    return maxUsers > 0 ? 180 : 50;
  }, [ageData]);

  // 이벤트 핸들러들 (메모화)
  const handleMouseEnter = useCallback((ageId: string, event: React.MouseEvent) => {
    setHoveredAge(ageId);
    setShowTooltip(true);
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredAge(null);
    setShowTooltip(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoveredAge) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, [hoveredAge]);

  // 값 포맷팅 함수 (소수점 제거, 숫자만 표시)
  const formatValue = (value: number, divisor: number) => {
    if (divisor === 1) return value.toString();
    const result = Math.round(value / divisor);  // 소수점 제거하고 반올림
    return result.toString();
  };

  // 현재 데이터의 최대값 계산
  const maxUsers = ageData.length > 0 ? Math.max(...ageData.map(item => item.users)) : 0;
  const { unit, divisor } = displayUnit;
  
  // 차트 스케일 계산 (최대값의 1.1배로 여유 공간 확보)
  const chartMax = Math.ceil((maxUsers * 1.1) / divisor) * divisor;

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

    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-full flex flex-col">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">연령 별 활성 사용자</h3>
      </div>

      {/* 로딩 상태 */}
      {externalLoading && (
        <div className="flex-1 flex flex-col">
          {/* 바 차트 스켈레톤 */}
          <div className="relative flex-1 flex flex-col justify-start">
            {/* 배경 그리드 스켈레톤 */}
            <div className="absolute left-18 right-13 top-0 bottom-0 flex justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-px h-full bg-gray-200 opacity-20"></div>
              ))}
            </div>

            {/* Y축 레이블 스켈레톤 */}
            <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between text-right">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-3 bg-gray-200 rounded animate-pulse ml-auto" style={{animationDelay: `${i * 0.1}s`}}></div>
              ))}
            </div>

            {/* 바 차트 스켈레톤 영역 */}
            <div className="ml-18 mr-13 flex items-end justify-between mt-4" style={{ height: '160px' }}>
              {/* 6개 연령대별 바 스켈레톤 */}
              {['10대', '20대', '30대', '40대', '50대', '60+'].map((age, index) => {
                // 각 바마다 다른 높이로 스켈레톤 생성 (랜덤한 느낌)
                const heights = ['60%', '85%', '70%', '45%', '35%', '25%'];
                return (
                  <div key={age} className="flex flex-col items-center flex-1">
                    {/* 스켈레톤 바 */}
                    <div 
                      className="w-12 bg-gray-200 rounded-t animate-pulse"
                      style={{ 
                        height: heights[index],
                        animationDelay: `${index * 0.15}s`
                      }}
                    ></div>
                    
                    {/* X축 레이블 스켈레톤 */}
                    <div 
                      className="mt-3 w-8 h-3 bg-gray-200 rounded animate-pulse"
                      style={{animationDelay: `${index * 0.15 + 0.3}s`}}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* 중앙 로딩 스피너 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
          
          {/* 로딩 텍스트 */}
          <div className="flex justify-center mt-2">
            <div className="text-gray-500 text-sm">데이터를 불러오는 중...</div>
          </div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!externalLoading && ageData.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">표시할 데이터가 없습니다.</div>
        </div>
      )}

      {/* 막대 그래프 영역 */}
      {!externalLoading && ageData.length > 0 && (
      <div className="relative flex-1 flex flex-col justify-start">
        {/* 배경 그리드 */}
        <div className="absolute left-18 right-13 top-0 bottom-0 flex justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-px h-full bg-gray-200 opacity-20"></div>
          ))}
        </div>
        

        <div className="space-y-2 relative z-10 mt-4">
          {ageData.map((age) => {
            const barWidth = (age.users / chartMax) * 100;
            const isHovered = hoveredAge === age.id;
            
            return (
              <div key={age.id} className="flex items-center">
                {/* 연령대 라벨 */}

                <div className="w-14 text-right text-sm font-medium text-gray-700 mr-4 whitespace-nowrap">
                  {age.ageRange}
                </div>
                
                {/* 막대 그래프 */}
                <div className="flex-1 relative mr-3">

                  <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 cursor-pointer relative"
                      style={{
                        width: `${barWidth}%`,

                        backgroundColor: isHovered ? '#4338ca' : age.color,
                        boxShadow: isHovered 
                          ? '0 2px 8px rgba(79, 70, 229, 0.3)' 
                          : '0 1px 3px rgba(79, 70, 229, 0.2)',
                        transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}

                                             onMouseEnter={(event) => handleMouseEnter(age.id, event)}
                       onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    />
                  </div>
                </div>
                

                {/* 사용자 수 표시 (동적 단위) */}
                <div className="w-10 text-right text-xs font-medium text-gray-600">
                  {formatValue(age.users, divisor)}{unit}
                </div>
              </div>
            );
          })}

      </div>

      {/* X축 눈금 (동적) - 바 시작점과 끝점에 정확히 정렬 */}
      <div className="mt-3" style={{ marginLeft: '70px', marginRight: '50px' }}>
        <div className="flex justify-between text-xs text-gray-400 font-medium mb-2">
          <span>0</span>
          <span>{formatValue(chartMax / 4, divisor)}{unit}</span>
          <span>{formatValue(chartMax / 2, divisor)}{unit}</span>
          <span>{formatValue(chartMax, divisor)}{unit}</span>
        </div>
        <div className="w-full h-px bg-gray-200"></div>
      </div>
      </div>
      )}

      {/* 툴팁 */}
      {showTooltip && hoveredAge && (
        <div
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm z-50 pointer-events-none"
          style={getTooltipStyle()}
        >

          <div className="text-xs text-gray-500 mb-1">
            {dateRange ? getRangeLabel(dateRange.startDate, dateRange.endDate) : '전체 기간'}
          </div>
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