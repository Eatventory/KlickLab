import React, { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

const DEFAULT_EVENTS = ['page_view', 'scroll', 'auto_click', 'user_engagement'];
const PERIOD_LABELS = { daily: '일', weekly: '주', monthly: '월' };
const COLORS = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];

export const ConversionDashboard: React.FC = () => {
  const [allEvents, setAllEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [customEvent, setCustomEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [sortBy, setSortBy] = useState<'event'|'count'|'users'|'avg'>('count');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [showDot, setShowDot] = useState(false); // 차트 hover 상태
  // 모드 상태 추가
  const [addMode, setAddMode] = useState<'event'|'url'>('event');

  // URL 목록 별도 상태로 관리 (반드시 이 위치에 선언)
  const [allUrls, setAllUrls] = useState<string[]>([]);
  // URL별 summary 데이터 상태 추가
  const [urlSummaryData, setUrlSummaryData] = useState<any[]>([]);
  const [urlSummaryLoading, setUrlSummaryLoading] = useState(false);
  const [urlSummaryError, setUrlSummaryError] = useState<string|null>(null);

  // URL별 트렌드 데이터 상태 추가
  const [urlTrendData, setUrlTrendData] = useState<any[]>([]);
  const [urlTrendLoading, setUrlTrendLoading] = useState(false);
  const [urlTrendError, setUrlTrendError] = useState<string|null>(null);

  // 트렌드 데이터 불러오기 (이벤트/URL 모드 분기)
  useEffect(() => {
    if (!selectedEvents.length) return;
    if (addMode === 'event') {
      setLoading(true);
      setError(null);
      const fetchTrend = async () => {
        try {
          const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
          const params = new URLSearchParams({ events: selectedEvents.join(','), period });
          const res = await fetch(`/api/overview/event-trend?${params}`, { headers: { Authorization: `Bearer ${token}` } });
          const json = await res.json();
          setTrendData(json.data || []);
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
          const params = new URLSearchParams({ urls: selectedEvents.join(','), period });
          const res = await fetch(`/api/overview/pageview-trend?${params}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error('API 오류');
          const json = await res.json();
          setUrlTrendData(json.data || []);
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
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        const params = new URLSearchParams({ events: allEvents.join(',') });
        const res = await fetch(`/api/overview/event-summary?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setSummaryData(json.data || []);
        // 이벤트 목록 동기화 (기존 allEvents + DEFAULT_EVENTS + summaryData 기반으로 중복 없이 합침)
        setAllEvents(Array.from(new Set([...allEvents, ...DEFAULT_EVENTS, ...(json.data?.map((row: any) => row.event) || [])])));
      } catch (err) {
        setError('요약 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

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
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const params = new URLSearchParams({ urls: normUrls.join(",") });
      // 진단용 로그: 요청 파라미터
      console.log('[pageview-summary 요청]', `/api/overview/pageview-summary?${params}`);
      const res = await fetch(`/api/overview/pageview-summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API 오류');
      const json = await res.json();
      // 진단용 로그: 응답 데이터
      console.log('[pageview-summary 응답]', json);
      setUrlSummaryData(json.data || []);
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

  // 선택된(적용 전) 이벤트 상태 (체크박스용)
  const [checkedEvents, setCheckedEvents] = useState<string[]>(selectedEvents);

  // addMode가 변경될 때 selectedEvents/checkedEvents를 해당 모드에 맞게 자동 필터링 및 URL 모드일 때 상위 5개 자동 체크
  useEffect(() => {
    if (addMode === 'event') {
      setSelectedEvents(prev => prev.filter(ev => !ev.startsWith('/')));
      setCheckedEvents(prev => prev.filter(ev => !ev.startsWith('/')));
    } else {
      setSelectedEvents(prev => prev.filter(ev => ev.startsWith('/')));
      setCheckedEvents(prev => prev.filter(ev => ev.startsWith('/')));
      // URL 모드일 때 page_view 수 내림차순 정렬 후 상위 5개 자동 체크
      if (Array.isArray(urlSummaryData) && urlSummaryData.length > 0) {
        const sorted = [...urlSummaryData].sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0));
        const top5 = sorted.slice(0, 5).map(row => row.url);
        setCheckedEvents(top5);
      }
    }
  }, [addMode, urlSummaryData]);

  // checkedEvents가 바뀔 때마다 차트 자동 반영
  useEffect(() => {
    setSelectedEvents(checkedEvents);
  }, [checkedEvents]);

  // addMode가 변경될 때 상위 5개 자동 체크 및 차트 자동 반영 (이벤트/URL 모두)
  useEffect(() => {
    if (addMode === 'event') {
      setSelectedEvents(prev => prev.filter(ev => !ev.startsWith('/')));
      setCheckedEvents(prev => prev.filter(ev => !ev.startsWith('/')));
      // 이벤트 모드: summaryData 기준 이벤트 수 내림차순 상위 5개 자동 체크
      if (Array.isArray(summaryData) && summaryData.length > 0) {
        const sorted = [...summaryData].sort((a, b) => (b.count || 0) - (a.count || 0));
        const top5 = sorted.slice(0, 5).map(row => row.event);
        setCheckedEvents(top5);
      }
    } else {
      setSelectedEvents(prev => prev.filter(ev => ev.startsWith('/')));
      setCheckedEvents(prev => prev.filter(ev => ev.startsWith('/')));
      // URL 모드: page_view 수 내림차순 상위 5개 자동 체크
      if (Array.isArray(urlSummaryData) && urlSummaryData.length > 0) {
        const sorted = [...urlSummaryData].sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0));
        const top5 = sorted.slice(0, 5).map(row => row.url);
        setCheckedEvents(top5);
      }
    }
  }, [addMode, summaryData, urlSummaryData]);

  // URL 모드: urlTrendData를 여러 URL별로 합쳐서 차트에 그릴 수 있도록 변환
  const urlTrendChartData = React.useMemo(() => {
    if (addMode !== 'url' || !Array.isArray(urlTrendData) || urlTrendData.length === 0) return [];
    const urlKeys = selectedEvents.map(url => url.replace(/[^a-zA-Z0-9_]/g, '_'));
    const byDate: Record<string, any> = {};
    urlTrendData.forEach((row: any) => {
      const { date, url, pageViews } = row;
      if (!url || typeof url !== 'string') return;
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][url.replace(/[^a-zA-Z0-9_]/g, '_')] = Number(pageViews) || 0;
    });
    // 누락된 URL은 0으로 보간 + 합계(total) 필드 추가
    Object.values(byDate).forEach(row => {
      let total = 0;
      urlKeys.forEach(key => {
        if (!(key in row)) row[key] = 0;
        total += row[key];
      });
      row.total = total;
    });
    return Object.values(byDate).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  }, [urlTrendData, addMode, selectedEvents]);

  // 테이블에서 체크박스 선택(최대 5개)
  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      if (prev.includes(event)) return prev.filter((e) => e !== event);
      if (prev.length >= 5) return prev; // 5개까지만 허용
      return [...prev, event];
    });
  };

  // 커스텀 이벤트 추가 (테이블 상단)
  const addCustomEvent = () => {
    const e = customEvent.trim();
    if (e && !allEvents.includes(e)) {
      setAllEvents([...allEvents, e]);
      setCustomEvent("");
    }
  };
  // 커스텀 이벤트 삭제
  const deleteCustomEvent = (event: string) => {
    setAllEvents((prev) => prev.filter((e) => e !== event));
    setCheckedEvents((prev) => prev.filter((e) => e !== event));
    setSelectedEvents((prev) => prev.filter((e) => e !== event));
  };

  // 선택된 이벤트를 그대로 차트에 반영 (summaryData에 없어도 trendData에 있으면 표시)
  const chartEvents = selectedEvents;

  // 합계(total) 컬럼 추가 (차트에 표시되는 이벤트만 합산, row의 모든 key를 숫자형으로 변환)
  const trendWithTotal = trendData.map(row => {
    const newRow = { ...row };
    Object.keys(row).forEach(key => {
      if (key !== 'date') newRow[key] = Number(row[key]) || 0;
    });
    const total = chartEvents.reduce((sum, ev) => sum + (newRow[ev.replace(/[^a-zA-Z0-9_]/g, '_')] || 0), 0);
    return { ...newRow, total };
  });

  // 디버깅용 로그 추가
  // 모든 진단/확인용 console.log 로그 완전 제거

  // 진단용 로그 추가 (변수 선언 이후에만 실행)
  // trendWithTotal에서 최대 31일치만 최신순으로 잘라서 사용
  const trendWithTotalLimited = trendWithTotal.slice(-31);
  // summaryData와 allEvents를 합쳐서, 없는 이벤트명은 0건 row로 추가
  const mergedSummary = Array.from(new Set([...allEvents]))
    .map(ev => {
      const found = summaryData.find((row: any) => row.event === ev);
      return found || { event: ev, count: 0, users: 0, avg: 0 };
    });

  // 평균 계산
  const summaryWithAvg = mergedSummary.map((row: any) => ({
    ...row,
    avg: row.users ? (row.count / row.users) : 0
  }));

  // 정렬
  const sortedSummary = [...summaryWithAvg].sort((a, b) => {
    let v1 = a[sortBy], v2 = b[sortBy];
    if (sortBy === 'event') {
      v1 = String(v1).toLowerCase(); v2 = String(v2).toLowerCase();
      return sortOrder === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
    } else {
      return sortOrder === 'asc' ? v1 - v2 : v2 - v1;
    }
  });

  // 모든 차트 표시 이벤트의 최대값 계산 (합계 포함)
  const maxValue = Math.max(
    ...trendWithTotal.map(row => row.total),
    ...trendWithTotal.flatMap(row => chartEvents.map(ev => row[ev.replace(/[^a-zA-Z0-9_]/g, '_')] || 0))
  );

  // Y축 최대값 안전하게 계산 (최대값 * 1.1을 1만 단위로 올림)
  const allValues = [
    ...trendWithTotal.map(row => row.total),
    ...trendWithTotal.flatMap(row => chartEvents.map(ev => row[ev.replace(/[^a-zA-Z0-9_]/g, '_')] || 0))
  ].filter(v => typeof v === 'number' && isFinite(v) && v >= 0 && v < 1000000);
  const safeMax = allValues.length ? Math.max(...allValues) : 10000;
  const yMax = Math.ceil((safeMax * 1.1) / 10000) * 10000;

  // 툴팁 커스텀
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload; // 해당 row의 전체 데이터
    return (
      <div className="bg-white border border-gray-200 rounded shadow p-2 text-xs">
        <div className="font-semibold mb-1">{label}</div>
        <div style={{ color: '#6366f1', fontWeight: 600 }}>합계: {row.total ?? 0}</div>
        {chartEvents.map((ev, i) => (
          <div key={ev} style={{ color: COLORS[i % COLORS.length] }}>
            {ev}: {row[ev.replace(/[^a-zA-Z0-9_]/g, '_')] ?? 0}
          </div>
        ))}
      </div>
    );
  };

  // 정렬 토글
  const handleSort = (col: 'event'|'count'|'users'|'avg') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  // legend용: chartEvents와 색상 매핑
  const legendItems = chartEvents.map((ev, i) => ({
    event: ev,
    color: COLORS[i % COLORS.length],
    checked: selectedEvents.includes(ev)
  }));

  // 도형 종류 매핑 (legend와 동일하게)
  const SHAPES = ['circle', 'triangle', 'diamond'];

  // 커스텀 마커(dot) 렌더링 함수 (legend와 동일한 도형/색상)
  function renderCustomDot(shape: string, color: string) {
    return (props: any) => {
      const { cx, cy } = props;
      if (shape === 'circle') {
        return <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2} />;
      }
      if (shape === 'triangle') {
        const size = 14;
        return (
          <polygon
            points={`${cx},${cy - size / 2} ${cx - size / 2},${cy + size / 2} ${cx + size / 2},${cy + size / 2}`}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      }
      if (shape === 'diamond') {
        const size = 14;
        return (
          <polygon
            points={`${cx},${cy - size / 2} ${cx - size / 2},${cy} ${cx},${cy + size / 2} ${cx + size / 2},${cy}`}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      }
      // fallback
      return <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2} />;
    };
  }

  // 이벤트/전환수 공통 차트 렌더링 함수
  function renderUnifiedChart(data: any[], keys: string[]) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          onMouseMove={() => setShowDot(true)}
          onMouseLeave={() => setShowDot(false)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 13, fill: '#6b7280' }} />
          <YAxis
            allowDecimals={false}
            domain={[0, yMax]}
            tickFormatter={v => v >= 10000 ? `${(v/10000).toFixed(1)}만` : v}
            tick={{ fontSize: 13, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)', borderRadius: 8, border: '1px solid #e5e7eb' }} />
          {/* 합계(고정) - Area + 점선 Line */}
          <Area
            type="monotone"
            dataKey="total"
            fill="#e8edfa"
            stroke="none"
            name="합계"
            fillOpacity={0.25}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={3}
            dot={false}
            activeDot={false}
            name="합계"
            isAnimationActive={false}
            strokeDasharray="4 2"
          />
          {keys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key.replace(/[^a-zA-Z0-9_]/g, '_')}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={3}
              dot={false}
              activeDot={showDot ? renderCustomDot(SHAPES[i % SHAPES.length], COLORS[i % COLORS.length]) : false}
              name={key}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // 테이블 검색어 상태
  const [search, setSearch] = useState('');
  // 검색어로 필터링된 summary
  const filteredSummary = sortedSummary.filter(row => row.event.toLowerCase().includes(search.toLowerCase()));

  // 체크박스 토글
  const toggleCheckedEvent = (event: string) => {
    setCheckedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : prev.length >= 5 ? prev : [...prev, event]
    );
  };
  // 전체 선택/해제
  const allEventNames = filteredSummary.map((row: any) => row.event);
  const isAllChecked = allEventNames.every(ev => checkedEvents.includes(ev));
  const toggleAllChecked = () => {
    if (isAllChecked) setCheckedEvents([]);
    else setCheckedEvents(allEventNames.slice(0, 5));
  };
  // '선택 행 도표 만들기' 버튼 클릭 시 적용
  const applyCheckedEvents = () => {
    console.log('[도표 만들기] checkedEvents:', checkedEvents);
    setSelectedEvents(checkedEvents);
  };

  // 합계(전체) 행 만들기 (이벤트명: '합계', 나머지 값은 summaryData 전체 합산, 반드시 숫자 변환)
  const totalRow = summaryData.length ? {
    event: '합계',
    count: summaryData.reduce((sum, r) => sum + Number(r.count || 0), 0),
    users: summaryData.reduce((sum, r) => sum + Number(r.users || 0), 0),
    avg: summaryData.reduce((sum, r) => sum + Number(r.count || 0), 0) / (summaryData.reduce((sum, r) => sum + Number(r.users || 0), 0) || 1)
  } : null;

  // URL 모드: urlSummaryData와 allUrls(중 URL만) 합치기
  // URL 모드에서만 allUrls 사용
  const urlEvents: string[] = allUrls.filter((ev: string) => ev.startsWith('/'));
  const mergedUrlSummary = Array.from(new Set(allUrls.map(normalizeUrl)))
    .map(url => {
      const found = urlSummaryData.find((row: any) => normalizeUrl(row.url) === url);
      return found || { url, pageViews: 0, sessions: 0 };
    });

  // URL 모드 테이블 정렬 상태
  const [urlSortBy, setUrlSortBy] = useState<'url'|'pageViews'|'sessions'>('pageViews');
  const [urlSortOrder, setUrlSortOrder] = useState<'asc'|'desc'>('desc');
  // URL 모드 테이블 정렬 함수
  const handleUrlSort = (col: 'url'|'pageViews'|'sessions') => {
    if (urlSortBy === col) {
      setUrlSortOrder(urlSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setUrlSortBy(col);
      setUrlSortOrder('desc');
    }
  };
  // 정렬된 URL summary
  const sortedUrlSummary = [...mergedUrlSummary].sort((a, b) => {
    let v1 = a[urlSortBy] ?? 0, v2 = b[urlSortBy] ?? 0;
    if (urlSortBy === 'url') {
      v1 = String(v1).toLowerCase(); v2 = String(v2).toLowerCase();
      return urlSortOrder === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
    } else {
      return urlSortOrder === 'asc' ? v1 - v2 : v2 - v1;
    }
  });

  // URL 모드: 합계(전체) 행 계산 (이벤트 모드와 동일하게)
  const urlTotalRow = sortedUrlSummary.length ? {
    url: '합계',
    pageViews: sortedUrlSummary.reduce((sum, r) => sum + Number(r.pageViews || 0), 0),
    sessions: sortedUrlSummary.reduce((sum, r) => sum + Number(r.sessions || 0), 0)
  } : null;

  // 최초 마운트 시 page_view 이벤트가 기록된 URL만 allUrls에 등록
  useEffect(() => {
    const fetchPageViewUrls = async () => {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        const res = await fetch('/api/overview/pageview-urls', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const urls: string[] = json.data.filter((url: string) => typeof url === 'string' && url.startsWith('/'));
          if (urls.length > 0) {
            setAllUrls(urls);
          }
        }
      } catch (e) {
        // 무시
      }
    };
    fetchPageViewUrls();
  }, []);

  // 차트 렌더링 직전 진단 로그
  console.log('[차트 렌더링] addMode:', addMode, 'selectedEvents:', selectedEvents, 'urlTrendChartData:', urlTrendChartData);

  return (
    <div className="space-y-8">
      {/* 상단: GA 스타일 제목 */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-900">시간 경과에 따른 이벤트 이름별 이벤트 수</h2>
        <div className="flex items-center gap-2">
          {/* 기간 단위 선택 드롭다운 스타일 */}
          <div className="relative">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              className="border rounded-full px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 bg-white text-gray-900"
              style={{ minWidth: 64 }}
            >
              <option value="daily">일</option>
              <option value="weekly">주</option>
              <option value="monthly">월</option>
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* 차트 렌더링 분기 (이벤트/URL 모드) */}
        {addMode === 'event'
          ? renderUnifiedChart(trendWithTotalLimited, chartEvents)
          : renderUnifiedChart(urlTrendChartData.slice(-31), selectedEvents)
        }
        {/* GA 스타일 legend (차트 아래로 완전히 이동, 여백 추가) */}
        <div className="flex flex-wrap items-center gap-3 mt-6 justify-center">
          {/* 합계(고정) */}
          <div className="flex items-center gap-1 select-none">
            <span style={{ width: 16, height: 16, borderRadius: 8, background: '#e0e7ff', border: '2px solid #6366f1', display: 'inline-block', marginRight: 2 }} />
            <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 15 }}>합계</span>
          </div>
          {/* 이벤트별 (도형/색상 다르게) */}
          {legendItems.map((item, idx) => (
            <div key={item.event} className="flex items-center gap-1 select-none">
              <span style={{ width: 16, height: 16, display: 'inline-block', marginRight: 2 }}>
                {idx % 3 === 0 && <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill={item.color} /></svg>}
                {idx % 3 === 1 && <svg width="16" height="16"><polygon points="8,3 14,14 2,14" fill={item.color} /></svg>}
                {idx % 3 === 2 && <svg width="16" height="16"><polygon points="8,2 14,8 8,14 2,8" fill={item.color} /></svg>}
              </span>
              <span style={{ color: item.color, fontWeight: 600, textDecoration: 'underline', fontSize: 15 }}>{item.event}</span>
            </div>
          ))}
        </div>
      </div>
      {/* 하단: 이벤트별 요약 테이블 (GA 스타일로 리디자인) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-2 gap-2">
          {/* 모드 드롭다운 */}
          <select
            value={addMode}
            onChange={e => setAddMode(e.target.value as 'event'|'url')}
            className="border rounded-full px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 bg-white text-gray-900"
            style={{ minWidth: 90 }}
          >
            <option value="event">이벤트</option>
            <option value="url">전환수(URL)</option>
          </select>
          {/* 추가 input */}
          <input
            type="text"
            value={customEvent}
            onChange={e => setCustomEvent(e.target.value)}
            placeholder={addMode === 'event' ? '이벤트 이름 추가' : '예: /checkout/success'}
            className="border rounded-full px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-200"
            onKeyDown={e => { if (e.key === 'Enter') addCustomEvent(); }}
            style={{ minWidth: 120 }}
          />
          <button
            onClick={addCustomEvent}
            className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs shadow-sm hover:bg-blue-700 transition-colors duration-150"
            disabled={
              !customEvent.trim() ||
              (addMode === 'event' && (allEvents.includes(customEvent.trim()) || summaryData.some((row: any) => row.event === customEvent.trim()))) ||
              (addMode === 'url' && (!customEvent.trim().startsWith('/') || allEvents.includes(customEvent.trim()) || summaryData.some((row: any) => row.event === customEvent.trim())))
            }
          >
            추가
          </button>
          {/* 검색창 */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이벤트명/URL 검색"
            className="border rounded-full px-2 py-1 text-sm ml-4 shadow-sm focus:ring-2 focus:ring-blue-200"
            style={{ minWidth: 160 }}
          />
          {/* 선택 행 도표 만들기 버튼 */}
          <button
            className={`ml-2 px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold shadow-sm transition-colors duration-150 ${checkedEvents.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            onClick={applyCheckedEvents}
            disabled={checkedEvents.length === 0}
          >
            선택 행 도표 만들기
          </button>
        </div>
        {/* 테이블/차트 분기 렌더링 개선(모드별) */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {addMode === 'event' ? '이벤트별 요약' : 'URL별(page_view) 요약'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            {/* 테이블 헤더: 정렬 기능 항상 노출 (URL별과 동일하게) */}
            {addMode === 'event' ? (
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-2 px-3 text-left w-10">
                  {/* 전체 선택 체크박스 */}
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleAllChecked}
                    className="accent-blue-600"
                  />
                </th>
                <th className="py-2 px-3 text-left cursor-pointer select-none" onClick={() => handleSort('event')}>
                  이벤트 이름 {sortBy === 'event' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-2 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('count')}>
                  이벤트 수 {sortBy === 'count' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-2 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('users')}>
                  총 사용자 {sortBy === 'users' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-2 px-3 text-right cursor-pointer select-none" onClick={() => handleSort('avg')}>
                  활성 사용자당 이벤트 수 {sortBy === 'avg' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            ) : (
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-2 px-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleAllChecked}
                    className="accent-blue-600"
                  />
                </th>
                <th className="py-2 px-3 text-left cursor-pointer select-none" onClick={() => handleUrlSort('url')}>
                  URL {urlSortBy === 'url' && (urlSortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-2 px-3 text-right cursor-pointer select-none" onClick={() => handleUrlSort('pageViews')}>
                  page_view 수 {urlSortBy === 'pageViews' && (urlSortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-2 px-3 text-right cursor-pointer select-none" onClick={() => handleUrlSort('sessions')}>
                  세션 수 {urlSortBy === 'sessions' && (urlSortOrder === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            )}
            <tbody>
              {addMode === 'event'
                ? <>
                    {/* 데이터 행 먼저 렌더링 */}
                    {filteredSummary.map((row: any, i: number) => {
                      // 퍼센트 계산
                      const countPct = totalRow ? (row.count / totalRow.count * 100) : 0;
                      const usersPct = totalRow ? (row.users / totalRow.users * 100) : 0;
                      // 커스텀 이벤트 여부
                      const isCustom = allEvents.includes(row.event) && !summaryData.some((r: any) => r.event === row.event);
                      return (
                        <tr key={row.event} className="border-b border-gray-100 hover:bg-blue-50 group transition-colors duration-150">
                          <td className="py-2 px-3 text-center">
                            {/* 체크박스 */}
                            <input
                              type="checkbox"
                              checked={checkedEvents.includes(row.event)}
                              onChange={() => toggleCheckedEvent(row.event)}
                              className="accent-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3 flex items-center gap-2">
                            {row.event}
                            {/* 커스텀 이벤트에만 X(삭제) 버튼 노출 */}
                            {isCustom && (
                              <button
                                onClick={() => deleteCustomEvent(row.event)}
                                className="ml-1 px-1 text-xs text-gray-400 hover:text-red-500 rounded transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                                title="이 이벤트 삭제"
                                aria-label="이벤트 삭제"
                                tabIndex={0}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {row.count.toLocaleString()} <span className="text-xs text-gray-400">({countPct.toFixed(1)}%)</span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {row.users.toLocaleString()} <span className="text-xs text-gray-400">({usersPct.toFixed(1)}%)</span>
                          </td>
                          <td className="py-2 px-3 text-right">{row.avg.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {/* 합계(전체) 행은 항상 마지막에 렌더링 */}
                    {totalRow && (
                      <tr className="border-b border-gray-200 bg-blue-50 font-bold sticky bottom-0 z-10">
                        <td className="py-2 px-3 text-center">
                          {/* 합계 체크박스 */}
                          <input
                            type="checkbox"
                            checked={checkedEvents.includes('합계')}
                            onChange={() => toggleCheckedEvent('합계')}
                            className="accent-blue-600"
                          />
                        </td>
                        <td className="py-2 px-3">합계</td>
                        <td className="py-2 px-3 text-right">{totalRow.count.toLocaleString()} <span className="text-xs text-gray-400">(100%)</span></td>
                        <td className="py-2 px-3 text-right">{totalRow.users.toLocaleString()} <span className="text-xs text-gray-400">(100%)</span></td>
                        <td className="py-2 px-3 text-right">{totalRow.avg.toFixed(2)}</td>
                      </tr>
                    )}
                  </>
                : (
                    <>
                      {/* 합계(전체) 행 고정 (전환수 모드) */}
                      {urlTotalRow && (
                        <tr className="border-b border-gray-200 bg-blue-50 font-bold sticky bottom-0 z-10">
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={checkedEvents.includes('합계')}
                              onChange={() => toggleCheckedEvent('합계')}
                              className="accent-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3">합계</td>
                          <td className="py-2 px-3 text-right">{urlTotalRow.pageViews.toLocaleString()} <span className="text-xs text-gray-400">(100%)</span></td>
                          <td className="py-2 px-3 text-right">{urlTotalRow.sessions.toLocaleString()} <span className="text-xs text-gray-400">(100%)</span></td>
                        </tr>
                      )}
                      {/* 데이터 행 */}
                      {sortedUrlSummary.map((row: any, i: number) => {
                        const pageViewPct = urlTotalRow ? (row.pageViews / urlTotalRow.pageViews * 100) : 0;
                        const sessionPct = urlTotalRow ? (row.sessions / urlTotalRow.sessions * 100) : 0;
                        // 커스텀 URL 여부 (삭제 버튼 노출)
                        const isCustom = allUrls.includes(row.url) && !urlSummaryData.some((r: any) => r.url === row.url);
                        return (
                          <tr key={row.url} className="border-b border-gray-100 hover:bg-blue-50 group transition-colors duration-150">
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={checkedEvents.includes(row.url)}
                                onChange={() => toggleCheckedEvent(row.url)}
                                className="accent-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3 flex items-center gap-2">
                              {row.url}
                              {isCustom && (
                                <button
                                  onClick={() => deleteCustomEvent(row.url)}
                                  className="ml-1 px-1 text-xs text-gray-400 hover:text-red-500 rounded transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                                  title="이 URL 삭제"
                                  aria-label="URL 삭제"
                                  tabIndex={0}
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {row.pageViews.toLocaleString()} <span className="text-xs text-gray-400">({pageViewPct.toFixed(1)}%)</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {row.sessions.toLocaleString()} <span className="text-xs text-gray-400">({sessionPct.toFixed(1)}%)</span>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )
                }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConversionDashboard; 