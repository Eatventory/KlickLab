import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { getRangeLabel } from '../../utils/getRangeLabel';
import dayjs from 'dayjs';

// 타입 정의
type GenderId = 'male' | 'female' | 'unknown';

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
  unknown: '#9ca3af'  // 회색 - 알 수 없음
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
      processGenderData(data);
      setLoading(false);
    } else if (externalLoading) {
      setLoading(true);
    } else {
      setLoading(false);
      setGenderData([]);
    }
  }, [data, externalLoading]);

  // 성별 데이터 처리 함수 분리
  const processGenderData = (apiData: any[]) => {
    // 성별별 사용자 집계
    const genderMap: Record<string, number> = {};
    
    apiData.forEach((row: any) => {
      const gender = row.gender;
      const users = row.users;

      if (gender && gender !== 'unknown' && users > 0) {
        if (!genderMap[gender]) {
          genderMap[gender] = 0;
        }
        genderMap[gender] += Number(users);
      }
    });

    // 알려진 성별(male, female)과 알려지지 않은 성별 분리
    const knownGenderUsers = (genderMap.male || 0) + (genderMap.female || 0);
    const unknownGenderUsers = Object.entries(genderMap)
      .filter(([gender]) => gender !== 'male' && gender !== 'female')
      .reduce((sum, [, count]) => sum + count, 0);

    // 알려지지 않은 성별들 로그 출력
    const unknownGenders = Object.entries(genderMap)
      .filter(([gender]) => gender !== 'male' && gender !== 'female');

    // 총 사용자 수 계산 (알려진 성별 + 알 수 없음)
    const totalUsers = knownGenderUsers + unknownGenderUsers;

    // 데이터 변환 (차트 회전 고려: FEMALE 먼저, MALE 나중에)
    const formattedData: GenderData[] = [];
    
    // FEMALE 먼저 추가 (회전 후 왼쪽에 위치)
    if ((genderMap.female || 0) > 0) {
      const femaleData = {
        id: 'female' as GenderId,
        name: 'FEMALE',
        users: genderMap.female || 0,
        percentage: totalUsers > 0 ? Math.round(((genderMap.female || 0) / totalUsers) * 1000) / 10 : 0,
        color: GENDER_COLORS.female
      };
      formattedData.push(femaleData);
    }
    
    // MALE 나중에 추가 (회전 후 오른쪽에 위치)
    if ((genderMap.male || 0) > 0) {
      const maleData = {
        id: 'male' as GenderId,
        name: 'MALE',
        users: genderMap.male || 0,
        percentage: totalUsers > 0 ? Math.round(((genderMap.male || 0) / totalUsers) * 1000) / 10 : 0,
        color: GENDER_COLORS.male
      };
      formattedData.push(maleData);
    }

    // "알 수 없음" 성별 추가 (unknownGenderUsers > 0인 경우에만)
    if (unknownGenderUsers > 0) {
      const unknownPercentage = totalUsers > 0 ? Math.round((unknownGenderUsers / totalUsers) * 1000) / 10 : 0;
      const unknownData = {
        id: 'unknown' as GenderId,
        name: 'UNKNOWN',
        users: unknownGenderUsers,
        percentage: unknownPercentage,
        color: GENDER_COLORS.unknown
      };
      formattedData.push(unknownData);
    }

    setGenderData(formattedData);
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
    const endAngle   = (endPercentage   / 100) * 360;
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
      {actualLoading && (
        <div className="flex-1 flex flex-col">
          {/* 도넛 차트 스켈레톤 */}
          <div className="flex justify-center mb-8">
            <div className="relative w-80 h-80 flex items-center justify-center">
              {/* 실제 차트와 동일한 크기의 도넛 스켈레톤 */}
              {/* 외부 원: 반지름 125px = 지름 250px */}
              <div className="absolute w-[250px] h-[250px] rounded-full border-[25px] border-gray-200 animate-pulse"></div>
              
              {/* 내부 원 (도넛 홀): 반지름 75px = 지름 150px */}
              <div className="absolute w-[150px] h-[150px] bg-white rounded-full"></div>
              
              {/* 로딩 스피너 */}
              <div className="absolute w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
          
          {/* 범례 스켈레톤 */}
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* 로딩 텍스트 */}
          <div className="flex justify-center mt-4">
            <div className="text-gray-500 text-sm">데이터를 불러오는 중...</div>
          </div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!actualLoading && genderData.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">표시할 데이터가 없습니다.</div>
        </div>
      )}

      {/* 도넛 차트 영역 */}
      {!actualLoading && genderData.length > 0 && (
        <>
      <div className="flex justify-center mb-8">
        <div 
          className="relative w-80 h-80"
          onMouseMove={handleMouseMove}
        >
          <svg width={CHART_CONFIG.width} height={CHART_CONFIG.height} viewBox={CHART_CONFIG.viewBox}>
            {(() => {
              let cumulativePercentage = 0;

              // 강제로 순서를 뒤집어서 FEMALE이 왼쪽에 나오도록 함
              const reversedData = [...genderData].reverse();
              return reversedData.map((gender) => {
                const startPercentage = cumulativePercentage;
                const endPercentage = cumulativePercentage + gender.percentage;
                const pathData = createGenderPath(startPercentage, endPercentage);

                cumulativePercentage += gender.percentage;

                // 텍스트 위치 계산
                const midAngle = ((startPercentage + endPercentage) / 2) * 3.6; // -90도 회전 보정은 SVG 자체에 적용
                const textRadius = (CHART_CONFIG.innerRadius + CHART_CONFIG.outerRadius) / 2;
                const textX = CHART_CONFIG.centerX + textRadius * Math.cos((midAngle * Math.PI) / 180);
                const textY = CHART_CONFIG.centerY + textRadius * Math.sin((midAngle * Math.PI) / 180);

                // 텍스트 회전 각도 계산 (90도 추가 회전 + 거꾸로 뒤집히지 않도록)
                let rotationAngle = midAngle + 90;
                if (midAngle > 0 && midAngle < 180) {
                  rotationAngle = midAngle + 270;
                }

                return (
                  <React.Fragment key={gender.id}>
                    <path
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
                    {gender.percentage > 5 && ( // 비율이 너무 작으면 텍스트 표시 안함
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        className="pointer-events-none"
                        transform={`rotate(${rotationAngle}, ${textX}, ${textY})`}
                      >
                        <tspan x={textX} dy="-0.5em" className="font-semibold text-sm">{gender.name}</tspan>
                        <tspan x={textX} dy="1.2em" className="text-xs">{gender.percentage}%</tspan>
                      </text>
                    )}
                  </React.Fragment>
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