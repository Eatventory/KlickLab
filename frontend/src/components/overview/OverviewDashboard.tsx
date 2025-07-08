import React, { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { Summary } from './Summary';
import { TopClicks } from './TopClicks';
import { ClickTrend } from './ClickTrend';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { DropoffInsightsCard } from '../engagement/DropoffInsightsCard';
import { AverageSessionDurationCard } from './AverageSessionDurationCard';
import { ConversionSummaryCard } from './ConversionSummaryCard';

interface VisitorsData {
  today: number;
  yesterday: number;
  trend?: { date: string; visitors: number }[];
}

interface ClicksData {
  today: number;
  yesterday: number;
}

export const OverviewDashboard: React.FC = () => {
  const [visitorsData, setVisitorsData] = useState<VisitorsData | null>(null);
  const [clicksData, setClicksData] = useState<ClicksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [visitorsResponse, clicksResponse] = await Promise.all([
          fetch(`/api/stats/visitors`),
          fetch(`/api/stats/clicks`)
        ]);
        
        const visitors = await visitorsResponse.json();
        const clicks = await clicksResponse.json();

        visitors.trend?.sort((a: { date: string }, b: { date: string }) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setVisitorsData(visitors);
        setClicksData(clicks);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setVisitorsData({ today: 1234, yesterday: 1096 });
        setClicksData({ today: 9874, yesterday: 9124 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateChange = (today: number, yesterday: number): number => {
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100 * 10) / 10;
  };

  const getChangeType = (change: number): 'increase' | 'decrease' | 'neutral' => {
    if (change > 0) return 'increase';
    if (change < 0) return 'decrease';
    return 'neutral';
  };

  if (loading) {
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

      <div className="w-full">
        <ClickTrend />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <TopClicks />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <DropoffInsightsCard />
        </div>
      </div>

      <div className="w-full">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 w-full">
          <div className="text-lg font-bold mb-2">사용자 방문 경로</div>
          <UserPathSankeyChart />
        </div>
      </div>
    </div>
  );
}; 