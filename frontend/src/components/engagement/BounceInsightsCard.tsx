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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const fetchBounceData = async () => {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      try {
        if (!token) throw new Error("No token");
        const response = await fetch('/api/engagement/bounce-top', {headers: { Authorization: `Bearer ${token}` }});
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
      '/settings': '설정'
    };
    return pageNames[page] || page;
  };

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">이탈률 TOP 10</h3>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {top10.map((item, index) => {
          const percentage = maxbounceRate > 0 ? (item.bounce_rate / maxbounceRate) * 100 : 0;
          const isTop = index === 0;
          
          return (
            <div 
              key={item.page_path} 
              className="relative group"
              onMouseEnter={() => setHoveredItem(item.page_path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-100 hover:border-red-200 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-all duration-300 ${
                  isTop 
                    ? 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-sm' 
                    : 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0 px-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors duration-200">
                      {getPageDisplayName(item.page_path)}
                    </span>
                    <span className={`text-sm font-bold text-black ml-2`}>
                      {item.bounce_rate}%
                    </span>
                  </div>
                  
                  <div className="relative w-3/4 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${
                        index === 0 
                          ? 'bg-red-600' 
                          : index === 1
                          ? 'bg-red-500'
                          : index === 2
                          ? 'bg-red-400'
                          : index === 3
                          ? 'bg-red-300'
                          : 'bg-red-200'
                      }`}
                      style={{ 
                        width: `${percentage}%`,
                        boxShadow: '0 1px 4px rgba(239, 68, 68, 0.12)'
                      }}
                    />
                  </div>
                </div>
              </div>
              {hoveredItem === item.page_path && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
                  <div className="font-semibold text-gray-900">{getPageDisplayName(item.page_path)}</div>
                  <div className="font-bold text-red-500">{item.bounce_rate}% 이탈률</div>
                  <div className="text-gray-500 text-xs">{item.page_path}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">평균 이탈률</span>
          <span className="font-bold text-gray-900">
            {(top10.reduce((sum, item) => sum + item.bounce_rate, 0) / top10.length).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}; 