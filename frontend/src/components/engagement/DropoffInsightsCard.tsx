import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';

interface DropoffData {
  page: string;
  dropRate: number;
}

interface DropoffSummaryData {
  data: DropoffData[];
}

export const DropoffInsightsCard: React.FC = () => {
  const [data, setData] = useState<DropoffData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const fetchDropoffData = async () => {
      try {
        const response = await fetch('/api/stats/dropoff-summary');
        const result: DropoffSummaryData = await response.json();
        setData(result.data || []);
      } catch (error) {
        console.error('Failed to fetch dropoff data:', error);
        // Mock data
        setData([
          { page: "/signup", dropRate: 43.2 },
          { page: "/checkout", dropRate: 31.8 },
          { page: "/pricing", dropRate: 21.7 },
          { page: "/product-detail", dropRate: 18.5 },
          { page: "/cart", dropRate: 15.3 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDropoffData();
    const interval = setInterval(fetchDropoffData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

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

  const top5 = data.slice(0, 5);
  const maxDropRate = Math.max(...top5.map(item => item.dropRate));

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

  const getDropoffColor = (rate: number) => {
    if (rate >= 40) return 'text-red-600';
    if (rate >= 25) return 'text-orange-600';
    if (rate >= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">이탈률 TOP 5</h3>
            <p className="text-sm text-gray-500">UX 개선 우선순위</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-xs text-gray-500">실시간</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {top5.map((item, index) => {
          const percentage = maxDropRate > 0 ? (item.dropRate / maxDropRate) * 100 : 0;
          const isTop = index === 0;
          
          return (
            <div 
              key={item.page} 
              className="relative group"
              onMouseEnter={() => setHoveredItem(item.page)}
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
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors duration-200">
                      {getPageDisplayName(item.page)}
                    </span>
                    <span className={`text-sm font-bold ${getDropoffColor(item.dropRate)} ml-2`}>
                      {item.dropRate}%
                    </span>
                  </div>
                  
                  <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${
                        isTop 
                          ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-sm' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}
                      style={{ 
                        width: `${percentage}%`,
                        boxShadow: isTop ? '0 1px 4px rgba(239, 68, 68, 0.3)' : 'none'
                      }}
                    />
                    <div
                      className={`absolute inset-0 rounded-full transition-all duration-500 ${
                        isTop 
                          ? 'bg-gradient-to-r from-red-400 to-red-500 opacity-20 blur-sm' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 opacity-10 blur-sm'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {hoveredItem === item.page && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
                  <div className="font-semibold text-gray-900">{getPageDisplayName(item.page)}</div>
                  <div className={`font-bold ${getDropoffColor(item.dropRate)}`}>{item.dropRate}% 이탈률</div>
                  <div className="text-gray-500 text-xs">
                    {item.page}
                  </div>
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
            {(top5.reduce((sum, item) => sum + item.dropRate, 0) / top5.length).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}; 