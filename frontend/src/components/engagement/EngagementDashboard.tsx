import React, { useState, useEffect } from 'react';
// import { ExitPageChart } from './ExitPageChart';
// import { PageTimeChart } from './PageTimeChart';
// import { Clock, BarChart3, TrendingUp } from 'lucide-react';
// import { mockDashboardData } from '../../data/mockData';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import { getPageLabel } from '../../utils/getPageLabel';
import HorizontalBarChart from '../HorizontalBarChart';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartWrapper from '../ChartWrapper';

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

interface PageViewCountsData {
  page: string;
  totalViews: number;
}

interface BounceRatesData {
  page_path: string;
  total_views: string;
  total_exits: string;
  bounce_rate: number;
}

interface ViewCountsData {
  date: string;
  totalViews: number;
}

interface ClickCountsData {
  date: string;
  totalClicks: number;
}

interface AvgSessionSecsData {
  date: string;
  avgSessionSeconds: number;
}

interface SessionsPerUsersData {
  date: string;
  totalVisitors: number;
  totalClicks: number;
  sessionsPerUser: number;
}

interface UsersOverTimeData {
  date: string;
  dailyUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
}

export const EngagementDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    pageType: 'all',
    sessionLength: 'all'
  });

  const [pageTimes, setPageTimes] = useState<PageTimeData[]>([]);
  const [pageViewCounts, setPageViewCounts] = useState<PageViewCountsData[]>([]);
  const [bounceRates, setBounceRates] = useState<BounceRatesData[]>([]);
  const [viewCounts, setViewCounts] = useState<ViewCountsData[]>([]);
  const [clickCounts, setClickCounts] = useState<ClickCountsData[]>([]);
  const [avgSessionSecs, setAvgSessionSecs] = useState<AvgSessionSecsData[]>([]);
  const [sessionsPerUsers, setSessionsPerUsers] = useState<SessionsPerUsersData[]>([]);
  const [usersOverTime, setUsersOverTime] = useState<UsersOverTimeData[]>([]);

  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'viewCounts' | 'clickCounts'>('viewCounts');
  const [selectedMetric2, setSelectedMetric2] = useState<'avgSessionSecs' | 'sessionsPerUsers'>('avgSessionSecs');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      if (isFirstLoad) setLoading(true);
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

      const [resOverview, resPageTimes, resPageViewCounts, resBounceRates, resViewCounts, resClickCounts, resUOTime] = await Promise.all([
        fetch('/api/engagement/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-times?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-views?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/bounce-rate?limit=5', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/view-counts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/click-counts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/engagement/users-over-time', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!resOverview.ok) throw new Error('Engagement Overview 데이터를 불러오지 못했습니다.');
      if (!resPageTimes.ok) throw new Error('Page Times 데이터를 불러오지 못했습니다.');
      if (!resPageViewCounts.ok) throw new Error('Page Views 데이터를 불러오지 못했습니다.');
      if (!resBounceRates.ok) throw new Error('Bounce 데이터를 불러오지 못했습니다.');
      if (!resViewCounts.ok) throw new Error('View Counts 데이터를 불러오지 못했습니다.');
      if (!resClickCounts.ok) throw new Error('Click Counts 데이터를 불러오지 못했습니다.');
      if (!resUOTime.ok) throw new Error('Users Over Time 데이터를 불러오지 못했습니다.');

      const [dataOverview, dataPageTimes, dataPageViewCounts, dataBounceRates, dataViewCounts, dataClickCounts, dataUOTime] = await Promise.all([
        resOverview.json(),
        resPageTimes.json(),
        resPageViewCounts.json(),
        resBounceRates.json(),
        resViewCounts.json(),
        resClickCounts.json(),
        resUOTime.json()
      ]);

      setAvgSessionSecs(dataOverview.data.avgSessionSeconds);
      setSessionsPerUsers(dataOverview.data.sessionsPerUser);
      setPageTimes(dataPageTimes);
      setPageViewCounts(dataPageViewCounts);
      setBounceRates(dataBounceRates);
      setViewCounts(dataViewCounts);
      setClickCounts(dataClickCounts);
      setUsersOverTime(dataUOTime);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '알 수 없는 오류');
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 pt-0 col-span-2">
          <ChartWrapper
            metrics={[
              { key: 'avgSessionSecs', label: '평균 온라인 세션 참여 시간',
                value: avgSessionSecs.length
                  ? `${(avgSessionSecs.reduce((acc, d) => acc + d.avgSessionSeconds, 0) / avgSessionSecs.length).toFixed(1)}초`
                  : '-'
              },
              { key: 'sessionsPerUsers', label: '활성 사용자 당 세션 수',
                value: sessionsPerUsers.length
                  ? `${(sessionsPerUsers.reduce((acc, d) => acc + d.sessionsPerUser, 0) / sessionsPerUsers.length).toFixed(1)}`
                  : '-' 
              },
            ]}
            selectedKey={selectedMetric2}
            onSelect={(key) => setSelectedMetric2(key as 'avgSessionSecs' | 'sessionsPerUsers')}
          >
            <HorizontalLineChart
              data={(selectedMetric2 === 'avgSessionSecs' ? avgSessionSecs : sessionsPerUsers).map((d) => ({
                date: d.date,
                value: selectedMetric2 === 'avgSessionSecs' ? d.avgSessionSeconds : d.sessionsPerUser,
              }))}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">
                    {selectedMetric2 === 'avgSessionSecs' ? `${item.value.toFixed(1)}초` : item.value.toFixed(1)}
                  </div>
                </div>
              )}
            />
          </ChartWrapper>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페이지 평균 체류시간</h2>
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
            isLoading={isFirstLoad}
            valueFormatter={(val) => `${val.toFixed(1)}분`}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페이지 별 조회수</h2>
          </div>
          <HorizontalBarChart
            data={pageViewCounts.map((d) => ({
              label: getPageLabel(d.page),
              value: d.totalViews,
              raw: d
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">최근 7일간</div>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {item.raw.page}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  조회수 {item.value.toLocaleString()}회
                </div>
              </>
            )}
            isLoading={isFirstLoad}
            valueFormatter={(val) => val.toLocaleString() + '회'}
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
            isLoading={isFirstLoad}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 pt-0 col-span-2">
          <ChartWrapper
            metrics={[
              { key: 'viewCounts', label: '조회수', value: `${viewCounts.reduce((acc, d) => acc + d.totalViews, 0).toLocaleString()}` },
              { key: 'clickCounts', label: '클릭수', value: `${clickCounts.reduce((acc, d) => acc + d.totalClicks, 0).toLocaleString() || '-'}` },
            ]}
            selectedKey={selectedMetric}
            onSelect={(key) => setSelectedMetric(key as 'viewCounts' | 'clickCounts')}
          >
            <HorizontalLineChart
              data={(selectedMetric === 'viewCounts' ? viewCounts : clickCounts).map((d) => ({
                date: d.date,
                value: selectedMetric === 'viewCounts' ? d.totalViews : d.totalClicks,
              }))}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">
                    {item.value.toLocaleString()}건
                  </div>
                </div>
              )}
            />
          </ChartWrapper>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">시간 경과에 따른 사용자 활동</h2>
          </div>
          <HorizontalLineChart
            data={usersOverTime.map((d) => ({
              date: d.date,
              value: d.dailyUsers
            }))}
            tooltipRenderer={(item) => (
              <div className="text-sm">
                <div className="text-gray-500">{item.date}</div>
                <div className="font-semibold text-blue-600">{item.value.toLocaleString()}건</div>
              </div>
            )}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">TBD</h2>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">TBD</h2>
          </div>
        </div>

      </div>
    </div>
  );
}; 