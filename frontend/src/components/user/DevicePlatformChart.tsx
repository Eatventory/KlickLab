import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { getRangeLabel } from '../../utils/getRangeLabel';
import dayjs from 'dayjs';

interface PlatformData {
  id: string;
  name: string;
  users: number;
  percentage: number;
  color: string;
  deviceType: 'mobile' | 'desktop';

  startAngle?: number;  // 외부 원형에서 시작 각도
  endAngle?: number;    // 외부 원형에서 종료 각도
}

interface DeviceData {
  id: string;
  name: string;
  users: number;
  percentage: number;
  color: string;
}

interface MousePosition {
  x: number;
  y: number;
}


interface DevicePlatformChartProps {
  dateRange?: { startDate: Date; endDate: Date; key: string };
  data?: any[];  // 전달받은 device_type 데이터
  loading?: boolean;  // 로딩 상태
}

// 타입 정의
type PlatformKey = 'ios' | 'android' | 'windows' | 'mac';
type DeviceType = 'mobile' | 'desktop';

// 플랫폼별 색상 매핑 (API 데이터와 독립적)
const PLATFORM_COLORS: Record<PlatformKey, string> = {
  ios: '#E89996',      // 살색 - iOS
  android: '#A6BF51',  // 녹색 - Android  
  windows: '#64ACEA',  // 하늘색 - Windows
  mac: '#5F6061',      // 회색 - Mac
} as const;

// 기기별 색상 매핑
const DEVICE_COLORS: Record<DeviceType, string> = {
  mobile: '#FF8C26',   // 오렌지 - Mobile
  desktop: '#000000',  // 검은색 - Desktop
} as const;

// 차트 설정 상수
const CHART_CONFIG = {
  centerX: 140,
  centerY: 140,
  innerRadius: 42,
  outerRadius: 84,
  platformInnerRadius: 84,
  platformOuterRadius: 126,
  deviceTextRadius: 63,
  platformTextRadius: 105,
} as const;

// API 데이터를 차트 데이터로 변환하는 유틸리티 함수
const transformApiData = (apiData: Array<{platform: string, users: number, percentage: number}>): PlatformData[] => {
  return apiData.map(item => {
    const platformKey = item.platform.toLowerCase() as PlatformKey;
    const deviceType: DeviceType = (platformKey === 'ios' || platformKey === 'android') ? 'mobile' : 'desktop';
    
    return {
      id: platformKey,
      name: item.platform,
      users: item.users,
      percentage: item.percentage,
      color: PLATFORM_COLORS[platformKey] || '#6b7280', // 기본 색상
      deviceType
    };
  });
};


