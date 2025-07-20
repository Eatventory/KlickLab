import React, { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { SankeyFunnel } from './SankeyFunnel';
import { ChannelConversionTable } from '../traffic/ChannelConversionTable';
import { LandingConversionTable } from '../traffic/LandingConversionTable';
import ConversionPathsCard from '../ConversionPathsCard';
import ChartTableWrapper from '../ui/ChartTableWrapper';
import HorizontalLineChart from '../HorizontalLineChart';
import { mockSankeyPaths } from '../../data/mockData';
import { ConversionRateWidget } from './ConversionRateWidget';
import { ConversionSummaryCard } from '../ConversionSummaryCard';

const DEFAULT_EVENTS = ['page_view', 'scroll', 'auto_click', 'user_engagement'];
const PERIOD_LABELS = { daily: '일', weekly: '주', monthly: '월' };
const COLORS = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];

export const ConversionDashboard: React.FC = () => {
  const [allEvents, setAllEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [addMode, setAddMode] = useState<'event'|'url'>('event');

  // URL 목록 별도 상태로 관리
  const [allUrls, setAllUrls] = useState<string[]>([]);
  // URL별 summary 데이터 상태 추가
  const [urlSummaryData, setUrlSummaryData] = useState<any[]>([]);
  const [urlSummaryLoading, setUrlSummaryLoading] = useState(false);
  const [urlSummaryError, setUrlSummaryError] = useState<string|null>(null);

  // URL별 트렌드 데이터 상태 추가
  const [urlTrendData, setUrlTrendData] = useState<any[]>([]);
  const [urlTrendLoading, setUrlTrendLoading] = useState(false);
  const [urlTrendError, setUrlTrendError] = useState<string|null>(null);

  // Sankey 경로 데이터 상태 추가
  const [sankeyPaths, setSankeyPaths] = useState<string[][] | null>(null);
  const [sankeyLoading, setSankeyLoading] = useState(false);
  const [sankeyError, setSankeyError] = useState<string | null>(null);

  // Sankey 드롭다운 상태
  const [dropdownType, setDropdownType] = useState<'event'|'url'>('event');
  const [eventOptions, setEventOptions] = useState<string[]>([]);
  const [urlOptions, setUrlOptions] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');

  // 기간별 데이터 범위 설정 함수 추가
  const getPeriodRange = (period: 'daily'|'weekly'|'monthly') => {
    const today = new Date();
    let startDate: string;
    let endDate: string;
    endDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    if (period === 'daily') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30); // 31일치
      startDate = d.toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7 * 11); // 12주치
      startDate = d.toISOString().slice(0, 10);
    } else {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 11); // 12개월치
      startDate = d.toISOString().slice(0, 10);
    }
    return { startDate, endDate };
  };

  // 트렌드 데이터 불러오기 (이벤트/URL 모드 분기)
  useEffect(() => {
    if (!selectedEvents.length) return;
    const { startDate, endDate } = getPeriodRange(period);
    if (addMode === 'event') {
      setLoading(true);
      setError(null);
      const fetchTrend = async () => {
        try {
          const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
          const params = new URLSearchParams({ events: selectedEvents.join(','), period, start_date: startDate, end_date: endDate });
          const res = await fetch(`/api/overview/event-trend?${params}`, { headers: { Authorization: `Bearer ${token}` } });
          const json = await res.json();
          // 숫자 변환 보장
          const processedData = (json.data || []).map((row: any) => ({
            ...row,
            count: Number(row.count) || 0
          }));
          setTrendData(processedData);
        } catch (err) {
          setError('트렌드 데이터를 불러오지 못했습니다.');
        } finally {
          setLoading(false);
        }
      };
      fetchTrend();
    } else if (addMode === 'url') {
      setUrlTrendLoading(true);
      setUrlTrendError(null);
      const fetchUrlTrends = async () => {
        try {
          const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
          // 여러 URL별로 page_view 트렌드 데이터 fetch (날짜별로)
          const params = new URLSearchParams({ urls: selectedEvents.join(','), period, start_date: startDate, end_date: endDate });
          const res = await fetch(`/api/overview/pageview-trend?${params}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error('API 오류');
          const json = await res.json();
          // 숫자 변환 보장
          const processedData = (json.data || []).map((row: any) => ({
            ...row,
            pageViews: Number(row.pageViews) || 0
          }));
          setUrlTrendData(processedData);
        } catch (err) {
          setUrlTrendError('URL별 트렌드 데이터를 불러오지 못했습니다.');
          setUrlTrendData([]);
        } finally {
          setUrlTrendLoading(false);
        }
      };
      fetchUrlTrends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvents, period, addMode]);

  // 요약 데이터 불러오기
  useEffect(() => {
    setLoading(true);
    setError(null);
    const { startDate, endDate } = getPeriodRange(period);
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        const params = new URLSearchParams({ events: allEvents.join(','), start_date: startDate, end_date: endDate });
        const res = await fetch(`/api/overview/event-summary?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        // 숫자 변환 보장
        const processedData = (json.data || []).map((row: any) => ({
          ...row,
          count: Number(row.count) || 0,
          users: Number(row.users) || 0
        }));
        setSummaryData(processedData);
        // 이벤트 목록 동기화 (기존 allEvents + DEFAULT_EVENTS + summaryData 기반으로 중복 없이 합침)
        setAllEvents(Array.from(new Set([...allEvents, ...DEFAULT_EVENTS, ...(processedData.map((row: any) => row.event) || [])])));
      } catch (err) {
        setError('요약 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [period]);

  // URL 정규화 함수 (공백 제거, 중복 제거, 끝 슬래시 통일)
  const normalizeUrl = (url: string) => {
    let u = url.trim();
    if (u.length > 1 && u.endsWith('/')) u = u.slice(0, -1); // /로 끝나면 제거 (단, /만 남는 경우 제외)
    return u;
  };

  // URL 모드에서 summaryData를 동적으로 불러오는 함수
  const fetchUrlSummaryData = async (urls: string[]) => {
    console.log('[fetchUrlSummaryData 진입]', urls);
    // URL 정규화 및 중복 제거
    const normUrls = Array.from(new Set(urls.map(normalizeUrl)));
    if (!normUrls.length) {
      setUrlSummaryData([]);
      return;
    }
    setUrlSummaryLoading(true);
    setUrlSummaryError(null);
    const { startDate, endDate } = getPeriodRange(period);
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const params = new URLSearchParams({ urls: normUrls.join(","), start_date: startDate, end_date: endDate });
      // 진단용 로그: 요청 파라미터
      console.log('[pageview-summary 요청]', `/api/overview/pageview-summary?${params}`);
      const res = await fetch(`/api/overview/pageview-summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API 오류');
      const json = await res.json();
      // 진단용 로그: 응답 데이터
      console.log('[pageview-summary 응답]', json);
      // 숫자 변환 보장
      const processedData = (json.data || []).map((row: any) => ({
        ...row,
        pageViews: Number(row.pageViews) || 0,
        sessions: Number(row.sessions) || 0
      }));
      setUrlSummaryData(processedData);
    } catch (err) {
      setUrlSummaryError('URL별 데이터를 불러오지 못했습니다.');
      setUrlSummaryData([]);
    } finally {
      setUrlSummaryLoading(false);
    }
  };

  // urlSummaryData에 있는 URL을 allUrls에 자동 등록 (중복 없이, 값이 바뀔 때만 setState)
  useEffect(() => {
    if (!urlSummaryData || !Array.isArray(urlSummaryData)) return;
    const urls: string[] = urlSummaryData
      .map((row: any) => row.url)
      .filter((url: string | undefined) => typeof url === 'string' && url.startsWith('/'));
    if (urls.length > 0) {
      setAllUrls((prev: string[]) => {
        const merged = Array.from(new Set([...prev, ...urls]));
        if (merged.length !== prev.length || merged.some((u, i) => u !== prev[i])) {
          return merged;
        }
        return prev;
      });
    }
  }, [urlSummaryData]);

  // addMode가 url일 때만 summary fetch (allUrls 의존성 제거)
  useEffect(() => {
    console.log('[useEffect] addMode:', addMode, 'allUrls:', allUrls);
    if (addMode === 'url') {
      const urlEvents = allUrls.filter(ev => ev.startsWith('/'));
      console.log('[useEffect] urlEvents:', urlEvents);
      fetchUrlSummaryData(urlEvents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMode]);





  // Sankey 데이터 fetch (선택값 반영)
  useEffect(() => {
    function cleanPath(path: string[]): string[] {
      // 빈 값/공백 제거, 연속 중복 제거(선택)
      let arr = path.filter(p => typeof p === 'string' && p.trim() !== '');
      arr = arr.filter((p, i) => i === 0 || p !== arr[i - 1]);
      return arr;
    }
    const fetchSankeyPaths = async () => {
      setSankeyLoading(true);
      setSankeyError(null);
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        // event: event_path, url: url_path
        const pathField = dropdownType === 'url' ? 'url_path' : 'event_path';
        let query = `?type=${dropdownType}`;
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

  // 드롭다운 핸들러
  const handleDropdownTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDropdownType(e.target.value as 'event'|'url');
    setSelectedValue('');
  };
  const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(e.target.value);
  };

  return (
    <div className="space-y-8">
      {/* 전환율 요약 카드 3종 하단에 추가 */}
      {/* 시간 경과에 따른 이벤트 분석 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            시간 경과에 따른 {addMode === 'event' ? '이벤트 이름별' : 'URL별'} 이벤트 수
          </h2>
          <select
            value={addMode}
            onChange={e => setAddMode(e.target.value as 'event'|'url')}
            className="border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="event">이벤트</option>
            <option value="url">URL</option>
          </select>
        </div>

        <ChartTableWrapper
          data={(() => {
            if (addMode === 'event') {
              // 이벤트 모드: summaryData에서 숫자 변환 보장
              const map: Record<string, { eventCount: number; userCount: number; avgEventPerUser: number }> = {};
              summaryData
                .filter(({ event }) => event && event !== '')
                .forEach(({ event, count, users }) => {
                  if (!map[event]) {
                    map[event] = { eventCount: 0, userCount: 0, avgEventPerUser: 0 };
                  }
                  // 숫자 변환 보장
                  const eventCount = Number(count) || 0;
                  const userCount = Number(users) || 0;
                  map[event].eventCount += eventCount;
                  map[event].userCount += userCount;
                });
              
              return Object.entries(map).map(([event, { eventCount, userCount }]) => ({
                key: event,
                label: event,
                values: {
                  eventCount,
                  userCount,
                  avgEventPerUser: userCount > 0 ? Number((eventCount / userCount).toFixed(3)) : 0,
                },
              }));
            } else {
              // URL 모드: urlSummaryData에서 숫자 변환 보장
              const map: Record<string, { pageViews: number; sessions: number; avgPageViewsPerSession: number }> = {};
              urlSummaryData
                .filter(({ url }) => url && url !== '')
                .forEach(({ url, pageViews, sessions }) => {
                  if (!map[url]) {
                    map[url] = { pageViews: 0, sessions: 0, avgPageViewsPerSession: 0 };
                  }
                  // 숫자 변환 보장
                  const pageViewsNum = Number(pageViews) || 0;
                  const sessionsNum = Number(sessions) || 0;
                  map[url].pageViews += pageViewsNum;
                  map[url].sessions += sessionsNum;
                });
              
              return Object.entries(map).map(([url, { pageViews, sessions }]) => ({
                key: url,
                label: url,
                values: {
                  pageViews,
                  sessions,
                  avgPageViewsPerSession: sessions > 0 ? Number((pageViews / sessions).toFixed(3)) : 0,
                },
              }));
            }
          })()}
          valueKeys={addMode === 'event' 
            ? [
                { key: 'eventCount', label: '이벤트 수', showPercent: true },
                { key: 'userCount', label: '사용자 수', showPercent: true },
                { key: 'avgEventPerUser', label: '사용자당 이벤트 수' }
              ]
            : [
                { key: 'pageViews', label: '페이지뷰', showPercent: true },
                { key: 'sessions', label: '세션 수', showPercent: true },
                { key: 'avgPageViewsPerSession', label: '세션당 페이지뷰' }
              ]
          }
          autoSelectBy={addMode === 'event' ? 'eventCount' : 'pageViews'}
          title={addMode === 'event' ? '이벤트 이름' : 'URL'}
          onSortChange={(key) => {
            // 정렬 변경 시 처리
          }}
        >
          {(selectedKeys, chartData, lineDefs, unit) => (
            <HorizontalLineChart
              data={(() => {
                const sourceData = addMode === 'event' ? trendData : urlTrendData;
                if (!Array.isArray(sourceData) || sourceData.length === 0) {
                  return [];
                }
                
                const uniqueDates = [...new Set(sourceData.map(d => d.date))].sort();
                return uniqueDates.map(date => {
                  const row: Record<string, any> = { date };
                  let sum = 0;
                  
                  selectedKeys.forEach(key => {
                    if (key === 'SUM') return;
                    const match = sourceData.find(d => d.date === date && (addMode === 'event' ? d.event === key : d.url === key));
                    const val = match ? Number(addMode === 'event' ? match.count : match.pageViews) || 0 : 0;
                    row[key] = val;
                    sum += val;
                  });
                  
                  if (selectedKeys.includes('SUM')) {
                    row['SUM'] = sum;
                  }
                  return row;
                });
              })()}
              lines={[
                ...selectedKeys
                  .filter(k => k !== 'SUM')
                  .map(k => ({ key: k, name: k })),
                ...(selectedKeys.includes('SUM')
                  ? [{ key: 'SUM', name: '합계', color: '#2596be', dash: '3 3' }]
                  : []),
              ]}
              areas={
                selectedKeys.includes('SUM')
                  ? [{ key: 'SUM', name: '합계', color: '#2596be' }]
                  : []
              }
              height={400}
              unit={unit}
              showLegendBottom={true}
            />
          )}
        </ChartTableWrapper>
      </div>

      {/* 맨 아래, 사키 다이어그램 바깥쪽 div(사각형 칸) 완전히 삭제, 내부 칸만 남김 */}
      {/* 실제 데이터가 있다면 paths로, 없으면 mockSankeyPaths로 fallback */}
      {/* 사용자 경로 다이어그램 섹션 */}
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
        {/* 내부 카드/제목 완전히 삭제! 바로 그래프만 */}
        <UserPathSankeyChart data={{ paths: sankeyPaths && sankeyPaths.length > 0 ? sankeyPaths : mockSankeyPaths }} type={dropdownType} />
        {sankeyLoading && <div style={{ color: '#888', padding: 12 }}>경로 데이터를 불러오는 중...</div>}
        {sankeyError && <div style={{ color: 'red', padding: 12 }}>{sankeyError}</div>}
      </div>
      {/* 전환 경로 Top3, 채널별 전환율, 첫유입페이지 전환율 컴포넌트 하단에 추가 */}
      <div className="flex flex-row gap-3 mt-8 items-stretch h-[520px]">
        <div className="flex-1 min-w-0 h-[520px]">
          <ConversionPathsCard />
        </div>
        <div className="flex flex-row gap-3 h-[520px]" style={{ minWidth: 800 }}>
          <div className="h-[520px] flex-1">
            <ChannelConversionTable />
          </div>
          <div className="h-[520px] flex-1">
            <LandingConversionTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionDashboard; 