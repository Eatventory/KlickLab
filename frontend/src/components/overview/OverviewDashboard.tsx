import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StatCard } from './StatCard';
import { Summary } from './Summary';
import { TopClicks } from './TopClicks';
import { ClickTrend } from './ClickTrend';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { getPageLabel } from '../../utils/getPageLabel';
import { AverageSessionDurationCard } from './AverageSessionDurationCard';
import { ConversionSummaryCard } from './ConversionSummaryCard';
import ConversionPathsCard from './ConversionPathsCard';
import { VisitorChart } from '../traffic/VisitorChart';
import { TrendingUp } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import { mockSankeyPaths } from '../../data/mockData';
import dayjs from 'dayjs';

interface PathData {
  from: string;
  to: string;
  value: number;
}

interface VisitorsData {
  today: number;
  yesterday: number;
  trend?: { date: string; visitors: number }[];
}

interface ClicksData {
  today: number;
  yesterday: number;
}

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