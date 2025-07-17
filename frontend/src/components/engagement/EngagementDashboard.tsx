import React, { useState, useEffect } from 'react';
import { ExitPageChart } from './ExitPageChart';
import { PageTimeChart } from './PageTimeChart';
import { DropoffInsightsCard } from './DropoffInsightsCard';
import { Clock, BarChart3, TrendingUp } from 'lucide-react';
import { mockDashboardData } from '../../data/mockData';
import { useSegmentFilter } from '../../context/SegmentFilterContext';

// 타입 정의
interface FilterOptions {
  period: '1hour' | '1day' | '1week' | '1month';
  pageType: 'all' | 'landing' | 'product' | 'checkout';
  sessionLength: 'all' | 'short' | 'medium' | 'long';
}

interface PageTimeData {
  page: string;
  averageTime: number;
  visitCount: number;
}

export const EngagementDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    pageType: 'all',
    sessionLength: 'all'
  });

  const [pageTimes, setPageTimes] = useState<PageTimeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      setLoading(true);
      setError(null);
      
      // 전역 필터 조건을 URL 파라미터로 변환
      const globalFilterParams = new URLSearchParams();
      if (globalFilter.conditions) {
        Object.entries(globalFilter.conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            globalFilterParams.append(key, String(value));
          }
        });
      }
      
      const globalFilterString = globalFilterParams.toString();
      const globalFilterQuery = globalFilterString ? `&${globalFilterString}` : '';
      
      const params = new URLSearchParams(filters as any).toString();
      const res = await fetch(`/api/engagement/page-times?${params}${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error('페이지 체류시간 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setPageTimes(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, JSON.stringify(globalFilter.conditions)]);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const engagementFilter = (
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
  );

  return (
    <div className="space-y-8">
      {/* {engagementFilter} */}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
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
          <PageTimeChart data={pageTimes} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <DropoffInsightsCard />
        </div>
      </div>
    </div>
  );
}; 