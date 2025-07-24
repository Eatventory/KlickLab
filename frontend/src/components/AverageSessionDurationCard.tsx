import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

// API 응답 타입 정의
interface SessionDurationData {
  averageDuration: number; // 초 단위
  deltaDuration: number; // 초 단위
  trend: 'up' | 'down' | 'flat';
  period: string;
}

export const AverageSessionDurationCard: React.FC = () => {
  const [data, setData] = useState<SessionDurationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  // refreshKey 상태 선언 제거

  const fetchSessionDuration = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      const response = await fetch('/api/overview/session-duration', {headers: { Authorization: `Bearer ${token}` }});
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: SessionDurationData = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch session duration:', error);
      setError('데이터를 불러오는데 실패했습니다.');
      // Fallback 데이터
      setData({
        averageDuration: 267, // 4분 27초
        deltaDuration: 72, // 1분 12초
        trend: 'up',
        period: '최근 24시간'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDuration();
  }, []); // refreshKey 대신 빈 배열을 사용하여 컴포넌트 마운트 시 한 번만 호출

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDeltaDuration = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const minutes = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    
    if (minutes > 0) {
      return `${seconds >= 0 ? '+' : '-'}${minutes}분 ${secs}초`;
    }
    return `${seconds >= 0 ? '+' : '-'}${secs}초`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendBgColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-100';
      case 'down':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div 
      className="relative p-3 rounded-xl border border-gray-200 shadow-sm bg-white aspect-square flex flex-col justify-center cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-center">
        <div className="p-2 rounded-lg shadow-sm mx-auto mb-2 w-fit bg-blue-50">
          <div className="text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">평균 세션 길이</h3>
        <p className="text-2xl font-bold text-gray-900 font-mono mb-2">
          {formatDuration(data.averageDuration)}
        </p>
        
        <div className="flex items-center justify-center gap-1">
          <div className={clsx(
            'p-1 rounded-full transition-all duration-300',
            getTrendBgColor(data.trend)
          )}>
            {getTrendIcon(data.trend)}
          </div>
          <span className={clsx(
            'text-sm font-semibold',
            getTrendColor(data.trend)
          )}>
            {formatDeltaDuration(data.deltaDuration)}
          </span>
        </div>
      </div>

      {/* Hover 툴팁 */}
      {isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
          <div className="font-semibold text-gray-900">평균 세션 길이</div>
          <div className="text-blue-600 font-bold">{formatDuration(data.averageDuration)}</div>
          <div className="text-gray-500 text-xs">
            {data.period} 기준
          </div>
          <div className="text-gray-500 text-xs">
            세션당 평균 체류 시간
          </div>
        </div>
      )}
    </div>
  );
}; 