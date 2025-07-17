import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import HorizontalBarChart from '../HorizontalBarChart';

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
      <HorizontalBarChart
        data={top10.map((item) => ({
          label: getPageDisplayName(item.page_path),
          value: item.bounce_rate,
          raw: item,
        }))}
        tooltipRenderer={(item, start, end) => (
          <>
            <div className="text-sm text-gray-500 mb-1">{start}~{end}</div>
            <div className="text-sm font-semibold uppercase text-gray-600 mb-1">
              {item.raw.page_path}
            </div>
            <div className="text-md font-bold text-gray-900">
              이탈률 {item.value.toLocaleString()}%
            </div>
          </>
        )}
      />

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