import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';

import Collapse from '../ui/Collapse';
import DateRangeSelector from '../ui/DateRangeSelector';
import EngagementOverview from './EngagementOverview';
import EngagementEvents from './EngagementEvents';
import EngagementPages from './EngagementPages';
import EngagementVisits from './EngagementVisits';

// import { eventCounts } from '../../data/engagementMock';
// import { pageStats } from '../../data/engagementMock';
// import { visitStats } from '../../data/engagementMock';

import type {
  PageTimeData,
  PageViewCountsData,
  BounceRatesData,
  ViewCountsData,
  ClickCountsData,
  AvgSessionSecsData,
  SessionsPerUsersData,
  UsersOverTimeData,
  EventCountsData,
  PageStatsData,
  VisitStatsData,
} from '../../data/engagementTypes';

const engagementTaps: string[] = ["참여도 개요", "이벤트 보고서", "페이지 및 화면 보고서", "방문 페이지 보고서"];

export const EngagementDashboard: React.FC = () => {
  const [pageTimes, setPageTimes] = useState<PageTimeData[]>([]);
  const [pageViewCounts, setPageViewCounts] = useState<PageViewCountsData[]>([]);
  const [bounceRates, setBounceRates] = useState<BounceRatesData[]>([]);
  const [viewCounts, setViewCounts] = useState<ViewCountsData[]>([]);
  const [clickCounts, setClickCounts] = useState<ClickCountsData[]>([]);
  const [avgSessionSecs, setAvgSessionSecs] = useState<AvgSessionSecsData[]>([]);
  const [sessionsPerUsers, setSessionsPerUsers] = useState<SessionsPerUsersData[]>([]);
  const [usersOverTime, setUsersOverTime] = useState<UsersOverTimeData[]>([]);
  const [eventCounts, setEventCounts] = useState<EventCountsData[]>([]);
  const [pageStats, setPageStats] = useState<PageStatsData[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStatsData[]>([]);

  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'viewCounts' | 'clickCounts'>('viewCounts');
  const [selectedMetric2, setSelectedMetric2] = useState<'avgSessionSecs' | 'sessionsPerUsers'>('avgSessionSecs');

  const [openCollapse, setOpenCollapse] = useState<string | null>(engagementTaps[0]);

  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }
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

      const [resOverview, resPageTimes, resPageViewCounts, resBounceRates, resViewCounts, resClickCounts, resUOTime, resEventCounts, resPageStats, resVisitStats] = await Promise.all([
        fetch(`/api/engagement/overview?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-times?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-views?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/bounce-rate?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/view-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/click-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/users-over-time?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/event-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/page-stats?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/engagement/visit-stats?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!resOverview.ok) throw new Error('Engagement Overview 데이터를 불러오지 못했습니다.');
      if (!resPageTimes.ok) throw new Error('Page Times 데이터를 불러오지 못했습니다.');
      if (!resPageViewCounts.ok) throw new Error('Page Views 데이터를 불러오지 못했습니다.');
      if (!resBounceRates.ok) throw new Error('Bounce 데이터를 불러오지 못했습니다.');
      if (!resViewCounts.ok) throw new Error('View Counts 데이터를 불러오지 못했습니다.');
      if (!resClickCounts.ok) throw new Error('Click Counts 데이터를 불러오지 못했습니다.');
      if (!resUOTime.ok) throw new Error('Users Over Time 데이터를 불러오지 못했습니다.');
      if (!resEventCounts.ok) throw new Error('Event Counts 데이터를 불러오지 못했습니다.');
      if (!resPageStats.ok) throw new Error('Page Stats 데이터를 불러오지 못했습니다.');
      if (!resVisitStats.ok) throw new Error('Visit Stats 데이터를 불러오지 못했습니다.');

      const [dataOverview, dataPageTimes, dataPageViewCounts, dataBounceRates, dataViewCounts, dataClickCounts, dataUOTime, dataEventCounts, dataPageStats, dataVisitStats] = await Promise.all([
        resOverview.json(),
        resPageTimes.json(),
        resPageViewCounts.json(),
        resBounceRates.json(),
        resViewCounts.json(),
        resClickCounts.json(),
        resUOTime.json(),
        resEventCounts.json(),
        resPageStats.json(),
        resVisitStats.json(),
      ]);

      setAvgSessionSecs(dataOverview.data.avgSessionSeconds);
      setSessionsPerUsers(dataOverview.data.sessionsPerUser);
      setPageTimes(dataPageTimes);
      setPageViewCounts(dataPageViewCounts);
      setBounceRates(dataBounceRates);
      setViewCounts(dataViewCounts);
      setClickCounts(dataClickCounts);
      setUsersOverTime(dataUOTime);
      setEventCounts(dataEventCounts);
      setPageStats(dataPageStats);
      setVisitStats(dataVisitStats);
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

    const interval = setInterval(() => {
      const { startDate, endDate } = dateRange[0];
      if (startDate && endDate) {
        fetchData(startDate, endDate);
      }
    }, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

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
          onApply={(start, end) => {
            setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
            fetchData(start, end);
          }}
        />
      </div>

      <Collapse
        title={engagementTaps[0]}
        isOpen={openCollapse === engagementTaps[0]}
        onToggle={() => setOpenCollapse(prev => prev === engagementTaps[0] ? null : engagementTaps[0])}
      >
        <EngagementOverview
          avgSessionSecs={avgSessionSecs}
          sessionsPerUsers={sessionsPerUsers}
          pageTimes={pageTimes}
          pageViewCounts={pageViewCounts}
          bounceRates={bounceRates}
          viewCounts={viewCounts}
          clickCounts={clickCounts}
          usersOverTime={usersOverTime}
          selectedMetric={selectedMetric}
          selectedMetric2={selectedMetric2}
          setSelectedMetric={setSelectedMetric}
          setSelectedMetric2={setSelectedMetric2}
          isFirstLoad={isFirstLoad}
          dateRange={dateRange}
      />
      </Collapse>

      <Collapse
        title={engagementTaps[1]}
        isOpen={openCollapse === engagementTaps[1]}
        onToggle={() =>
          setOpenCollapse((prev) => (prev === engagementTaps[1] ? null : engagementTaps[1]))
        }
      >
        <EngagementEvents eventCounts={eventCounts} />
      </Collapse>

      <Collapse
        title={engagementTaps[2]}
        isOpen={openCollapse === engagementTaps[2]}
        onToggle={() =>
          setOpenCollapse((prev) => (prev === engagementTaps[2] ? null : engagementTaps[2]))
        }
      >
        <EngagementPages pageStats={pageStats} />
      </Collapse>

      <Collapse
        title={engagementTaps[3]}
        isOpen={openCollapse === engagementTaps[3]}
        onToggle={() =>
          setOpenCollapse((prev) => (prev === engagementTaps[3] ? null : engagementTaps[3]))
        }
      >
        <EngagementVisits visitStats={visitStats} />
      </Collapse>
    </>
  );
}; 