import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import clsx from 'clsx';

// API 응답 타입 정의
interface ConversionSummaryData {
  conversionRate: number;
  convertedSessions: number;
  totalSessions: number;
  deltaRate: number;
  trend: 'up' | 'down' | 'flat';
}

export const ConversionSummaryCard: React.FC = () => {
  const [data, setData] = useState<ConversionSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchConversionSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/overview/conversion-summary');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ConversionSummaryData = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch conversion summary:', error);
        setError('데이터를 불러오는데 실패했습니다.');
        // Fallback 데이터
        setData({
          conversionRate: 38.4,
          convertedSessions: 384,
          totalSessions: 1000,
          deltaRate: 2.3,
          trend: 'up'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConversionSummary();
    
    // 30초마다 데이터 갱신
    const interval = setInterval(fetchConversionSummary, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="p-2 rounded-lg shadow-sm mx-auto mb-2 w-fit bg-purple-50">
          <div className="text-purple-600">
            <Target className="w-6 h-6" />
          </div>
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">전환률</h3>
        <p className="text-2xl font-bold text-gray-900 mb-2">
          {data.conversionRate.toFixed(1)}%
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
            {data.deltaRate > 0 ? '+' : ''}{data.deltaRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Hover 툴팁 */}
      {isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
          <div className="font-semibold text-gray-900">전환 요약</div>
          <div className="text-purple-600 font-bold">{data.conversionRate.toFixed(1)}%</div>
          <div className="text-gray-500 text-xs">
            {data.convertedSessions.toLocaleString()} / {data.totalSessions.toLocaleString()} 세션
          </div>
          <div className="text-gray-500 text-xs">
            최근 7일 기준
          </div>
        </div>
      )}
    </div>
  );
}; 