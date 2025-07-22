import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';

import Collapse from '../ui/Collapse';
import DateRangeSelector from '../ui/DateRangeSelector';
import EngagementOverview from './EngagementOverview';
import EngagementEvents from './EngagementEvents';

import EngagementPages from './EngagementPages';
import EngagementVisits from './EngagementVisits';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { mockSankeyPaths } from '../../data/mockData';

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

  RevisitData,
  EventCountsData,
  PageStatsData,
  VisitStatsData,
} from '../../data/engagementTypes';

const engagementTaps: string[] = ['참여도 개요', '이벤트 보고서', '페이지 및 화면 보고서', '방문 페이지 보고서', '퍼널 분석'];

export const EngagementDashboard: React.FC = () => {
  const [pageTimes, setPageTimes] = useState<PageTimeData[]>([]);
  const [pageViewCounts, setPageViewCounts] = useState<PageViewCountsData[]>([]);
  const [bounceRates, setBounceRates] = useState<BounceRatesData[]>([]);
  const [viewCounts, setViewCounts] = useState<ViewCountsData[]>([]);
  const [clickCounts, setClickCounts] = useState<ClickCountsData[]>([]);
  const [avgSessionSecs, setAvgSessionSecs] = useState<AvgSessionSecsData[]>([]);
  const [sessionsPerUsers, setSessionsPerUsers] = useState<SessionsPerUsersData[]>([]);
  const [usersOverTime, setUsersOverTime] = useState<UsersOverTimeData[]>([]);

  const [revisit, setRevisit] = useState<RevisitData[]>([]);

  const [eventCounts, setEventCounts] = useState<EventCountsData[]>([]);
  const [pageStats, setPageStats] = useState<PageStatsData[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStatsData[]>([]);

  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'viewCounts' | 'clickCounts'>('viewCounts');
  const [selectedMetric2, setSelectedMetric2] = useState<'avgSessionSecs' | 'sessionsPerUsers'>('avgSessionSecs');


  const [openCollapse, setOpenCollapse] = useState<string>(engagementTaps[0]);
  const [fetchedTabs, setFetchedTabs] = useState<{ [key: string]: boolean }>({});
  const [fetchCache, setFetchCache] = useState<{[tab: string]: { start: string; end: string }}>({});

  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);


  const fetchTabData = async (
    tab: string,
    start: Date,
    end: Date,
    force = false // 강제 fetch 여부
  ) => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (!token) return;

    const startStr = dayjs(start).format('YYYY-MM-DD');
    const endStr = dayjs(end).format('YYYY-MM-DD');
    if (!force && fetchCache[tab]?.start === startStr && fetchCache[tab]?.end === endStr) {
      console.log(`[SKIP] ${tab} - 캐시 hit`);
      return;
    }

    const query = `startDate=${startStr}&endDate=${endStr}`;
    try {
      setLoading(true);
      switch (tab) {
        case engagementTaps[0]: {
          const [resOverview, resPageTimes, resPageViewCounts, resBounceRates,resViewCounts, resClickCounts, resUOTime, resRevisit] = await Promise.all([
            fetch(`/api/engagement/overview?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/page-times?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/page-views?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/bounce-rate?${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/view-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/click-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/users-over-time?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/engagement/revisit?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const [dataOverview, dataPageTimes, dataPageViewCounts, dataBounceRates, dataViewCounts, dataClickCounts, dataUOTime, dataRevisit] = await Promise.all([
            resOverview.json(), resPageTimes.json(), resPageViewCounts.json(), resBounceRates.json(),
            resViewCounts.json(), resClickCounts.json(), resUOTime.json(), resRevisit.json(),
          ]);
          setAvgSessionSecs(dataOverview.data.avgSessionSeconds);
          setSessionsPerUsers(dataOverview.data.sessionsPerUser);
          setPageTimes(dataPageTimes);
          setPageViewCounts(dataPageViewCounts);
          setBounceRates(dataBounceRates);
          setViewCounts(dataViewCounts);
          setClickCounts(dataClickCounts);
          setUsersOverTime(dataUOTime);
          setRevisit(dataRevisit);
          break;
        }
        case engagementTaps[1]: {
          const res = await fetch(`/api/engagement/event-counts?${query}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          setEventCounts(data);
          break;
        }
        case engagementTaps[2]: {
          const res = await fetch(`/api/engagement/page-stats?${query}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          setPageStats(data);
          break;
        }
        case engagementTaps[3]: {
          const res = await fetch(`/api/engagement/visit-stats?${query}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          setVisitStats(data);
          break;
        }
      }

      setFetchCache((prev) => ({
        ...prev,
        [tab]: { start: startStr, end: endStr },
      }));
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

    if (!startDate || !endDate || !openCollapse) return;
    if (!fetchedTabs[openCollapse]) {
      fetchTabData(openCollapse, startDate, endDate);
      setFetchedTabs((prev) => ({ ...prev, [openCollapse]: true }));
    }
    const interval = setInterval(() => {
      const now = new Date();
      const minute = now.getMinutes();
      if (minute % 10 === 0) { // 매 10분마다 fetch 실행
        fetchTabData(openCollapse, startDate, endDate);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [openCollapse, dateRange]);

  // 퍼널 분석(사용자 경로 다이어그램) 상태 및 로직 추가
  const [sankeyPaths, setSankeyPaths] = useState<string[][] | null>(null);
  const [sankeyLoading, setSankeyLoading] = useState(false);
  const [sankeyError, setSankeyError] = useState<string | null>(null);
  const [dropdownType, setDropdownType] = useState<'event'|'url'>('event');

  useEffect(() => {
    function cleanPath(path: string[]): string[] {
      let arr = path.filter(p => typeof p === 'string' && p.trim() !== '');
      arr = arr.filter((p, i) => i === 0 || p !== arr[i - 1]);
      return arr;
    }
    const fetchSankeyPaths = async () => {
      setSankeyLoading(true);
      setSankeyError(null);
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        const pathField = dropdownType === 'url' ? 'url_path' : 'event_path';
        
        // 날짜 파라미터 추가
        let query = `?type=${dropdownType}`;
        if (dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate) {
          const startStr = dayjs(dateRange[0].startDate).format('YYYY-MM-DD');
          const endStr = dayjs(dateRange[0].endDate).format('YYYY-MM-DD');
          query += `&startDate=${startStr}&endDate=${endStr}`;
        }
        
        const res = await fetch(`/api/stats/sankey-paths${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('API 오류');
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const paths = json.data
            .map((row: any) => Array.isArray(row[pathField]) ? cleanPath(row[pathField]) : null)
            .filter((p: string[] | null) => Array.isArray(p) && p.length > 1);
          setSankeyPaths(paths.length > 0 ? paths : null);
        } else {
          setSankeyPaths(null);
        }
      } catch (err) {
        setSankeyError('경로 데이터를 불러오지 못했습니다.');
        setSankeyPaths(null);
      } finally {
        setSankeyLoading(false);
      }
    };
    fetchSankeyPaths();
  }, [dropdownType]);

  const handleDropdownTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDropdownType(e.target.value as 'event'|'url');
  };

  return (
    <>
      <div className='w-full flex justify-end border-b-2 border-dashed'>
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={setDateRange}
          setTempRange={setTempRange}
          setShowPicker={setShowPicker}
          onApply={(start, end) => {
            setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);

            fetchTabData(openCollapse, start, end, true);
          }}
        />
      </div>

      <Collapse
        title={engagementTaps[0]}
        isOpen={openCollapse === engagementTaps[0]}

        onToggle={() => setOpenCollapse(prev => prev === engagementTaps[0] ? '' : engagementTaps[0])}
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

          revisit={revisit}
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

          setOpenCollapse((prev) => (prev === engagementTaps[1] ? '' : engagementTaps[1]))
        }
      >
        <EngagementEvents eventCounts={eventCounts} />
      </Collapse>

      <Collapse
        title={engagementTaps[2]}
        isOpen={openCollapse === engagementTaps[2]}
        onToggle={() =>

          setOpenCollapse((prev) => (prev === engagementTaps[2] ? '' : engagementTaps[2]))
        }
      >
        <EngagementPages pageStats={pageStats} />
      </Collapse>

      <Collapse
        title={engagementTaps[3]}
        isOpen={openCollapse === engagementTaps[3]}
        onToggle={() =>

          setOpenCollapse((prev) => (prev === engagementTaps[3] ? '' : engagementTaps[3]))
        }
      >
        <EngagementVisits visitStats={visitStats} />
      </Collapse>

      {/* 퍼널 분석 하위탭 추가 */}
      <Collapse
        title={engagementTaps[4]}
        isOpen={openCollapse === engagementTaps[4]}
        onToggle={() =>
          setOpenCollapse((prev) => (prev === engagementTaps[4] ? '' : engagementTaps[4]))
        }
      >
        {/* 전환율 탭의 사용자 경로 다이어그램 전체(드롭다운, 백엔드 연동 포함) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sankey-container" style={{height: '100%', minHeight: 600, maxHeight: '90vh'}}>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontWeight: 700, fontSize: 20 }}>사용자 경로 다이어그램</h2>
            <select
              value={dropdownType}
              onChange={handleDropdownTypeChange}
              className="border rounded px-2 py-1 text-sm bg-white"
              style={{ minWidth: 120 }}
            >
              <option value="event">이벤트</option>
              <option value="url">URL</option>
            </select>
          </div>
          <UserPathSankeyChart data={{ paths: sankeyPaths }} type={dropdownType} />
          {sankeyLoading && <div style={{ color: '#888', padding: 12 }}>경로 데이터를 불러오는 중...</div>}
          {sankeyError && <div style={{ color: 'red', padding: 12 }}>{sankeyError}</div>}
        </div>
      </Collapse>
    </>
  );
}; 