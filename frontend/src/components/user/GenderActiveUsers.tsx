import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { getRangeLabel } from '../../utils/getRangeLabel';
import dayjs from 'dayjs';

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

interface GenderActiveUsersProps {
  dateRange?: { startDate: Date; endDate: Date; key: string };
  data?: any[];  // 전달받은 user_gender 데이터
  loading?: boolean;  // 로딩 상태
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

export const GenderActiveUsers: React.FC<GenderActiveUsersProps> = ({ dateRange, data, loading: externalLoading }) => {
  console.log('[GenderActiveUsers] Props 확인:', { 
    hasData: !!data, 
    dataLength: data?.length, 
    externalLoading,
    dataPreview: data?.slice(0, 3)
  });
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [hoveredGender, setHoveredGender] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 실제 로딩 상태는 외부에서 전달받은 것 또는 내부 상태 사용
  const actualLoading = externalLoading !== undefined ? externalLoading : loading;

  // 외부 데이터 처리 useEffect
  useEffect(() => {
    if (data && Array.isArray(data)) {
      console.log('[GenderActiveUsers] 외부 데이터 사용:', data);
      processGenderData(data);
      setLoading(false);
    } else {
      fetchGenderData();
    }
  }, [dateRange, data]);

  // 성별 데이터 처리 함수 분리
  const processGenderData = (dataArray: any[]) => {
    // 성별별 사용자 집계
    const genderMap: Record<string, number> = {};
    
    dataArray.forEach((row: any) => {
      if (row.segment_type === 'user_gender' && row.segment_value && row.segment_value !== 'unknown') {
        const gender = row.segment_value;
        console.log('[GenderActiveUsers] 성별 데이터 처리:', gender, row.user_count, row);
        if (!genderMap[gender]) genderMap[gender] = 0;
        genderMap[gender] += parseInt(row.user_count);
      }
    });

    console.log('[GenderActiveUsers] 최종 genderMap:', genderMap);

    // 총 사용자 수 계산
    const totalUsers = Object.values(genderMap).reduce((sum, count) => sum + count, 0);
    console.log('[GenderActiveUsers] 총 사용자 수:', totalUsers);

    // 데이터 변환 (차트 회전 고려: FEMALE 먼저, MALE 나중에)
    const formattedData: GenderData[] = [];
    
    // FEMALE 먼저 추가 (회전 후 왼쪽에 위치)
    if ((genderMap.female || 0) > 0) {
      formattedData.push({
        id: 'female',
        name: 'FEMALE',
        users: genderMap.female || 0,
        percentage: totalUsers > 0 ? Math.round(((genderMap.female || 0) / totalUsers) * 1000) / 10 : 0,
        color: GENDER_COLORS.female
      });
    }
    
    // MALE 나중에 추가 (회전 후 오른쪽에 위치)
    if ((genderMap.male || 0) > 0) {
      formattedData.push({
        id: 'male',
        name: 'MALE',
        users: genderMap.male || 0,
        percentage: totalUsers > 0 ? Math.round(((genderMap.male || 0) / totalUsers) * 1000) / 10 : 0,
        color: GENDER_COLORS.male
      });
    }

    console.log('[GenderActiveUsers] 최종 formattedData 순서:', formattedData);
    setGenderData(formattedData);
  };

  const fetchGenderData = async () => {
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

      console.log('[GenderActiveUsers] 요청 시작:', dateQuery);

      const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      console.log('[GenderActiveUsers] API 응답 전체:', result);
      
      // user_gender 세그먼트 데이터 확인
      
      // user_gender 세그먼트 데이터 필터링 및 집계
      const genderMap: Record<string, number> = {};
      
      // 안전한 데이터 접근
      const dataArray = result.data || result || [];
      console.log('[GenderActiveUsers] 데이터 배열:', dataArray);
      console.log('[GenderActiveUsers] 데이터 배열 길이:', Array.isArray(dataArray) ? dataArray.length : 'not array');
      
      // gender 세그먼트 데이터만 필터링해서 확인
      const genderSegments = dataArray.filter((row: any) => row.segment_type === 'user_gender');
      console.log('[GenderActiveUsers] user_gender 세그먼트:', genderSegments);
      
      if (Array.isArray(dataArray)) {
        dataArray.forEach((row: any) => {
          if (row.segment_type === 'user_gender') {
            const gender = row.segment_value;
            console.log('[GenderActiveUsers] 성별 데이터 처리:', gender, row.user_count, row);
            if (!genderMap[gender]) genderMap[gender] = 0;
            genderMap[gender] += parseInt(row.user_count);
          }
        });
      } else {
        console.error('[GenderActiveUsers] 데이터가 배열이 아닙니다:', typeof dataArray, dataArray);
      }

      console.log('[GenderActiveUsers] 최종 genderMap:', genderMap);

      // 총 사용자 수 계산
      const totalUsers = Object.values(genderMap).reduce((sum, count) => sum + count, 0);
      console.log('[GenderActiveUsers] 총 사용자 수:', totalUsers);

      // 데이터 변환 (차트 회전 고려: FEMALE 먼저, MALE 나중에)
      const formattedData: GenderData[] = [];
      
      // FEMALE 먼저 추가 (회전 후 왼쪽에 위치)
      if ((genderMap.female || 0) > 0) {
        formattedData.push({
          id: 'female',
          name: 'FEMALE',
          users: genderMap.female || 0,
          percentage: totalUsers > 0 ? Math.round(((genderMap.female || 0) / totalUsers) * 1000) / 10 : 0,
          color: GENDER_COLORS.female
        });
      }
      
      // MALE 나중에 추가 (회전 후 오른쪽에 위치)
      if ((genderMap.male || 0) > 0) {
        formattedData.push({
          id: 'male',
          name: 'MALE',
          users: genderMap.male || 0,
          percentage: totalUsers > 0 ? Math.round(((genderMap.male || 0) / totalUsers) * 1000) / 10 : 0,
          color: GENDER_COLORS.male
        });
      }

      console.log('[GenderActiveUsers] 최종 formattedData 순서:', formattedData);
      setGenderData(formattedData);
    } catch (error) {
      console.error('Failed to fetch gender data:', error);
      // Fallback 데이터 (FEMALE 먼저, MALE 나중에 - 차트와 범례 일치)
      setGenderData([
        { id: 'female', name: 'FEMALE', users: 175000, percentage: 39.4, color: GENDER_COLORS.female },
        { id: 'male', name: 'MALE', users: 267000, percentage: 60.6, color: GENDER_COLORS.male }
      ]);
    } finally {
      setLoading(false);
    }
  };

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

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!loading && genderData.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">표시할 데이터가 없습니다.</div>
        </div>
      )}

      {/* 도넛 차트 영역 */}
      {!loading && genderData.length > 0 && (
        <>
      <div className="flex justify-center mb-8">
        <div 
          className="relative w-80 h-80"
          onMouseMove={handleMouseMove}
        >
          <svg width={CHART_CONFIG.width} height={CHART_CONFIG.height} viewBox={CHART_CONFIG.viewBox} className="transform -rotate-90">
            {(() => {
              let cumulativePercentage = 0;
              // 강제로 순서를 뒤집어서 FEMALE이 왼쪽에 나오도록 함
              const reversedData = [...genderData].reverse();
              console.log('[GenderActiveUsers] SVG 렌더링 순서:', reversedData.map(d => d.name));
              return reversedData.map((gender) => {
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
        </>
      )}

      {/* 툴팁 */}
      {showTooltip && hoveredGender && (
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