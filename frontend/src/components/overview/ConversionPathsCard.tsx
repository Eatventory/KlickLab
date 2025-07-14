import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConversionPath {
  path: string[];
  conversionCount: number;
  conversionRate: number;
  rank: number;
  share?: number; // 전체 전환 중 비중(%)
  compareToAvg?: number; // 평균 대비 배수
}

interface ConversionPathsCardProps {
  className?: string;
  refreshKey?: number;
}

const rankIcons = [
  <span className="text-4xl mr-1" role="img" aria-label="1위">🥇</span>,
  <span className="text-4xl mr-1" role="img" aria-label="2위">🥈</span>,
  <span className="text-4xl mr-1" role="img" aria-label="3위">🥉</span>,
];

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

  useEffect(() => {
    // Mock 데이터 사용 (비중, 평균 대비 추가)
    const total = 156 + 89 + 67;
    const avgRate = (12.8 + 8.2 + 6.1) / 3;
    const mockPaths: ConversionPath[] = [
      {
        path: ['/home', '/products', '/product-detail', '/cart', '/checkout'],
        conversionCount: 156,
        conversionRate: 12.8,
        rank: 1,
        share: Math.round((156 / total) * 100),
        compareToAvg: +(12.8 / avgRate).toFixed(1),
      },
      {
        path: ['/home', '/categories', '/products', '/cart', '/checkout'],
        conversionCount: 89,
        conversionRate: 8.2,
        rank: 2,
        share: Math.round((89 / total) * 100),
        compareToAvg: +(8.2 / avgRate).toFixed(1),
      },
      {
        path: ['/home', '/search', '/product-detail', '/cart', '/checkout'],
        conversionCount: 67,
        conversionRate: 6.1,
        rank: 3,
        share: Math.round((67 / total) * 100),
        compareToAvg: +(6.1 / avgRate).toFixed(1),
      },
    ];

    setPaths(mockPaths);
    setLoading(false);
  }, [refreshKey]);

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

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className || ''}`}> 
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">전환 경로 Top 3</h3>
      </div>
      <div className="space-y-6">
        {paths.map((pathData, idx) => (
          <div
            key={pathData.rank}
            className={`flex flex-col md:flex-row md:items-center md:gap-6 p-4 rounded-lg border ${idx === 0 ? 'border-blue-200 bg-blue-50' : idx === 1 ? 'border-blue-50 bg-blue-50' : 'border-gray-100 bg-gray-50'} shadow-sm`}
          >
            <div className="flex items-center min-w-[70px] mb-2 md:mb-0">
              {rankIcons[idx]}
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
                  ? `전체 전환의 ${pathData.share}% 차지`
                  : `평균 대비 전환율 ${pathData.compareToAvg}배`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversionPathsCard; 