import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface BounceData {
  page_path: string;
  total_views: string;
  total_exits: string;
  bounce_rate: number;
}

interface BounceSummaryData {
  data: BounceData[];
}

interface BounceInsightsCardProps {
  refreshKey?: number;
  loading?: boolean;
}

export const BounceInsightsCard: React.FC<BounceInsightsCardProps> = ({ refreshKey, loading }) => {
  const [data, setData] = useState<BounceData[]>([]);
  const [hoveredItem, setHoveredItem] = useState<BounceData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX + 12, y: e.clientY + 12 });
  };

  useEffect(() => {
    const fetchBounceData = async () => {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      try {
        if (!token) throw new Error("No token");
        const response = await fetch('/api/engagement/bounce-top', { headers: { Authorization: `Bearer ${token}` } });
        const result: BounceSummaryData = await response.json();
        setData(result.data || []);
      } catch (error) {
        console.error('Failed to fetch Bounce data:', error);
      }
    };

    fetchBounceData();
    const interval = setInterval(fetchBounceData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>이탈률 데이터가 없습니다</p>
      </div>
    );
  }

  const top10 = data.slice(0, 10);
  const maxbounceRate = Math.max(...top10.map(item => item.bounce_rate));

  const getPageDisplayName = (page: string) => {
    const pageNames: { [key: string]: string } = {
      '/signup': '회원가입',
      '/checkout': '결제',
      '/pricing': '요금제',
      '/product-detail': '상품상세',
      '/cart': '장바구니',
      '/login': '로그인',
      '/profile': '프로필',
      '/settings': '설정',
      '/faq': 'FAQ'
    };
    return pageNames[page] || page;
  };

  return (
    <div className="flex flex-col justify-between h-[calc(100%-3rem)]">
      <div>
        {top10.map((item) => {
          const percentage = maxbounceRate > 0 ? (item.bounce_rate / maxbounceRate) * 100 : 0;
          const now = new Date();
          const endDate = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
          const startDate = new Date(now.setDate(now.getDate() - 7)).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric'
          });

          return (
            <div
              key={item.page_path}
              className="relative group px-1 py-1.5"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              onMouseMove={handleMouseMove}
            >
              <div className="flex items-center gap-2">
                {/* 페이지명 + 그래프 */}
                <div className="flex-1 overflow-hidden hover:bg-gray-100 p-1">
                  <div className="flex justify-between items-center text-md text-gray-800">
                    <span className="truncate">{getPageDisplayName(item.page_path)}</span>
                    <span className="ml-2 font-semibold">{item.bounce_rate.toFixed(1)}%</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-gray-200 mt-1">
                    <div
                      className="absolute top-0 left-0 h-1.5 bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 툴팁 */}
              {hoveredItem?.page_path === item.page_path && (
                <div
                  className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg text-md text-gray-800 px-3 py-2 whitespace-nowrap"
                  style={{
                    top: tooltipPosition.y,
                    left: tooltipPosition.x,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="text-sm text-gray-500 mb-1">{startDate}~{endDate}</div>
                  <div className="text-sm font-semibold uppercase text-gray-600 mb-1">
                    {hoveredItem.page_path}
                  </div>
                  <div className="text-md font-bold text-gray-900">
                    이탈률 {hoveredItem.bounce_rate.toLocaleString()}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 평균 이탈률 */}
      <div className="pt-2">
        <div className="flex justify-between text-md text-gray-600">
          <span>평균 이탈률</span>
          <span className="font-bold text-gray-900">
            {(top10.reduce((sum, item) => sum + item.bounce_rate, 0) / top10.length).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};