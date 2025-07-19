
import { forwardRef } from 'react';
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StatCard } from './StatCard';
import { VisitorChart } from '../traffic/VisitorChart';
import { TopClicks } from './TopClicks';
import { BarChart, Globe, Users, MousePointer, Clock, TrendingDown, PieChart } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import { mockSankeyPaths } from '../../data/mockData';
import dayjs from 'dayjs';

// 위젯의 기본 프레임을 위한 컴포넌트
const WidgetFrame = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-gray-500" />}
      <h2 className="text-base md:text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="flex-grow">{children}</div>
  </div>
);

// 간단한 목록 표시를 위한 컴포넌트 (예: 상위 페이지)
const SimpleTable = ({ data, columns }: { data: Record<string, any>[]; columns: { key: string; label: string }[] }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 font-semibold text-sm text-gray-500">
      <span>{columns[0].label}</span>
      <span className="text-right">{columns[1].label}</span>
    </div>
    {data.map((item, index) => (
      <div key={index} className="grid grid-cols-2 text-sm text-gray-700 border-t pt-2">
        <span>{item[columns[0].key]}</span>
        <span className="text-right font-medium">{item[columns[1].key].toLocaleString()}</span>
      </div>
    ))}
  </div>
);

// Google Analytics 스타일의 개요 대시보드
export const OverviewDashboard = forwardRef<any, {}>((props, ref) => {
  // --- Mock Data ---
  const visitorsData = { today: 1650 };
  const sessionsData = { today: 2130 };
  const bounceRateData = { today: 45.2 };
  const avgSessionDuration = { today: 185 }; // seconds

  // --- 트렌드 선그래프 mock 데이터 (VisitorData 타입) ---
  const visitorTrendData = Array.from({ length: 7 }, (_, i) => {
    const visitors = 3000 + Math.round(Math.sin(i / 2) * 500 + Math.random() * 300);
    const newVisitors = Math.round(visitors * (0.6 + Math.random() * 0.2));
    const returningVisitors = visitors - newVisitors;
    const date = (() => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    })();
    return { date, visitors, newVisitors, returningVisitors };
  });

  const topPagesData = [
    { page: '/home', views: 4820 },
    { page: '/products/electronics', views: 2190 },
    { page: '/pricing', views: 1870 },
    { page: '/about-us', views: 980 },
    { page: '/contact', views: 450 },
  ];
  
  const trafficSourceData = [
    { source: '직접 유입', users: 750 },
    { source: 'Google', users: 520 },
    { source: 'Naver', users: 210 },
    { source: '소셜 미디어', users: 170 },
  ];

  // --- GA 스타일 KPI 목데이터 ---
  const kpiData = [
    {
      title: "활성 사용자",
      value: 23000,
      change: 14.1,
      changeType: "increase",
      icon: "Users",
      color: "blue"
    },
    {
      title: "평균 세션 시간",
      value: 154, // 초 단위
      change: 0,
      changeType: "neutral",
      icon: "Clock",
      color: "green"
    },
    {
      title: "세션 주요 이벤트 비율",
      value: 13.7,
      change: 0,
      changeType: "neutral",
      icon: "PieChart",
      color: "purple"
    },
    {
      title: "참여 세션수",
      value: 9600,
      change: 26.3,
      changeType: "increase",
      icon: "BarChart",
      color: "red"
    }
  ];

  // 초를 '분 초'로 변환
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  // --- 실시간 사용자 mock 데이터 ---
  const realtimeUserCount = 59;
  const realtimeUserTrend = Array.from({ length: 30 }, (_, i) => ({
    minute: i + 1,
    users: Math.floor(20 + Math.random() * 20 + Math.sin(i / 5) * 10)
  }));
  const realtimeSourceData = [
    { source: '(direct)', users: 6 },
    { source: 'google', users: 2 },
    { source: '(not set)', users: 1 }
  ];

  return (
    <div className="bg-gray-50 p-4 sm:p-8">
      {/* GA 스타일 상단 2분할 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* 왼쪽: KPI + 선그래프 */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-8 flex flex-col justify-between overflow-hidden">
          {/* KPI 카드 4개 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {kpiData.map((kpi, idx) => (
              <StatCard
                key={kpi.title}
                data={{
                  ...kpi,
                  value:
                    kpi.title === "평균 세션 시간"
                      ? formatDuration(kpi.value)
                      : kpi.title === "세션 주요 이벤트 비율"
                      ? `${kpi.value}%`
                      : kpi.value,
                  changeType: kpi.changeType as 'increase' | 'decrease' | 'neutral'
                }}
              />
            ))}
          </div>
          {/* 선그래프 (트렌드) */}
          <div className="w-full" style={{ height: 280, marginBottom: 8 }}>
            <VisitorChart data={visitorTrendData} period="daily" />
          </div>
        </div>
        {/* 오른쪽: 실시간 사용자 + 막대그래프 */}
        <div className="bg-white rounded-lg shadow p-8 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="text-base font-semibold text-gray-700 mb-1">지난 30분 동안의 활성 사용자</div>
            <div className="text-3xl font-extrabold text-blue-700 mb-4">{realtimeUserCount}</div>
            {/* 분당 활성 사용자 막대그래프 (recharts BarChart 예시) */}
            <div className="h-28 mb-6 overflow-hidden">
              <div className="flex items-end h-full gap-0.5">
                {realtimeUserTrend.map((d, i) => (
                  <div key={i} style={{ height: `${d.users * 2}px` }} className="w-1 bg-blue-400 rounded-t" />
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right mb-4">분당 활성 사용자</div>
          </div>
          {/* 유입경로별 막대그래프 */}
          <div className="mt-8">
            {realtimeSourceData.map((src, i) => (
              <div key={src.source} className="flex items-center mb-2">
                <span className="w-16 text-xs text-gray-600">{src.source}</span>
                <div className="flex-1 mx-2 h-2 bg-blue-100 rounded">
                  <div style={{ width: `${src.users * 15}%` }} className="h-2 bg-blue-500 rounded" />
                </div>
                <span className="text-xs text-gray-700 font-semibold">{src.users}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* (이전 메인 사용자 트렌드 차트는 상단 2분할로 이동했으므로 삭제) */}

      {/* 3. 하단 위젯 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* 왼쪽: 트래픽 소스 */}
        <div className="lg:col-span-1">
          <WidgetFrame title="소스 / 매체별 사용자" icon={PieChart}>
            <SimpleTable data={trafficSourceData} columns={[{key: 'source', label: '소스'}, {key: 'users', label: '사용자'}]} />
             {/* 여기에 파이 차트를 추가할 수 있습니다. */}
          </WidgetFrame>
        </div>

        {/* 중앙: 상위 활성 페이지 */}
        <div className="lg:col-span-1">
          <WidgetFrame title="가장 많이 본 페이지" icon={Globe}>
            <SimpleTable data={topPagesData} columns={[{key: 'page', label: '페이지 경로'}, {key: 'views', label: '조회수'}]} />
          </WidgetFrame>
        </div>
        
        {/* 오른쪽: TopClicks (기존 컴포넌트 재사용) */}
        <div className="lg:col-span-1">
            <WidgetFrame title="가장 많이 클릭된 요소" icon={MousePointer}>
                <TopClicks refreshKey={0} />
            </WidgetFrame>
        </div>
      </div>
    </div>
  );
});
// 타입 정의
export type OverviewDashboardProps = {
  onLastUpdated?: (d: Date) => void;
};

// forwardRef 타입 파라미터 제거, 함수 인자에 타입 명시, 반환 타입 as ... 추가
export const OverviewDashboard = React.forwardRef(
  (props: OverviewDashboardProps, ref: React.Ref<any>) => {
    const { filter: globalFilter } = useSegmentFilter();
    const [visitorsData, setVisitorsData] = useState<VisitorsData | null>(null);
    const [clicksData, setClicksData] = useState<ClicksData | null>(null);
    const [userPathData, setUserPathData] = useState<any[]>([]);
    const [visitorTrendData, setvisitorTrendData] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const mapPathData = (paths: any[]): PathData[] =>
      paths
        .filter(p => p.from !== p.to)
        .map(p => ({
          from: getPageLabel(p.from),
          to: getPageLabel(p.to),
          value: Number(p.value),
      }));

    const fetchStats = async () => {
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
        const globalFilterQuery = globalFilterString ? `?${globalFilterString}` : '';
        
        const [visitorsResponse, clicksResponse, userPathResponse, visitorTrendResponse] = await Promise.all([
          fetch(`/api/stats/visitors${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }}),
          fetch(`/api/stats/clicks${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }}),
          fetch(`/api/stats/userpath-summary${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }}),
          fetch(`/api/traffic/daily-visitors${globalFilterQuery}`, {headers: { Authorization: `Bearer ${token}` }})
        ]);
        const visitors = await visitorsResponse.json();
        const clicks = await clicksResponse.json();
        const userPath = await userPathResponse.json();
        const visitorTrend = await visitorTrendResponse.json();
        visitors.trend?.sort((a: { date: string }, b: { date: string }) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setVisitorsData(visitors);
        setClicksData(clicks);
        setUserPathData(mapPathData(userPath.data || []));
        setvisitorTrendData(visitorTrend.data || []);
        const now = new Date();
        setLastUpdated(now);
        props.onLastUpdated?.(now);
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setVisitorsData({ today: 1234, yesterday: 1096 });
        setClicksData({ today: 9874, yesterday: 9124 });
        setUserPathData([]);
        const now = new Date();
        setLastUpdated(now);
        props.onLastUpdated?.(now);
        setRefreshKey(prev => prev + 1);
      }
    };

    useImperativeHandle(ref, () => ({
      fetchStats,
      lastUpdated,
    }));

    useEffect(() => {
      fetchStats();
    }, [JSON.stringify(globalFilter.conditions)]); // 전역 필터 변경 시 실행

    // 30초마다 자동 새로고침
    useEffect(() => {
      const interval = setInterval(() => {
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }, [JSON.stringify(globalFilter.conditions)]); // 전역 필터 변경 시에도 interval 재설정

    if (visitorsData === null || clicksData === null) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      );
    }

    const visitorsChange = visitorsData ? calculateChange(visitorsData.today, visitorsData.yesterday) : 0;
    const clicksChange = clicksData ? calculateChange(clicksData.today, clicksData.yesterday) : 0;

    // Sankey용 mock 데이터 fallback
    // const sankeyData = userPathData && Array.isArray(userPathData) && userPathData.length > 0
    //   ? { paths: userPathData }
    //   : { paths: mockSankeyPaths };

    return (
      <div className="space-y-6">
        <div className="mb-2">
          <Summary />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            data={{
              title: "일일 방문자 수",
              value: visitorsData?.today || 0,
              change: visitorsChange,
              changeType: getChangeType(visitorsChange),
              icon: "Users",
              color: "blue"
            }}
          />
          <StatCard
            data={{
              title: "일일 총 클릭 수",
              value: clicksData?.today || 0,
              change: clicksChange,
              changeType: getChangeType(clicksChange),
              icon: "MousePointer",
              color: "green"
            }}
          />
          <AverageSessionDurationCard />
          <ConversionSummaryCard />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">일간 활성 이용자 수</h2>
          </div>
          <VisitorChart data={visitorTrendData} period='daily' />
        </div>
        <div className="w-full">
          <ClickTrend />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <TopClicks />
          </div>
          {/* <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <DropoffInsightsCard />
          </div> */}
        </div>
        {/* 전환 경로 Top 3 카드 단독 행 */}
        <div>
          <ConversionPathsCard />
        </div>
      </div>
    );

    function calculateChange(today: number, yesterday: number): number {
      if (yesterday === 0) {
        if (today === 0) return 0;
        return 100; // 또는: return Infinity, return null 등 UI 표현 목적에 따라
      }
      return Math.round(((today - yesterday) / yesterday) * 100 * 10) / 10;
    }
    function getChangeType(change: number): 'increase' | 'decrease' | 'neutral' {
      if (change > 0) return 'increase';
      if (change < 0) return 'decrease';
      return 'neutral';
    }
  }
) as React.ForwardRefExoticComponent<OverviewDashboardProps & React.RefAttributes<any>>; 
