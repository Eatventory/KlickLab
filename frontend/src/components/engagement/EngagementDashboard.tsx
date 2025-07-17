import React, { useState, useEffect } from 'react';
// import { ExitPageChart } from './ExitPageChart';
// import { PageTimeChart } from './PageTimeChart';
// import { Clock, BarChart3, TrendingUp } from 'lucide-react';
// import { mockDashboardData } from '../../data/mockData';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import HorizontalBarChart from '../HorizontalBarChart';
import HorizontalLineChart from '../HorizontalLineChart';
import { getPageLabel } from '../../utils/getPageLabel';

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

interface PageViewData {
  page: string;
  totalViews: number;
}

interface BounceRatesData {
  page_path: string;
  total_views: string;
  total_exits: string;
  bounce_rate: number;
}

interface ViewData {
  date: string;
  totalViews: number;
}

const testdata = [
  { date: '6월 20일', value: 11000 },
  { date: '6월 22일', value: 9000 },
  { date: '6월 24일', value: 14000 },
  { date: '6월 26일', value: 15000 },
  { date: '6월 28일', value: 10000 },
  { date: '7월 1일', value: 12000 },
  { date: '7월 3일', value: 8000 },
  { date: '7월 5일', value: 7000 },
  { date: '7월 7일', value: 13000 },
  { date: '7월 9일', value: 14000 },
  { date: '7월 11일', value: 10000 },
  { date: '7월 13일', value: 16000 },
  { date: '7월 15일', value: 12000 },
];

export const EngagementDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    pageType: 'all',
    sessionLength: 'all'
  });

  const [pageTimes, setPageTimes] = useState<PageTimeData[]>([]);
  const [pageViews, setPageViews] = useState<PageViewData[]>([]);
  const [bounceRates, setBounceRates] = useState<BounceRatesData[]>([]);
  const [Views, setViews] = useState<ViewData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      setLoading(true);
      setError(null);
      
      // const globalFilterParams = new URLSearchParams();
      // if (globalFilter.conditions) {
      //   Object.entries(globalFilter.conditions).forEach(([key, value]) => {
      //     if (value !== undefined && value !== null && value !== '') {
      //       globalFilterParams.append(key, String(value));
      //     }
      //   });
      // }
      
      // const globalFilterString = globalFilterParams.toString();
      // const globalFilterQuery = globalFilterString ? `&${globalFilterString}` : '';
      
      // const params = new URLSearchParams(filters as any).toString();
      // const res = await fetch(`/api/engagement/page-times?${params}${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }});

      const [resPageTimes, resPageViews, resBounceRates, resViews] = await Promise.all([
        fetch(`/api/engagement/page-times`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-views`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/bounce-rate', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/views', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!resPageTimes.ok) throw new Error('Page Times 데이터를 불러오지 못했습니다.');
      if (!resPageViews.ok) throw new Error('Page Views 데이터를 불러오지 못했습니다.');
      if (!resBounceRates.ok) throw new Error('Bounce 데이터를 불러오지 못했습니다.');
      if (!resViews.ok) throw new Error('Bounce 데이터를 불러오지 못했습니다.');

      const [dataPageTimes, dataPageViews, dataBounceRates, dataViews] = await Promise.all([
        resPageTimes.json(),
        resPageViews.json(),
        resBounceRates.json(),
        resViews.json()
      ]);

      setPageTimes(dataPageTimes);
      setPageViews(dataPageViews);
      setBounceRates(dataBounceRates);
      setViews(dataViews);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
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
            <h2 className="text-lg font-semibold text-gray-900">페이지 체류시간</h2>
          </div>
          <HorizontalBarChart
            data={pageTimes.map((d) => ({
              label: getPageLabel(d.page),
              value: d.averageTime,
              raw: d,
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">최근 7일간</div>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {item.raw.page}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  평균 체류시간 {item.value < 1
                    ? `${Math.round(item.value * 60)}초`
                    : `${item.value.toFixed(1)}분`}
                </div>
              </>
            )}
            isLoading={loading}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페이지 별 조회수</h2>
          </div>
          <HorizontalBarChart
            data={pageViews.map((d) => ({
              label: getPageLabel(d.page),
              value: d.totalViews,
              raw: d
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">최근 1일간</div>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {item.raw.page}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  조회수 {item.value.toLocaleString()}회
                </div>
              </>
            )}
            isLoading={loading}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">이탈률</h2>
          </div>
          <HorizontalBarChart
            data={bounceRates.map((item) => ({
              label: getPageLabel(item.page_path),
              value: item.bounce_rate,
              raw: item,
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-sm text-gray-500 mb-1">최근 7일간</div>
                <div className="text-sm font-semibold text-gray-600 mb-1">
                  {item.raw.page_path}
                </div>
                <div className="text-md font-bold text-gray-900">
                  이탈률 {item.value.toLocaleString()}%
                </div>
              </>
            )}
            isLoading={loading}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">조회수</h2>
          </div>
          <HorizontalLineChart
            data={Views.map((d) => ({
              date: d.date,
              value: d.totalViews
            }))}
            tooltipRenderer={(item) => (
              <div className="text-sm">
                <div className="text-gray-500">{item.date}</div>
                <div className="font-semibold text-blue-600">{item.value.toLocaleString()}건</div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}; 