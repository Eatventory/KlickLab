import React, { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { Summary } from './Summary';
import { TopClicks } from './TopClicks';
import { ClickTrend } from './ClickTrend';
import { UserPathSankeyChart } from '../user/UserPathSankeyChart';
import { DropoffInsightsCard } from '../engagement/DropoffInsightsCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
          fetch(`http://localhost:3000/api/stats/visitors`),
          fetch(`http://localhost:3000/api/stats/clicks`)
        ]);
        
        const visitors = await visitorsResponse.json();
        const clicks = await clicksResponse.json();
        
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
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-center">
          <Summary />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col justify-center">
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
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col justify-center">
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col justify-center">
          <TopClicks />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col justify-center">
          <DropoffInsightsCard />
        </div>
      </div>

      <div className="w-full">
        <div className="bg-white p-6 rounded-lg shadow-sm w-full h-[500px] flex flex-col">
          <div className="text-lg font-bold mb-0">클릭 트렌드</div>
          <ClickTrend />
        </div>
      </div>

      <div className="w-full">
        <div className="bg-white p-6 rounded-lg shadow-sm w-full">
          <div className="text-lg font-bold mb-2">사용자 방문 경로</div>
          <UserPathSankeyChart />
        </div>
      </div>

      {/* 최근 7일 방문자 추이 차트 */}
      {visitorsData?.trend && visitorsData.trend.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm w-full h-[300px] flex flex-col">
          <div className="text-lg font-bold mb-2">최근 7일 방문자 추이</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={visitorsData.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke="#3b82f6" name="방문자 수" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[120px]">
          <div className="animate-pulse bg-gray-200 rounded w-16 h-6 mb-2" />
          <div className="text-gray-400 text-sm">평균 세션 길이<br/>준비 중입니다</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[120px]">
          <div className="animate-pulse bg-gray-200 rounded w-16 h-6 mb-2" />
          <div className="text-gray-400 text-sm">전환율 카드<br/>준비 중입니다</div>
        </div>
      </div>
    </div>
  );
}; 