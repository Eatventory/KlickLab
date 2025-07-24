import React, { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
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
import DateRangeSelector from '../ui/DateRangeSelector';

const DEFAULT_EVENTS = ['page_view', 'scroll', 'auto_click', 'user_engagement'];
const PERIOD_LABELS = { daily: '일', weekly: '주', monthly: '월' };
const COLORS = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];

export const ConversionDashboard: React.FC = () => {
  // DateRangeSelector 상태 추가
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

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

  // DateRange 관련 핸들러들
  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }[]) => {
    setDateRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  const handleTempRangeChange = (range: { startDate: Date; endDate: Date }[]) => {
    setTempRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  const handleDateRangeApply = (start: Date, end: Date) => {
    setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
    setShowPicker(false);
  };

  const handleShowPickerToggle = (val: boolean) => {
    setShowPicker(val);
  };

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
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* 날짜 선택기 */}
      <div className="w-full flex justify-end border-b-2 border-dashed mb-6">
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={handleDateRangeChange}
          setTempRange={handleTempRangeChange}
          setShowPicker={handleShowPickerToggle}
          onApply={handleDateRangeApply}
        />
      </div>

      <ConversionRateWidget />
      <ConversionSummaryCard />

      {/* 이벤트 트렌드 섹션 */}
      <div className="flex space-x-4 items-center">
        <h2 className="text-xl font-bold text-gray-900">이벤트별 전환율 추이</h2>
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'daily'|'weekly'|'monthly')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="daily">일별</option>
            <option value="weekly">주별</option>
            <option value="monthly">월별</option>
          </select>
        </div>
      </div>

      {/* Event/URL 탭 전환 */}
      <div className="flex">
        <button
          onClick={() => setAddMode('event')}
          className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
            addMode === 'event'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          이벤트별 분석
        </button>
        <button
          onClick={() => setAddMode('url')}
          className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
            addMode === 'url'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          URL별 분석
        </button>
      </div>

      {/* 이벤트 기반 컨텐츠 */}
      {addMode === 'event' && (
        <div className="space-y-6">
          {/* 이벤트 선택 영역 */}
          <ChartTableWrapper
            title="이벤트 선택"
            onAdd={() => fetchAllEvents()}
            addButtonText="이벤트 새로고침"
            loading={loading}
            error={error}
          >
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {allEvents.map((event) => (
                <label key={event} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEvents([...selectedEvents, event]);
                      } else {
                        setSelectedEvents(selectedEvents.filter(e => e !== event));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-700">{event}</span>
                </label>
              ))}
            </div>
          </ChartTableWrapper>

          {/* 이벤트 요약 정보 */}
          <ChartTableWrapper
            title="선택된 이벤트 요약"
            loading={loading}
            error={error}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이벤트</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">총 발생</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">유니크 사용자</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">평균 값</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.event_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.total_count?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.unique_users?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.avg_value?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartTableWrapper>

          {/* 이벤트 트렌드 차트 */}
          <ChartTableWrapper title={`이벤트별 트렌드 (${PERIOD_LABELS[period]}별)`} loading={loading} error={error}>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedEvents.map((event, index) => (
                    <Line
                      key={event}
                      type="monotone"
                      dataKey={event}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartTableWrapper>
        </div>
      )}

      {/* URL 기반 컨텐츠 */}
      {addMode === 'url' && (
        <div className="space-y-6">
          {/* URL 선택 영역 */}
          <ChartTableWrapper
            title="URL 선택"
            onAdd={() => fetchAllUrls()}
            addButtonText="URL 새로고침"
            loading={urlSummaryLoading}
            error={urlSummaryError}
          >
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {allUrls.slice(0, 20).map((url) => (
                <label key={url} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(url)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEvents([...selectedEvents, url]);
                      } else {
                        setSelectedEvents(selectedEvents.filter(e => e !== url));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-700">{url}</span>
                </label>
              ))}
            </div>
          </ChartTableWrapper>

          {/* URL 요약 정보 */}
          <ChartTableWrapper
            title="선택된 URL 요약"
            loading={urlSummaryLoading}
            error={urlSummaryError}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">총 페이지뷰</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">유니크 방문자</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">평균 체류시간</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {urlSummaryData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.url}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.total_views?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.unique_visitors?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.avg_duration?.toFixed(2) || '0.00'}초</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartTableWrapper>

          {/* URL 트렌드 차트 */}
          <ChartTableWrapper title={`URL별 페이지뷰 트렌드 (${PERIOD_LABELS[period]}별)`} loading={urlTrendLoading} error={urlTrendError}>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={urlTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedEvents.map((url, index) => (
                    <Line
                      key={url}
                      type="monotone"
                      dataKey={url}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartTableWrapper>
        </div>
      )}

      {/* Sankey 퍼널 섹션 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">사용자 전환 경로</h3>
          <div className="flex items-center space-x-4">
            {/* 드롭다운 타입 선택 */}
            <select
              value={dropdownType}
              onChange={(e) => {
                setDropdownType(e.target.value as 'event'|'url');
                setSelectedValue('');
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="event">이벤트 기준</option>
              <option value="url">URL 기준</option>
            </select>

            {/* 드롭다운 옵션 선택 */}
            <select
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">선택하세요</option>
              {(dropdownType === 'event' ? eventOptions : urlOptions).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <button
              onClick={fetchSankeyData}
              disabled={!selectedValue || sankeyLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sankeyLoading ? '로딩 중...' : '경로 조회'}
            </button>
          </div>
        </div>
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
            <ChannelConversionTable dateRange={dateRange[0]} />
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