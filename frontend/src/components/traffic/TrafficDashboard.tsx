import React, { useState } from 'react';
import { VisitorChart } from './VisitorChart';
import { TrendingUp, Globe, Clock } from 'lucide-react';
import { mockDashboardData } from '../../data/mockData';

// 타입 정의
interface FilterOptions {
  period: '1hour' | '1day' | '1week' | '1month';
  source: 'all' | 'direct' | 'search' | 'social';
  region: 'all' | 'korea' | 'global';
}

export const TrafficDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    source: 'all',
    region: 'all'
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-8">
      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">트래픽 분석 필터</h2>
        </div>
        <div className="flex gap-4">
          <select 
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1hour">최근 1시간</option>
            <option value="1day">최근 1일</option>
            <option value="1week">최근 1주</option>
            <option value="1month">최근 1개월</option>
          </select>
          <select 
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 소스</option>
            <option value="direct">직접 방문</option>
            <option value="search">검색 엔진</option>
            <option value="social">소셜 미디어</option>
          </select>
          <select 
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 지역</option>
            <option value="korea">한국</option>
            <option value="global">해외</option>
          </select>
        </div>
      </div>

      {/* 방문자 수 트렌드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">방문자 수 트렌드</h2>
        </div>
        <VisitorChart data={mockDashboardData.visitorTrend} />
      </div>

      {/* 향후 구현 예정 컴포넌트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 유입 채널 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">유입 채널 분포</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>

        {/* 시간대별 유입 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">시간대별 유입 분포</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div>
    </div>
  );
}; 