export const DevicePlatformChart: React.FC<DevicePlatformChartProps> = ({ dateRange, data, loading: externalLoading }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 실제 로딩 상태는 외부에서 전달받은 것 또는 내부 상태 사용
  const actualLoading = externalLoading !== undefined ? externalLoading : loading;

  useEffect(() => {
    fetchDevicePlatformData();
  }, [dateRange]);

  const fetchDevicePlatformData = async () => {
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

      console.log('[DevicePlatformChart] 요청 시작:', dateQuery);

      const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      console.log('[DevicePlatformChart] API 응답 전체:', result);
      
      // device_type 세그먼트 데이터 확인
      
      // device_type 세그먼트에서 기기 타입 정보 추출
      const platformMap: Record<string, number> = {};
      
      // 안전한 데이터 접근
      const dataArray = result.data || result || [];
      console.log('[DevicePlatformChart] 데이터 배열:', dataArray);
      console.log('[DevicePlatformChart] 데이터 배열 길이:', Array.isArray(dataArray) ? dataArray.length : 'not array');

      // device_type 세그먼트 확인 (실제 데이터 구조)
      const deviceTypeSegments = dataArray.filter((row: any) => row.segment_type === 'device_type');
      console.log('[DevicePlatformChart] device_type 세그먼트:', deviceTypeSegments);
      
      // 기기 타입별 데이터 수집 (내부 링)
      const deviceTypeMap: Record<string, number> = {};
      // OS별 데이터 수집 (외부 링)  
      const osMap: Record<string, number> = {};
      
      if (Array.isArray(dataArray)) {
        dataArray.forEach((row: any) => {
          // segment_type이 'device_type'이고 dist_type이 'device_os'인 경우 처리
          if (row.segment_type === 'device_type' && 
              row.dist_type === 'device_os' && 
              row.segment_value && 
              row.dist_value) {
            
            const deviceType = row.segment_value.toLowerCase(); // desktop, mobile
            const os = row.dist_value.toLowerCase(); // android, other, etc.
            const userCount = parseInt(row.user_count);
            
            console.log('[DevicePlatformChart] 데이터 처리:', {
              deviceType, 
              os, 
              userCount, 
              row
            });
            
            // 기기 타입별 집계 (내부 링)
            if (!deviceTypeMap[deviceType]) deviceTypeMap[deviceType] = 0;
            deviceTypeMap[deviceType] += userCount;
            
            // OS별 집계 (외부 링)
            if (!osMap[os]) osMap[os] = 0;
            osMap[os] += userCount;
          }
        });
      } else {
        console.error('[DevicePlatformChart] 데이터가 배열이 아닙니다:', typeof dataArray, dataArray);
      }

      console.log('[DevicePlatformChart] 기기 타입별 집계:', deviceTypeMap);
      console.log('[DevicePlatformChart] OS별 집계:', osMap);

      // 총 사용자 수 계산
      const totalUsers = Object.values(osMap).reduce((sum, count) => sum + count, 0);

      // OS별 실제 데이터로 플랫폼 데이터 생성
      const formattedData: PlatformData[] = [];
      
      // 플랫폼별로 중복 제거하면서 데이터 집계
      const finalPlatformMap: Record<string, number> = {};
      
      Object.entries(osMap).forEach(([osKey, userCount]) => {
        let platformKey: PlatformKey;
        
        // OS 매핑
        switch (osKey.toLowerCase()) {
          case 'android':
            platformKey = 'android';
            break;
          case 'ios':
            platformKey = 'ios';
            break;
          case 'windows':
            platformKey = 'windows';
            break;
          case 'mac':
          case 'macos':
            platformKey = 'mac';
            break;
          case 'other':
          default:
            // 'Other'나 알 수 없는 OS는 기기 타입에 따라 분류
            if (deviceTypeMap.desktop && deviceTypeMap.desktop > (deviceTypeMap.mobile || 0)) {
              platformKey = 'windows';
            } else {
              platformKey = 'android';
            }
            break;
        }
        
                 // 플랫폼별로 사용자 수 집계 (중복 제거)
         if (!finalPlatformMap[platformKey]) finalPlatformMap[platformKey] = 0;
         finalPlatformMap[platformKey] += userCount;
       });
       
       // 최종 플랫폼 데이터 생성
       Object.entries(finalPlatformMap).forEach(([platformKey, userCount]) => {
        const typedPlatformKey = platformKey as PlatformKey;
        let platformName: string;
        let deviceType: DeviceType;
        
        switch (typedPlatformKey) {
          case 'android':
            platformName = 'Android';
            deviceType = 'mobile';
            break;
          case 'ios':
            platformName = 'iOS';
            deviceType = 'mobile';
            break;
          case 'windows':
            platformName = 'Windows';
            deviceType = 'desktop';
            break;
          case 'mac':
            platformName = 'macOS';
            deviceType = 'desktop';
            break;
          default:
            platformName = platformKey;
            deviceType = 'desktop';
        }
        
        formattedData.push({
          id: typedPlatformKey,
          name: platformName,
          users: userCount,
          percentage: totalUsers > 0 ? Math.round((userCount / totalUsers) * 1000) / 10 : 0,
          color: PLATFORM_COLORS[typedPlatformKey] || '#6b7280',
          deviceType
        });
      });

      setPlatformData(formattedData);
    } catch (error) {
      setPlatformData([]);
    } finally {
      setLoading(false);
    }
  };

  // 기기별 데이터 계산 - 메모화
  const deviceData = useMemo((): DeviceData[] => {
    if (platformData.length === 0) return [];
    
    const mobileUsers = platformData.filter(p => p.deviceType === 'mobile').reduce((sum, p) => sum + p.users, 0);
    const desktopUsers = platformData.filter(p => p.deviceType === 'desktop').reduce((sum, p) => sum + p.users, 0);
    const totalUsers = mobileUsers + desktopUsers;
    
    return [
    {
      id: 'mobile',
      name: 'Mobile',
        users: mobileUsers,
        percentage: totalUsers > 0 ? Math.round((mobileUsers / totalUsers) * 1000) / 10 : 0,
      color: DEVICE_COLORS.mobile
    },
    {
      id: 'desktop', 
      name: 'Desktop',

        users: desktopUsers,
        percentage: totalUsers > 0 ? Math.round((desktopUsers / totalUsers) * 1000) / 10 : 0,
      color: DEVICE_COLORS.desktop
    }
    ];
  }, [platformData]);

  // 총 사용자 수 계산 - 메모화
  const totalUsers = useMemo(() => 
    platformData.reduce((sum, platform) => sum + platform.users, 0)
  , [platformData]);

  // 이벤트 핸들러들 - 메모화
  const handleSegmentHover = useCallback((segmentId: string, event: React.MouseEvent) => {
    setHoveredSegment(segmentId);
    setShowTooltip(true);
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleSegmentLeave = useCallback(() => {
    setHoveredSegment(null);
    setShowTooltip(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoveredSegment) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, [hoveredSegment]);

  // 유틸리티 함수들 - 메모화
  const getSegmentData = useCallback((segmentId: string) => {
    return platformData.find(p => p.id === segmentId) || deviceData.find(d => d.id === segmentId);
  }, [platformData, deviceData]);

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
  const createArcPath = useCallback((centerX: number, centerY: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    const x1 = centerX + outerRadius * Math.cos(startAngleRad);
    const y1 = centerY + outerRadius * Math.sin(startAngleRad);
    const x2 = centerX + outerRadius * Math.cos(endAngleRad);
    const y2 = centerY + outerRadius * Math.sin(endAngleRad);
    
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">기기 및 플랫폼별 활성 사용자</h3>
      </div>


      {/* 로딩 상태 */}
      {actualLoading && (
        <div className="flex-1 flex flex-col">
          {/* 이중 도넛 차트 스켈레톤 */}
          <div className="flex items-center justify-center flex-1">
            <div className="relative">
              <div className="relative w-[280px] h-[280px] flex items-center justify-center">
                {/* 외부 링 스켈레톤 (플랫폼): 외부 반지름 126px, 내부 반지름 84px */}
                <div className="absolute w-[252px] h-[252px] rounded-full border-[21px] border-gray-200 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                
                {/* 내부 링 스켈레톤 (기기 타입): 외부 반지름 84px, 내부 반지름 42px */}
                <div className="absolute w-[168px] h-[168px] rounded-full border-[21px] border-gray-300 animate-pulse" style={{animationDelay: '0.4s'}}></div>
                
                {/* 중앙 홀: 반지름 42px = 지름 84px */}
                <div className="absolute w-[84px] h-[84px] bg-white rounded-full"></div>
                
                {/* 로딩 스피너 */}
                <div className="absolute w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              
              {/* 범례 스켈레톤 */}
              <div className="mt-6 flex flex-col gap-3">
                {/* 기기 타입 범례 */}
                <div className="flex justify-center gap-6">
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-14 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
                
                {/* 플랫폼별 범례 */}
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="w-12 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="w-16 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="w-18 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="w-10 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 로딩 텍스트 */}
          <div className="flex justify-center mt-4">
            <div className="text-gray-500 text-sm">데이터를 불러오는 중...</div>
          </div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!actualLoading && platformData.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">표시할 데이터가 없습니다.</div>
        </div>
      )}

      {!actualLoading && platformData.length > 0 && (
        <>
      <div className="flex items-center justify-center flex-1">
        <div className="relative">
                      <svg width="280" height="280" viewBox="0 0 280 280">
            {(() => {
              const { centerX, centerY } = CHART_CONFIG;
              
              // 내부 원형 차트 (기기별)
              let deviceCumulativeAngle = 0;
              const deviceSegments = deviceData.map((device) => {
                const startAngle = deviceCumulativeAngle;
                const endAngle = deviceCumulativeAngle + (device.percentage / 100) * 360;
                const isHovered = hoveredSegment === device.id;
                
                const pathData = createArcPath(centerX, centerY, CHART_CONFIG.innerRadius, CHART_CONFIG.outerRadius, startAngle, endAngle);
                deviceCumulativeAngle = endAngle;

                return (
                  <path

                    key={`device-${device.id}`}
                    d={pathData}
                    fill={device.color}
                    stroke="white"
                    strokeWidth="3"
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      opacity: hoveredSegment === device.id ? 1 : 
                               hoveredSegment && hoveredSegment !== device.id ? 0.6 : 1,
                      filter: isHovered ? 'brightness(1.2)' : 'none'
                    }}
                    onMouseEnter={(event) => handleSegmentHover(device.id, event)}
                    onMouseLeave={handleSegmentLeave}
                    onMouseMove={handleMouseMove}
                  />
                );
              });


              // 외부 원형 차트 (플랫폼별) - device_type별로 그룹핑
              const platformSegments = (() => {
                const segments: React.ReactElement[] = [];
                let deviceCumulativeAngle = 0;
                
                // device_type 순서대로 처리
                ['mobile', 'desktop'].forEach(deviceType => {
                  const deviceInfo = deviceData.find(d => d.id === deviceType);
                  if (!deviceInfo) return;
                  
                  const deviceStartAngle = deviceCumulativeAngle;
                  const deviceEndAngle = deviceCumulativeAngle + (deviceInfo.percentage / 100) * 360;
                  
                  // 현재 device_type에 속하는 플랫폼들
                  const devicePlatforms = platformData.filter(p => p.deviceType === deviceType);
                  const deviceTotal = devicePlatforms.reduce((sum, p) => sum + p.users, 0);
                  
                  let platformCumulativeAngle = deviceStartAngle;
                  
                  devicePlatforms.forEach((platform) => {
                    // device_type 내에서의 비율 계산
                    const platformRatio = deviceTotal > 0 ? platform.users / deviceTotal : 0;
                    const platformAngleRange = (deviceEndAngle - deviceStartAngle) * platformRatio;
                    
                const startAngle = platformCumulativeAngle;
                    const endAngle = platformCumulativeAngle + platformAngleRange;
                const isHovered = hoveredSegment === platform.id;
                
                const pathData = createArcPath(centerX, centerY, CHART_CONFIG.platformInnerRadius, CHART_CONFIG.platformOuterRadius, startAngle, endAngle);
                platformCumulativeAngle = endAngle;


                    segments.push(
                  <path
                        key={`platform-${platform.id}`}
                    d={pathData}
                    fill={platform.color}
                    stroke="white"
                    strokeWidth="3"
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      opacity: hoveredSegment === platform.id ? 1 : 
                               hoveredSegment && hoveredSegment !== platform.id ? 0.6 : 0.9,
                      filter: isHovered ? 'brightness(1.2)' : 'none'
                    }}
                    onMouseEnter={(event) => handleSegmentHover(platform.id, event)}
                    onMouseLeave={handleSegmentLeave}
                    onMouseMove={handleMouseMove}
                  />
                );
              });

                  
                  deviceCumulativeAngle = deviceEndAngle;
                });
                
                return segments;
              })();

              // 내부 링 텍스트 (기기별)
              let deviceTextAngle = 0;
              const deviceTexts = deviceData.map((device) => {
                const startAngle = deviceTextAngle;
                const endAngle = deviceTextAngle + (device.percentage / 100) * 360;
                const midAngle = (startAngle + endAngle) / 2;
                const midAngleRad = (midAngle * Math.PI) / 180;
                
                // 텍스트 위치 계산 (내부 링의 중간)
                const textRadius = CHART_CONFIG.deviceTextRadius;
                const textX = centerX + textRadius * Math.cos(midAngleRad);
                const textY = centerY + textRadius * Math.sin(midAngleRad);
                
                // 텍스트 회전 각도 계산 (90도 추가 회전 + 거꾸로 뒤집히지 않도록)
                let rotationAngle = midAngle + 90;
                if (midAngle > 0 && midAngle < 180) {
                  rotationAngle = midAngle + 270;
                }
                
                deviceTextAngle = endAngle;

                // 세그먼트가 충분히 클 때만 텍스트 표시
                if (device.percentage < 15) return null;

                return (

                  <g key={`device-${device.id}-text`}>
                    <text 
                      x={textX} 
                      y={textY} 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      className="text-xs font-semibold fill-white pointer-events-none"
                      transform={`rotate(${rotationAngle}, ${textX}, ${textY})`}
                      dy="-0.5em"
                    >
                      {device.name}
                    </text>
                    <text 
                      x={textX} 
                      y={textY} 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      className="text-xs font-medium fill-white pointer-events-none"
                      transform={`rotate(${rotationAngle}, ${textX}, ${textY})`}
                      dy="0.7em"
                    >
                      {device.percentage}%
                    </text>
                  </g>
                );
              });


              // 외부 링 텍스트 (플랫폼별) - device_type별로 그룹핑
              const platformTexts = (() => {
                const texts: React.ReactElement[] = [];
                let deviceCumulativeAngle = 0;
                
                // device_type 순서대로 처리  
                ['mobile', 'desktop'].forEach(deviceType => {
                  const deviceInfo = deviceData.find(d => d.id === deviceType);
                  if (!deviceInfo) return;
                  
                  const deviceStartAngle = deviceCumulativeAngle;
                  const deviceEndAngle = deviceCumulativeAngle + (deviceInfo.percentage / 100) * 360;
                  
                  // 현재 device_type에 속하는 플랫폼들
                  const devicePlatforms = platformData.filter(p => p.deviceType === deviceType);
                  const deviceTotal = devicePlatforms.reduce((sum, p) => sum + p.users, 0);
                  
                  let platformCumulativeAngle = deviceStartAngle;
                  
                  devicePlatforms.forEach((platform) => {
                    // device_type 내에서의 비율 계산
                    const platformRatio = deviceTotal > 0 ? platform.users / deviceTotal : 0;
                    const platformAngleRange = (deviceEndAngle - deviceStartAngle) * platformRatio;
                    
                    const startAngle = platformCumulativeAngle;
                    const endAngle = platformCumulativeAngle + platformAngleRange;
                const midAngle = (startAngle + endAngle) / 2;
                const midAngleRad = (midAngle * Math.PI) / 180;
                
                // 텍스트 위치 계산 (외부 링의 중간)
                const textRadius = CHART_CONFIG.platformTextRadius;
                const textX = centerX + textRadius * Math.cos(midAngleRad);
                const textY = centerY + textRadius * Math.sin(midAngleRad);
                
                // 텍스트 회전 각도 계산 (90도 추가 회전 + 거꾸로 뒤집히지 않도록)
                let rotationAngle = midAngle + 90;
                if (midAngle > 0 && midAngle < 180) {
                  rotationAngle = midAngle + 270;
                }
                

                    platformCumulativeAngle = endAngle;

                // 세그먼트가 충분히 클 때만 텍스트 표시
                    const actualPercentage = (platformAngleRange / 360) * 100;
                    if (actualPercentage < 8) return;

                    texts.push(
                      <g key={`platform-${platform.id}-text`}>
                    <text 
                      x={textX} 
                      y={textY} 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      className="text-xs font-semibold fill-white pointer-events-none"
                      transform={`rotate(${rotationAngle}, ${textX}, ${textY})`}
                      dy="-0.5em"
                    >
                      {platform.name}
                    </text>
                    <text 
                      x={textX} 
                      y={textY} 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      className="text-xs font-medium fill-white pointer-events-none"
                      transform={`rotate(${rotationAngle}, ${textX}, ${textY})`}
                      dy="0.7em"
                    >

                          {actualPercentage.toFixed(1)}%
                    </text>
                  </g>
                );
              });

                  
                  deviceCumulativeAngle = deviceEndAngle;
                });
                
                return texts.filter(Boolean);
              })();

              return [...deviceSegments, ...platformSegments, ...deviceTexts.filter(Boolean), ...platformTexts.filter(Boolean)];
            })()}

            {/* 중앙 텍스트 */}
            <text x={CHART_CONFIG.centerX} y={CHART_CONFIG.centerY - 10} textAnchor="middle" className="text-sm font-medium fill-gray-600">
              총 사용자
            </text>
            <text x={CHART_CONFIG.centerX} y={CHART_CONFIG.centerY + 10} textAnchor="middle" className="text-lg font-bold fill-gray-900">
              {formatNumber(totalUsers)}
            </text>
          </svg>
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-8 flex justify-center">
        <div className="grid grid-cols-2 gap-6">
          {/* Mobile 범례 */}
          <div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div 
                className="w-3 h-3 rounded-full"

                    style={{ backgroundColor: deviceData[0]?.color }}
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 uppercase">Mobile</div>
                    <div className="text-lg font-bold text-gray-900">{deviceData[0]?.percentage}%</div>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              {platformData.filter(p => p.deviceType === 'mobile').map((platform) => (
                <div 
                  key={platform.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onMouseEnter={(event) => handleSegmentHover(platform.id, event)}
                  onMouseLeave={handleSegmentLeave}
                  onMouseMove={handleMouseMove}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {platform.name} ({platform.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop 범례 */}
          <div>
            <div className="flex items-center gap-2 cursor-pointer">
              <div 
                className="w-3 h-3 rounded-full"

                    style={{ backgroundColor: deviceData[1]?.color }}
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 uppercase">Desktop</div>
                    <div className="text-lg font-bold text-gray-900">{deviceData[1]?.percentage}%</div>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              {platformData.filter(p => p.deviceType === 'desktop').map((platform) => (
                <div 
                  key={platform.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onMouseEnter={(event) => handleSegmentHover(platform.id, event)}
                  onMouseLeave={handleSegmentLeave}
                  onMouseMove={handleMouseMove}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {platform.name} ({platform.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        </>
      )}

      {/* 툴팁 */}
      {showTooltip && hoveredSegment && (
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
              {getSegmentData(hoveredSegment)?.name}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {getSegmentData(hoveredSegment) && formatNumber(getSegmentData(hoveredSegment)!.users)} ({getSegmentData(hoveredSegment)?.percentage}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 