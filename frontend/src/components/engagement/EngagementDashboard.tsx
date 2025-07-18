import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';

import Collapse from '../ui/Collapse';
import DateRangeSelector from '../ui/DateRangeSelector';
import EngagementOverview from './EngagementOverview';
import type {
  PageTimeData,
  PageViewCountsData,
  BounceRatesData,
  ViewCountsData,
  ClickCountsData,
  AvgSessionSecsData,
  SessionsPerUsersData,
  UsersOverTimeData,
} from '../../data/engagementTypes';

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

  const [openCollapse, setOpenCollapse] = useState<string | null>('참여도 개요');

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
        title="참여도 개요"
        isOpen={openCollapse === '참여도 개요'}
        onToggle={() => setOpenCollapse(prev => prev === '참여도 개요' ? null : '참여도 개요')}
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
        title="TBD"
        isOpen={openCollapse === 'TBD'}
        onToggle={() =>
          setOpenCollapse((prev) => (prev === 'TBD' ? null : 'TBD'))
        }
      >
        <span>TBD</span>
      </Collapse>
    </>
  );
}; 