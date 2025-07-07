import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface TopClickItem {
  label: string;
  count: number;
}

interface TopClicksData {
  items: TopClickItem[];
}

export const TopClicks: React.FC = () => {
  const [data, setData] = useState<TopClickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopClicks = async () => {
      try {
        const response = await fetch(`/api/stats/top-clicks`);
        const result: TopClicksData = await response.json();
        setData(result.items || []);
      } catch (error) {
        console.error('Failed to fetch top clicks:', error);
        setData([
          { label: '구매하기', count: 1203 },
          { label: '장바구니', count: 987 },
          { label: '로그인', count: 756 },
          { label: '검색', count: 543 },
          { label: '상품상세', count: 432 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopClicks();
    
    const interval = setInterval(fetchTopClicks, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(item => item.count));

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">클릭 TOP 5</h3>
            <p className="text-sm text-gray-500">인기 요소 분석</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">실시간</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const isTop = index === 0;
          
          return (
            <div 
              key={index} 
              className="relative group"
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-all duration-300 ${
                  isTop 
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm' 
                    : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900 ml-2">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${
                        isTop 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ 
                        width: `${percentage}%`,
                        boxShadow: isTop ? '0 1px 4px rgba(34, 197, 94, 0.3)' : 'none'
                      }}
                    />
                    <div
                      className={`absolute inset-0 rounded-full transition-all duration-500 ${
                        isTop 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 opacity-20 blur-sm' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 opacity-10 blur-sm'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {hoveredItem === item.label && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
                  <div className="font-semibold text-gray-900">{item.label}</div>
                  <div className="text-blue-600 font-bold">{item.count.toLocaleString()}회 클릭</div>
                  <div className="text-gray-500 text-xs">
                    전체의 {((item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">총 클릭 수</span>
          <span className="font-bold text-gray-900">
            {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}; 