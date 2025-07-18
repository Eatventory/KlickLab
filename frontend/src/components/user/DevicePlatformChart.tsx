import React, { useState, useMemo, useCallback } from 'react';

interface PlatformData {
  id: string;
  name: string;
  users: number;
  percentage: number;
  color: string;
  deviceType: 'mobile' | 'desktop';
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

export const DevicePlatformChart: React.FC = () => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // 플랫폼별 데이터 (API에서 받아올 구조 예시) - 메모화
  const platformData = useMemo((): PlatformData[] => [
    { id: 'ios', name: 'iOS', users: 180000, percentage: 40.9, color: PLATFORM_COLORS.ios, deviceType: 'mobile' },
    { id: 'android', name: 'Android', users: 120000, percentage: 27.3, color: PLATFORM_COLORS.android, deviceType: 'mobile' },
    { id: 'windows', name: 'Windows', users: 100000, percentage: 22.7, color: PLATFORM_COLORS.windows, deviceType: 'desktop' },
    { id: 'mac', name: 'Mac', users: 40000, percentage: 9.1, color: PLATFORM_COLORS.mac, deviceType: 'desktop' }
  ], []);

  // 기기별 데이터 계산 - 메모화
  const deviceData = useMemo((): DeviceData[] => [
    {
      id: 'mobile',
      name: 'Mobile',
      users: platformData.filter(p => p.deviceType === 'mobile').reduce((sum, p) => sum + p.users, 0),
      percentage: 68.2,
      color: DEVICE_COLORS.mobile
    },
    {
      id: 'desktop', 
      name: 'Desktop',
      users: platformData.filter(p => p.deviceType === 'desktop').reduce((sum, p) => sum + p.users, 0),
      percentage: 31.8,
      color: DEVICE_COLORS.desktop
    }
  ], [platformData]);

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
                    key={device.id}
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

              // 외부 원형 차트 (플랫폼별)
              let platformCumulativeAngle = 0;
              const platformSegments = platformData.map((platform) => {
                const startAngle = platformCumulativeAngle;
                const endAngle = platformCumulativeAngle + (platform.percentage / 100) * 360;
                const isHovered = hoveredSegment === platform.id;
                
                const pathData = createArcPath(centerX, centerY, CHART_CONFIG.platformInnerRadius, CHART_CONFIG.platformOuterRadius, startAngle, endAngle);
                platformCumulativeAngle = endAngle;

                return (
                  <path
                    key={platform.id}
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
                  <g key={`${device.id}-text`}>
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

              // 외부 링 텍스트 (플랫폼별)
              let platformTextAngle = 0;
              const platformTexts = platformData.map((platform) => {
                const startAngle = platformTextAngle;
                const endAngle = platformTextAngle + (platform.percentage / 100) * 360;
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
                
                platformTextAngle = endAngle;

                // 세그먼트가 충분히 클 때만 텍스트 표시
                if (platform.percentage < 8) return null;

                return (
                  <g key={`${platform.id}-text`}>
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
                      {platform.percentage}%
                    </text>
                  </g>
                );
              });

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
                style={{ backgroundColor: deviceData[0].color }}
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 uppercase">Mobile</div>
                <div className="text-lg font-bold text-gray-900">{deviceData[0].percentage}%</div>
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
                style={{ backgroundColor: deviceData[1].color }}
              />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 uppercase">Desktop</div>
                <div className="text-lg font-bold text-gray-900">{deviceData[1].percentage}%</div>
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

      {/* 툴팁 */}
      {showTooltip && hoveredSegment && (
        <div
          className="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm z-50 pointer-events-none"
          style={getTooltipStyle()}
        >
          <div className="text-xs text-gray-500 mb-1">6월 20일~2025년 7월 17일</div>
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