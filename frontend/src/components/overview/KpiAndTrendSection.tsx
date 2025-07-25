import React from 'react';
import { StatCard } from './StatCard';
import { VisitorChart } from '../traffic/VisitorChart';

interface KpiAndTrendSectionProps {
  kpiData?: any[];
  visitorTrendData?: any[];
  loading?: boolean;
}

export const KpiAndTrendSection: React.FC<KpiAndTrendSectionProps> = ({ 
  kpiData = [], 
  visitorTrendData = [], 
  loading = false 
}) => {
  // 초를 '분 초'로 변환
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="md:col-span-2 bg-white rounded-lg shadow p-8 flex flex-col justify-between">
      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {kpiData.map((kpi, idx) => (
          <StatCard
            key={idx}
            data={{
              title: kpi.title,
              value: kpi.title === "평균 세션 시간" ? formatDuration(kpi.value) : kpi.value,
              change: kpi.change,
              changeType: kpi.changeType,
              icon: kpi.icon,
              color: kpi.color
            }}
          />
        ))}
      </div>

      {/* 방문자 트렌드 차트 */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-4">방문자 트렌드</h3>
        <VisitorChart data={visitorTrendData} />
      </div>
    </div>
  );
};