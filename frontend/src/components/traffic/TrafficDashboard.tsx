import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { VisitorChart } from './VisitorChart';
import { TopPageFromMainPage } from './TopPageFromMainPage';
import { ChannelConversionTable } from './ChannelConversionTable';
import { LandingConversionTable } from './LandingConversionTable';
import { TrendingUp, Globe, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import PathExplorer from './PathExplorer';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import DateRangeSelector from '../ui/DateRangeSelector';

// 타입 정의
interface FilterOptions {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  gender: 'all' | 'male' | 'female';
  ageGroup: 'all' | '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
}

interface TrafficData {
  visitorTrend: any[];
  mainPageNavigation: any[];
  filters: {
    period: string;
    gender: string;
    ageGroup: string;
  };
  hourlyTraffic?: { hour: string; visitors: number }[];
  entryPageDistribution?: { entry: string; visitors: number }[];
}

// mock 데이터 정의
const mockDashboardData = {
  visitorTrend: [
    { date: '2024-07-01', visitors: 120, newVisitors: 80, returningVisitors: 40 },
    { date: '2024-07-02', visitors: 150, newVisitors: 100, returningVisitors: 50 },
    { date: '2024-07-03', visitors: 180, newVisitors: 120, returningVisitors: 60 },
    { date: '2024-07-04', visitors: 200, newVisitors: 140, returningVisitors: 60 },
    { date: '2024-07-05', visitors: 170, newVisitors: 110, returningVisitors: 60 },
    { date: '2024-07-06', visitors: 160, newVisitors: 100, returningVisitors: 60 },
    { date: '2024-07-07', visitors: 190, newVisitors: 130, returningVisitors: 60 },
  ],
  mainPageNavigation: [
    { id: '1', name: '상품 목록 페이지', page: '/products', clicks: 1247, uniqueClicks: 892, clickRate: 85.2, avgTimeToClick: 3.2, rank: 1 },
    { id: '2', name: '장바구니 페이지', page: '/cart', clicks: 892, uniqueClicks: 743, clickRate: 72.1, avgTimeToClick: 4.8, rank: 2 },
    { id: '3', name: '상품 상세 페이지', page: '/product-detail', clicks: 743, uniqueClicks: 456, clickRate: 68.7, avgTimeToClick: 6.5, rank: 3 },
  ],
  hourlyTraffic: Array.from({ length: 24 }, (_, i) => ({ hour: i.toString().padStart(2, '0'), visitors: Math.floor(Math.random() * 50) + 10 })),
  entryPageDistribution: [
    { entry: 'products', visitors: 400 },
    { entry: 'cart', visitors: 200 },
    { entry: 'search', visitors: 150 },
    { entry: 'login', visitors: 100 },
    { entry: 'register', visitors: 80 },
    { entry: 'mypage', visitors: 60 },
    { entry: 'support', visitors: 40 },
    { entry: 'events', visitors: 30 },
    { entry: 'notice', visitors: 20 },
    { entry: 'main', visitors: 10 },
  ]
};

// 유입 채널 분포 목업 데이터
const mockChannelPieData = [
  { source: 'naver', visitors: 280 },
  { source: 'google', visitors: 420 },
  { source: 'instagram', visitors: 130 },
  { source: 'kakao', visitors: 70 },
  { source: '(없음)', visitors: 100 }
];

// 시간대별 유입 분포 데이터 보정 (KST 변환)
// function fillHourlyTrafficKST(raw: { hour: string, visitors: number }[]) {
//   // UTC hour(문자열) → KST hour(문자열)
//   const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
//   const map = new Map(raw.map(item => [item.hour, item.visitors]));
//   return hours.map(hour => {
//     // UTC → KST 변환 (UTC+9)
//     const kstHour = (parseInt(hour, 10) + 9) % 24;
//     return {
//       hour: kstHour.toString().padStart(2, '0'),
//       visitors: map.get(hour) || 0
//     };
//   }).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
// }

// y축 숫자 단위 한글 변환 함수
function formatKoreanNumber(value: number) {
  if (value >= 100000000) return `${Math.round(value / 10000000) / 10}억`;
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만`;
  return value.toLocaleString();
}

export const TrafficDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  
  // DateRangeSelector 상태 추가
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    period: 'daily',
    gender: 'all',
    ageGroup: 'all',
  });

  const [trafficData, setTrafficData] = useState<TrafficData | null>(mockDashboardData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // 필터 변경 시 즉시 API 재호출
    setLoading(true);
  };

  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        if (!token) throw new Error("No token");
        
        // 전역 필터 조건을 URL 파라미터로 변환
        const globalFilterParams = new URLSearchParams();
        if (globalFilter.conditions) {
          Object.entries(globalFilter.conditions).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              globalFilterParams.append(key, String(value));
            }
          });
        }
        
        const globalFilterString = globalFilterParams.toString();
        const globalFilterQuery = globalFilterString ? `&${globalFilterString}` : '';
        
        const queryParams = new URLSearchParams({
          period: filters.period,
          gender: filters.gender,
          ageGroup: filters.ageGroup
        });

        const response = await fetch(`/api/traffic?${queryParams}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } });
        const result: TrafficData = await response.json();
        setTrafficData(result);
      } catch (error) {
        console.error('Failed to fetch traffic data:', error);
        setTrafficData(null); // mock 데이터 fallback 제거
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficData();

    // 30초마다 데이터 갱신
    const interval = setInterval(fetchTrafficData, 30000);
    return () => clearInterval(interval);
  }, [filters, JSON.stringify(globalFilter.conditions)]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  // 서버 데이터가 없을 때 처리
  if (!trafficData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">트래픽 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }

  // 각 차트 데이터: 실제 데이터가 없으면 mock 데이터 사용
  const chartVisitorTrendData = trafficData?.visitorTrend && trafficData.visitorTrend.length > 0
    ? trafficData.visitorTrend
    : mockDashboardData.visitorTrend;
  const entryPageData = trafficData?.entryPageDistribution && trafficData.entryPageDistribution.length > 0
    ? trafficData.entryPageDistribution
    : mockDashboardData.entryPageDistribution;
  const hourlyTrafficData = trafficData?.hourlyTraffic && trafficData.hourlyTraffic.length > 0
    ? trafficData.hourlyTraffic
    : mockDashboardData.hourlyTraffic;

  return (
    <div className="space-y-8 bg-gray-50 min-h-screen p-6">
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

      {/* 필터 컨트롤 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">기간:</span>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="hourly">시간별</option>
              <option value="daily">일별</option>
              <option value="weekly">주별</option>
              <option value="monthly">월별</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">성별:</span>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">연령대:</span>
            <select
              value={filters.ageGroup}
              onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">전체</option>
              <option value="10s">10대</option>
              <option value="20s">20대</option>
              <option value="30s">30대</option>
              <option value="40s">40대</option>
              <option value="50s">50대</option>
              <option value="60s+">60세 이상</option>
            </select>
          </label>
        </div>
      </div>

      {/* 방문자 수 트렌드 차트 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">방문자 수 트렌드</h2>
        </div>
        <VisitorChart data={chartVisitorTrendData} period={filters.period} />
      </div>

      {/* 채널별 전환율 + 첫 유입페이지 전환율 테이블 */}
      <div className="flex flex-col lg:flex-row gap-6">
        <ChannelConversionTable dateRange={dateRange[0]} />
        <LandingConversionTable />
      </div>

      {/* 향후 구현 예정 컴포넌트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 유입 채널 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">유입 채널 분포</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={mockChannelPieData}
                dataKey="visitors"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ source }) => source || '/'}
              >
                {mockChannelPieData.map((source, idx) => (
                  <Cell key={`cell-${idx}`} fill={["#3b82f6", "#10b981", "#f59e42", "#ef4444", "#8b5cf6", "#6366f1", "#fbbf24", "#f472b6", "#34d399", "#a3e635"][idx % 10]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${formatKoreanNumber(value as number)}명`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 시간대별 유입 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">시간대별 유입 분포</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyTrafficData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="hour" tickFormatter={h => `${h}시`} />
              <YAxis tickFormatter={formatKoreanNumber} />
              <Tooltip formatter={(value: number) => `${formatKoreanNumber(value as number)}명`} />
              <Bar dataKey="visitors" fill="#3b82f6" name="방문자 수" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 메인 페이지에서 이동하는 페이지 Top */}
      <TopPageFromMainPage
        data={trafficData?.mainPageNavigation}
        period={filters.period}
        gender={filters.gender}
        ageGroup={filters.ageGroup}
      />


      {/* 방문 경로 탐색 Sankey */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-5 text-gray-600">
            {/* 아이콘은 취향에 따라 (Lucide 'Share2' 등) */}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">방문 경로 탐색</h3>
        </div>
        <PathExplorer />
      </div>

    </div>
  );
}; 