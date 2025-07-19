import React, { useState, useEffect } from 'react';
import { getRangeLabel } from '../../utils/getRangeLabel';
import dayjs from 'dayjs';

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

interface AgeActiveUsersProps {
  dateRange?: { startDate: Date; endDate: Date; key: string };
  data?: any[];  // 전달받은 user_age 데이터
  loading?: boolean;  // 로딩 상태
}

export const AgeActiveUsers: React.FC<AgeActiveUsersProps> = ({ dateRange, data, loading: externalLoading }) => {
  console.log('[AgeActiveUsers] Props 확인:', { 
    hasData: !!data, 
    dataLength: data?.length,
    dataPreview: data?.slice(0, 5)
  });
  const [hoveredAge, setHoveredAge] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 실제 로딩 상태는 외부에서 전달받은 것 또는 내부 상태 사용
  const actualLoading = externalLoading !== undefined ? externalLoading : loading;

  // 연령대 라벨 매핑
  const ageLabels: Record<string, string> = {
    '10s': '10대',
    '20s': '20대', 
    '30s': '30대',
    '40s': '40대',
    '50s': '50대',
    '60s+': '60대 이상'
  };

  // 연령대 순서 정의 (10대부터 60대+ 순)
  const ageOrder = ['10s', '20s', '30s', '40s', '50s', '60s+'];

  // 외부 데이터 처리 useEffect
  useEffect(() => {
    if (data && Array.isArray(data)) {
      console.log('[AgeActiveUsers] 외부 데이터 사용:', data);
      processAgeData(data);
      setLoading(false);
    } else {
      fetchAgeData();
    }
  }, [dateRange, data]);

  // 연령 데이터 처리 함수 분리
  const processAgeData = (dataArray: any[]) => {
    console.log('[AgeActiveUsers] 연령 데이터 처리 시작:', dataArray);

    // 연령별 사용자 집계
    const ageMap: Record<string, number> = {};
    
    dataArray.forEach((row: any) => {
      if (row.segment_type === 'user_age' && row.segment_value) {
        const age = row.segment_value;
        console.log('[AgeActiveUsers] 연령 데이터 처리:', age, row.user_count, row);
        if (!ageMap[age]) ageMap[age] = 0;
        ageMap[age] += parseInt(row.user_count);
      }
    });

    console.log('[AgeActiveUsers] 최종 ageMap:', ageMap);

    // 최대값 계산하여 색상 강도 결정
    const maxUsersInData = Math.max(...Object.values(ageMap));

    // 연령대 순서에 따라 데이터 정렬 및 변환 (강제 순서 보장)
    const formattedData: AgeData[] = ageOrder
      .filter(age => ageMap[age] && ageMap[age] > 0)  // 데이터가 있는 연령대만 포함 (안전한 체크)
      .map((age, index) => ({
        id: age,
        ageRange: ageLabels[age],
        users: ageMap[age] || 0,
        color: `hsl(220, 70%, ${85 - (index * 10)}%)`  // 단색 계열, 그라데이션 없음
      }));

    console.log('[AgeActiveUsers] ageOrder:', ageOrder);
    console.log('[AgeActiveUsers] ageMap:', ageMap);
    console.log('[AgeActiveUsers] 최종 formattedData 순서:', formattedData.map(d => `${d.ageRange}: ${d.users}`));
    setAgeData(formattedData);
  };

  // 동적 단위 처리 함수
  const getDisplayUnit = (maxValue: number) => {
    if (maxValue >= 10000) {
      return { unit: '만', divisor: 10000 };
    } else if (maxValue >= 1000) {
      return { unit: '천', divisor: 1000 };
    } else {
      return { unit: '', divisor: 1 };
    }
  };

  // 값 포맷팅 함수 (소수점 제거, 숫자만 표시)
  const formatValue = (value: number, divisor: number) => {
    if (divisor === 1) return value.toString();
    const result = Math.round(value / divisor);  // 소수점 제거하고 반올림
    return result.toString();
  };

  // 현재 데이터의 최대값 계산
  const maxUsers = ageData.length > 0 ? Math.max(...ageData.map(item => item.users)) : 0;
  const { unit, divisor } = getDisplayUnit(maxUsers);
  
  // 차트 스케일 계산 (최대값의 1.1배로 여유 공간 확보)
  const chartMax = Math.ceil((maxUsers * 1.1) / divisor) * divisor;

  const fetchAgeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

      let dateQuery = '';
      if (dateRange) {
        const startStr = dayjs(dateRange.startDate).format('YYYY-MM-DD');
        const endStr = dayjs(dateRange.endDate).format('YYYY-MM-DD');
        dateQuery = `?startDate=${startStr}&endDate=${endStr}`;
      }

      const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      
      // 안전한 데이터 접근
      const dataArray = result.data || result || [];
      
      // 공통 데이터 처리 함수 사용
      processAgeData(dataArray);
    } catch (error) {
      console.error('Failed to fetch age data:', error);
      // Fallback 데이터 (10대부터 60대+ 순서)
      setAgeData([
        { id: '10s', ageRange: '10대', users: 8000, color: 'hsl(220, 70%, 85%)' },
        { id: '20s', ageRange: '20대', users: 58000, color: 'hsl(220, 70%, 75%)' },
        { id: '30s', ageRange: '30대', users: 42000, color: 'hsl(220, 70%, 65%)' },
        { id: '40s', ageRange: '40대', users: 25000, color: 'hsl(220, 70%, 55%)' },
        { id: '50s', ageRange: '50대', users: 18000, color: 'hsl(220, 70%, 45%)' },
        { id: '60s+', ageRange: '60대 이상', users: 12000, color: 'hsl(220, 70%, 35%)' }
      ]);
    } finally {
      setLoading(false);
    }
  };

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

      {/* 로딩 상태 */}
      {actualLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!actualLoading && ageData.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">표시할 데이터가 없습니다.</div>
        </div>
      )}

      {/* 막대 그래프 영역 */}
      {!actualLoading && ageData.length > 0 && (
      <div className="relative flex-1 flex flex-col justify-center">
        {/* 배경 그리드 */}
        <div className="absolute left-16 right-13 top-0 bottom-0 flex justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-px h-full bg-gray-200 opacity-20"></div>
          ))}
        </div>
        
        <div className="space-y-3 relative z-10">
          {ageData.map((age) => {
            const barWidth = (age.users / chartMax) * 100;
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
                        backgroundColor: isHovered ? '#4338ca' : age.color,
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
                
                {/* 사용자 수 표시 (동적 단위) */}
                <div className="w-10 text-right text-xs font-medium text-gray-600">
                  {formatValue(age.users, divisor)}{unit}
                </div>
              </div>
            );
          })}
      </div>

      {/* X축 눈금 (동적) */}
      <div className="mt-8 ml-16 mr-13">
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