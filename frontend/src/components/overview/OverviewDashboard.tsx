import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StatCard } from './StatCard';
import { Summary } from './Summary';
import { TopClicks } from './TopClicks';
import { ClickTrend } from './ClickTrend';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { DropoffInsightsCard } from '../engagement/DropoffInsightsCard';
import { getPageLabel } from '../../utils/getPageLabel';
import { AverageSessionDurationCard } from './AverageSessionDurationCard';
import { ConversionSummaryCard } from './ConversionSummaryCard';
import { VisitorChart } from '../traffic/VisitorChart';
import { TrendingUp } from 'lucide-react';

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

export const OverviewDashboard = forwardRef<any, { onLastUpdated?: (d: Date) => void }>((props, ref) => {
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
      const [visitorsResponse, clicksResponse, userPathResponse, visitorTrendResponse] = await Promise.all([
        fetch(`/api/stats/visitors`, {headers: { Authorization: `Bearer ${token}` }}),
        fetch(`/api/stats/clicks`, {headers: { Authorization: `Bearer ${token}` }}),
        fetch(`/api/stats/userpath-summary`, {headers: { Authorization: `Bearer ${token}` }}),
        fetch(`/api/traffic/daily-visitors`, {headers: { Authorization: `Bearer ${token}` }})
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
  }, []);

  // 30초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (visitorsData === null || clicksData === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  const visitorsChange = visitorsData ? calculateChange(visitorsData.today, visitorsData.yesterday) : 0;
  const clicksChange = clicksData ? calculateChange(clicksData.today, clicksData.yesterday) : 0;

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Summary refreshKey={refreshKey} />
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
        <AverageSessionDurationCard refreshKey={refreshKey} />
        <ConversionSummaryCard refreshKey={refreshKey} />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">일간 활성 이용자 수</h2>
        </div>
        <VisitorChart data={visitorTrendData} period='daily' refreshKey={refreshKey} />
      </div>
      <div className="w-full">
        <ClickTrend refreshKey={refreshKey} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <TopClicks refreshKey={refreshKey} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <DropoffInsightsCard refreshKey={refreshKey} />
        </div>
      </div>
      <div className="w-full">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 w-full">
          <div className="text-lg font-bold mb-2">사용자 방문 경로</div>
          <UserPathSankeyChart data={userPathData} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );

  function calculateChange(today: number, yesterday: number): number {
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100 * 10) / 10;
  }
  function getChangeType(change: number): 'increase' | 'decrease' | 'neutral' {
    if (change > 0) return 'increase';
    if (change < 0) return 'decrease';
    return 'neutral';
  }
}); 