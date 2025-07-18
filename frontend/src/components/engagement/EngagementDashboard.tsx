import React, { useState, useEffect, useRef } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import HorizontalBarChart from '../HorizontalBarChart';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartWrapper from '../ui/ChartWrapper';
import Collapse from '../ui/Collapse';
import DateRangeSelector from '../ui/DateRangeSelector';

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

  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  const fetchData = async (start: Date, end: Date) => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      if (isFirstLoad) setLoading(true);
      setError(null);

      const startStr = dayjs(start).format('YYYY-MM-DD');
      const endStr = dayjs(end).format('YYYY-MM-DD');
      const query = `startDate=${startStr}&endDate=${endStr}`;

      const [resOverview, resPageTimes, resPageViewCounts, resBounceRates, resViewCounts, resClickCounts, resUOTime] = await Promise.all([
        fetch(`/api/engagement/overview?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-times?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-views?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/bounce-rate?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/view-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/click-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/users-over-time?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
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
    const { startDate, endDate } = dateRange[0];
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
    const interval = setInterval(fetchData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

  const getRangeLabel = () => {
    const { startDate, endDate } = dateRange[0];
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const today = dayjs();
  
    const diffDays = end.diff(start, 'day');
  
    const isToday = start.isSame(today, 'day') && end.isSame(today, 'day');
    const isYesterday = start.isSame(today.subtract(1, 'day'), 'day') && end.isSame(start, 'day');
  
    const startOfThisWeek = today.startOf('week');
    const endOfThisWeek = today.endOf('week');
  
    const startOfLastWeek = today.subtract(1, 'week').startOf('week');
    const endOfLastWeek = today.subtract(1, 'week').endOf('week');
  
    const startOfThisMonth = today.startOf('month');
    const endOfThisMonth = today.endOf('month');
  
    const startOfLastMonth = today.subtract(1, 'month').startOf('month');
    const endOfLastMonth = today.subtract(1, 'month').endOf('month');
  
    if (isToday) return '오늘';
    if (isYesterday) return '어제';
    if (start.isSame(startOfThisWeek, 'day') && end.isSame(endOfThisWeek, 'day')) return '이번 주';
    if (start.isSame(startOfLastWeek, 'day') && end.isSame(endOfLastWeek, 'day')) return '지난 주';
    if (start.isSame(startOfThisMonth, 'day') && end.isSame(endOfThisMonth, 'day')) return '이번 달';
    if (start.isSame(startOfLastMonth, 'day') && end.isSame(endOfLastMonth, 'day')) return '지난 달';
    if (diffDays >= 1) return `최근 ${diffDays + 1}일간`;
  
    return `${start.format('YYYY.MM.DD')} ~ ${end.format('YYYY.MM.DD')}`;
  };

  const engagementOverview = (
    <div id="engagementOverview" className="space-y-8">
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
                [selectedMetric2]: selectedMetric2 === 'avgSessionSecs' ? d.avgSessionSeconds : d.sessionsPerUser,
              }))}
              lines={[
                {
                  key: selectedMetric2,
                  name: selectedMetric2 === 'avgSessionSecs' ? '평균 세션 시간' : '세션/유저',
                }
              ]}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">
                    {selectedMetric2 === 'avgSessionSecs'
                      ? `${item[selectedMetric2].toFixed(1)}초`
                      : item[selectedMetric2].toFixed(1)}
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
              label: d.page,
              value: d.averageTime,
              raw: d,
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">{getRangeLabel()}</div>
                <div className="text-xs font-semibold uppercase text-gray-600 mb-1">
                  {item.label}
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
              label: d.page,
              value: d.totalViews,
              raw: d
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">{getRangeLabel()}</div>
                <div className="text-xs font-semibold uppercase text-gray-600 mb-1">
                  {item.label}
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
              label: item.page_path,
              value: item.bounce_rate,
              raw: item,
            }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-sm text-gray-500 mb-1">{getRangeLabel()}</div>
                <div className="text-sm font-semibold uppercase text-gray-600 mb-1">
                  {item.label}
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
              data={(() => {
                const isView = selectedMetric === 'viewCounts';
                const arr = isView ? viewCounts : clickCounts;
                return arr.map((d) => ({
                  date: d.date,
                  [selectedMetric]: isView ? d.totalViews : d.totalClicks,
                }));
              })()}
              lines={[{ key: selectedMetric, name: selectedMetric === 'viewCounts' ? '조회수' : '클릭수' }]}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">
                    {item[selectedMetric].toLocaleString()}건
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
              dailyUsers: d.dailyUsers,
              weeklyUsers: d.weeklyUsers,
              monthlyUsers: d.monthlyUsers,
            }))}
            lines={[
              { key: 'monthlyUsers', name: '30일' },
              { key: 'weeklyUsers', name: '7일' },
              { key: 'dailyUsers', name: '1일' },
            ]}
            showLegend={true}
            tooltipRenderer={(item) => (
              <div className="text-sm space-y-1 min-w-[120px]">
                <div className="text-gray-500">{item.date}</div>
                <div className="flex items-center">
                  <span className="w-2 h-0.5 bg-[#3b82f6]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-white mr-1" />
                  <span className="text-xs text-gray-700">30일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.monthlyUsers.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-0.5 bg-[#22c55e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-white mr-1" />
                  <span className="text-xs text-gray-700">7일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.weeklyUsers.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-0.5 bg-[#f97316]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] border border-white mr-1" />
                  <span className="text-xs text-gray-700">1일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.dailyUsers.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            legendTooltipRenderer={(item, key) => (
              <div>
                <div className="text-gray-500 text-xs">{item.date}</div>
                <div className="text-xs text-gray-700">{key === "monthlyUsers" ? "30일" : key === "weeklyUsers" ? "7일" : "1일"}</div>
                <div className="font-bold text-gray-900">
                  {typeof item[key] === 'number' ? item[key].toLocaleString() : '-'}
                </div>
              </div>
            )}
          />
        </div>

        {/* <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">TBD</h2>
          </div>
        </div> */}

      </div>
    </div>
  );

  return (
    <>
      <div className="w-full flex justify-end border-b-2 border-dashed">
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={setDateRange}
          setTempRange={setTempRange}
          setShowPicker={setShowPicker}
          onApply={(start, end) => fetchData(start, end)}
        />
      </div>

      <Collapse title="참여도 개요" isShown={true}>
        {engagementOverview}
      </Collapse>

      <Collapse title="TBD">
        <span>TBD</span>
      </Collapse>
    </>
  );
}; 