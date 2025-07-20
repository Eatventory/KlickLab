import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useConversionEvent } from '../../context/ConversionEventContext';

interface ConversionPath {
  path: string[];
  conversionCount: number;
  conversionRate: number;
  rank: number;
  share?: number; // 전체 전환 중 비중(%)
  compareToAvg?: number; // 평균 대비 배수
}

interface ConversionPathsResponse {
  data: ConversionPath[];
  totalConversion: number;
}

interface ConversionPathsCardProps {
  className?: string;
  refreshKey?: number;
}

const rankColors = [
  'text-blue-700', // 1위
  'text-blue-500', // 2위
  'text-gray-500', // 3위
];

const chipStyle =
  'inline-block px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700 border border-gray-200';

const ConversionPathsCard: React.FC<ConversionPathsCardProps> = ({ className, refreshKey }) => {
  const [paths, setPaths] = useState<ConversionPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentEvent } = useConversionEvent();

  useEffect(() => {
    const fetchConversionPaths = async () => {
      if (!currentEvent) return;
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        if (!token) throw new Error("No token");
        const response = await fetch(`/api/stats/userpath-summary/conversion-top3?event=${currentEvent}`, {headers: { Authorization: `Bearer ${token}` }});
        if (!response.ok) {
          throw new Error('전환 경로 데이터를 불러올 수 없습니다.');
        }
        const data: ConversionPathsResponse = await response.json();
        if (!data.data || data.data.length === 0) {
          setPaths([]);
          return;
        }
        setPaths(data.data);
      } catch (err) {
        console.error('Conversion Paths API Error:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setPaths([]);
      } finally {
        setLoading(false);
      }
    };
    fetchConversionPaths();
  }, [refreshKey, currentEvent]);

  const formatPath = (path: string[]) => (
    <div className="flex flex-wrap items-center gap-1">
      {path.map((page, idx) => (
        <React.Fragment key={idx}>
          <span className={chipStyle}>{page}</span>
          {idx < path.length - 1 && (
            <span className="mx-1 text-gray-300 text-base">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">전환 경로 Top 3</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">전환 경로 Top 3</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // undefined/null/빈 값 필터링
  const validPaths = paths.filter(
    pathData => pathData && pathData.conversionCount !== undefined && pathData.conversionRate !== undefined && Array.isArray(pathData.path) && pathData.path.length > 0 && pathData.path.every(p => !!p)
  );

  if (validPaths.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className || ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">전환 경로 Top 3</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">전환 경로 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-[520px] ${className || ''}`}> 
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">전환 경로 Top 3</h3>
      </div>
      <div className="space-y-6">
        {validPaths.map((pathData, idx) => (
          <div
            key={pathData.rank}
            className={`flex flex-col md:flex-row md:items-center md:gap-6 p-4 rounded-lg border ${idx === 0 ? 'border-blue-200 bg-blue-50' : idx === 1 ? 'border-blue-50 bg-blue-50' : 'border-gray-100 bg-gray-50'} shadow-sm`}
          >
            <div className="flex items-center min-w-[70px] mb-2 md:mb-0 font-bold text-xl text-gray-500">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              {formatPath(pathData.path)}
            </div>
            <div className="flex flex-col items-end min-w-[120px] mt-2 md:mt-0">
              <span className="text-xl font-bold text-gray-900">
                전환 {pathData.conversionCount}회
              </span>
              <span className="text-base font-semibold text-blue-700">
                전환율 {pathData.conversionRate}%
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {idx === 0
                  ? `전체 전환의 ${pathData.share ?? '-'}% 차지`
                  : `평균 대비 전환율 ${pathData.compareToAvg ?? '-'}배`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversionPathsCard; 