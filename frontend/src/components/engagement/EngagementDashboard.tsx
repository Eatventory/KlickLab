import React, { useState } from 'react';
import { ExitPageChart } from './ExitPageChart';
import { PageTimeChart } from './PageTimeChart';
import { DropoffInsightsCard } from './DropoffInsightsCard';
import { Clock, BarChart3, TrendingUp } from 'lucide-react';
import { mockDashboardData } from '../../data/mockData';

// 타입 정의
interface FilterOptions {
  period: '1hour' | '1day' | '1week' | '1month';
  pageType: 'all' | 'landing' | 'product' | 'checkout';
  sessionLength: 'all' | 'short' | 'medium' | 'long';
}

export const EngagementDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    pageType: 'all',
    sessionLength: 'all'
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
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">참여도 분석 필터</h2>
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
            value={filters.pageType}
            onChange={(e) => handleFilterChange('pageType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 페이지</option>
            <option value="landing">랜딩 페이지</option>
            <option value="product">상품 페이지</option>
            <option value="checkout">결제 페이지</option>
          </select>
          <select 
            value={filters.sessionLength}
            onChange={(e) => handleFilterChange('sessionLength', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 세션</option>
            <option value="short">짧은 세션 (1분 미만)</option>
            <option value="medium">보통 세션 (1-5분)</option>
            <option value="long">긴 세션 (5분 이상)</option>
          </select>
        </div>
      </div>

      {/* 이탈 페이지 & 페이지별 체류시간 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">이탈 페이지 분석</h2>
          </div>
          <ExitPageChart data={mockDashboardData.exitPages} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">페이지별 체류시간</h2>
          </div>
          <PageTimeChart data={mockDashboardData.pageTimes} />
        </div>
      </div>

      {/* 이탈률 요약 & 세션 길이 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <DropoffInsightsCard />
        </div>

        {/* 세션 길이 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">세션 길이 분포</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div>

      {/* 클릭 전 체류시간 */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">클릭 전 체류시간</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div>
    </div>
  );
}; 