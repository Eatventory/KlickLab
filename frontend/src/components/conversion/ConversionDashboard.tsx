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

  // 트렌드 데이터 불러오기
  useEffect(() => {
    if (!selectedEvents.length) return;
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
  }, [selectedEvents, period]);

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
        // 이벤트 목록 동기화
        setAllEvents(Array.from(new Set([...DEFAULT_EVENTS, ...(json.data?.map((row: any) => row.event) || [])])));
      } catch (err) {
        setError('요약 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

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
      setCustomEvent('');
    }
  };

  // 실제 테이블(요약 데이터)에 존재하는 이벤트만 차트에 반영
  const tableEventNames = summaryData.map((row: any) => row.event);
  const chartEvents = selectedEvents.filter(ev => tableEventNames.includes(ev));

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
  // 평균 계산
  const summaryWithAvg = summaryData.map((row: any) => ({
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
            {ev}: {row[ev] ?? 0}
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

  // 커스텀 dot 렌더러 (강조 효과 없음)
  const renderCustomDot = (shape: string, color: string) => (props: any) => {
    const { cx, cy } = props;
    const size = 10;
    const stroke = '#fff';
    const strokeWidth = 2;
    if (shape === 'circle') {
      return <circle cx={cx} cy={cy} r={size / 2} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    if (shape === 'triangle') {
      const h = size;
      const points = `${cx},${cy - h / 2} ${cx + h / 2},${cy + h / 2} ${cx - h / 2},${cy + h / 2}`;
      return <polygon points={points} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    if (shape === 'diamond') {
      const d = size / 1.2;
      const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`;
      return <polygon points={points} fill={color} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    return <g />;
  };

  // 테이블 검색어 상태
  const [search, setSearch] = useState('');
  // 검색어로 필터링된 summary
  const filteredSummary = sortedSummary.filter(row => row.event.toLowerCase().includes(search.toLowerCase()));

  // 합계(전체) 행 만들기 (이벤트명: '합계', 나머지 값은 summaryData 전체 합산, 반드시 숫자 변환)
  const totalRow = summaryData.length ? {
    event: '합계',
    count: summaryData.reduce((sum, r) => sum + Number(r.count || 0), 0),
    users: summaryData.reduce((sum, r) => sum + Number(r.users || 0), 0),
    avg: summaryData.reduce((sum, r) => sum + Number(r.count || 0), 0) / (summaryData.reduce((sum, r) => sum + Number(r.users || 0), 0) || 1)
  } : null;

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
        {loading ? (
          <div>로딩 중...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : trendWithTotalLimited.length === 0 ? (
          <div className="text-gray-400 text-center py-12">데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={trendWithTotalLimited}
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
              {chartEvents.map((event, i) => (
                <Line
                  key={event}
                  type="monotone"
                  dataKey={event}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={showDot ? renderCustomDot(SHAPES[i % SHAPES.length], COLORS[i % COLORS.length]) : false}
                  name={event}
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
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
      {/* 하단: 이벤트별 요약 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-2 gap-2">
          <input
            type="text"
            value={customEvent}
            onChange={e => setCustomEvent(e.target.value)}
            placeholder="이벤트 이름 추가"
            className="border rounded-full px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-200"
            onKeyDown={e => { if (e.key === 'Enter') addCustomEvent(); }}
            style={{ minWidth: 120 }}
          />
          <button
            onClick={addCustomEvent}
            className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs shadow-sm hover:bg-blue-700 transition-colors duration-150"
            disabled={!customEvent.trim()}
          >추가</button>
          {/* 이벤트명 검색 */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이벤트명 검색"
            className="border rounded-full px-2 py-1 text-sm ml-4 shadow-sm focus:ring-2 focus:ring-blue-200"
            style={{ minWidth: 160 }}
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">이벤트별 요약</h2>
        {loading ? (
          <div>로딩 중...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('event')}>
                    이벤트 이름 {sortBy === 'event' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('count')}>
                    이벤트 수 {sortBy === 'count' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('users')}>
                    총 사용자 {sortBy === 'users' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('avg')}>
                    활성 사용자당 이벤트 수 {sortBy === 'avg' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2 px-3">차트</th>
                </tr>
              </thead>
              <tbody>
                {/* 합계(전체) 행 고정 */}
                {totalRow && (
                  <tr className="border-b border-gray-200 bg-blue-50 font-bold">
                    <td className="py-2 px-3">{totalRow.event}</td>
                    <td className="py-2 px-3 text-right">{totalRow.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{totalRow.users.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{totalRow.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">-</td>
                  </tr>
                )}
                {/* 검색/정렬된 이벤트 행 */}
                {filteredSummary.map((row: any, i: number) => (
                  <tr key={row.event} className="border-b border-gray-100 hover:bg-blue-50 group transition-colors duration-150">
                    <td className="py-2 px-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(row.event)}
                          onChange={() => toggleEvent(row.event)}
                          disabled={!selectedEvents.includes(row.event) && selectedEvents.length >= 5}
                          className="accent-blue-600"
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ width: 14, height: 14, borderRadius: 7, background: COLORS[i % COLORS.length], display: 'inline-block', marginRight: 2, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + COLORS[i % COLORS.length] }} />
                        <span
                          style={{ color: COLORS[i % COLORS.length], textDecoration: 'underline', fontWeight: 600, fontSize: 15 }}
                          className="group-hover:text-black transition-colors duration-150"
                        >{row.event}</span>
                      </label>
                    </td>
                    <td className="py-2 px-3 text-right">{row.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{row.users.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{row.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: COLORS[i % COLORS.length], marginRight: 4 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionDashboard; 