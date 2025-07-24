import React, { forwardRef, useState, useEffect } from 'react';
import { KpiAndTrendSection } from './KpiAndTrendSection';
import { RealtimeUsersSection } from './RealtimeUsersSection';
import { InfoWidgetsSection } from './InfoWidgetsSection';
import { useAuthStore } from '../../store/useAuthStore';

async function fetchOverviewData(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const [realtimeRes, trendRes, widgetsRes] = await Promise.all([
    fetch('/api/overview/realtime', { headers }),
    fetch('/api/overview/realtime-trend', { headers }),
    fetch('/api/overview/widgets', { headers })
  ]);

  if (!realtimeRes.ok || !trendRes.ok || !widgetsRes.ok) {
    throw new Error('개요 데이터 조회에 실패했습니다.');
  }

  const realtime = await realtimeRes.json();
  const trend = await trendRes.json();
  const widgets = await widgetsRes.json();
  
  return {
    realtime: realtime.data,
    trend: trend.data,
    widgets: widgets
  };
}

// Google Analytics 스타일의 개요 대시보드
export const OverviewDashboard = forwardRef((props, ref) => {
  const { token } = useAuthStore();
  const [overviewData, setOverviewData] = useState({
    realtimeUsers: 0,
    realtimeTrend: [],
    trafficSources: [],
    topPages: [],
    topClicks: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getOverviewData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const { realtime, trend, widgets } = await fetchOverviewData(token);
        
        setOverviewData({
          realtimeUsers: realtime.activeUsers30min || 0,
          realtimeTrend: trend || [],
          trafficSources: widgets.trafficSources || [],
          topPages: widgets.topPages || [],
          topClicks: widgets.topClicks || []
        });
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getOverviewData();
    const intervalId = setInterval(getOverviewData, 60000); // 1분마다 데이터 갱신

    return () => clearInterval(intervalId);
  }, [token]);

  if (error) {
    return (
      <div className="bg-gray-50 p-4 sm:p-8">
        <div className="bg-white rounded-lg shadow p-8 flex items-center justify-center">
          <span className="text-red-500">오류: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 sm:p-8">
      {/* GA 스타일 상단 2분할 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <KpiAndTrendSection />
        <RealtimeUsersSection 
          activeUsers={overviewData.realtimeUsers}
          trend={overviewData.realtimeTrend}
          sources={overviewData.trafficSources}
          loading={loading}
        />
      </div>
      {/* 이하 기존 하단 위젯 그리드 등은 그대로 유지 */}
      <InfoWidgetsSection 
        trafficSources={overviewData.trafficSources}
        topPages={overviewData.topPages}
        topClicks={overviewData.topClicks}
        loading={loading}
      />
    </div>
  );
});
