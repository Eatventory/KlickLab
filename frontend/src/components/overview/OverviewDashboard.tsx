import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { KpiAndTrendSection } from './KpiAndTrendSection';
import { RealtimeUsersSection } from './RealtimeUsersSection';
import { InfoWidgetsSection } from './InfoWidgetsSection';
import DateRangeSelector from '../ui/DateRangeSelector';

// 필터 관련 데이터 가져오기 (날짜 범위에 따라 변경)
async function fetchOverviewData(startDate: string, endDate: string) {
  const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
  
  if (!token) {
    throw new Error('인증 토큰이 필요합니다');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const [userStatsRes, trafficStatsRes, pageStatsRes, eventStatsRes] = await Promise.all([
    fetch(`/api/overview/user-stats?startDate=${startDate}&endDate=${endDate}`, { headers }),
    fetch(`/api/overview/traffic-stats?startDate=${startDate}&endDate=${endDate}`, { headers }),
    fetch(`/api/overview/page-stats?startDate=${startDate}&endDate=${endDate}`, { headers }),
    fetch(`/api/overview/event-stats?startDate=${startDate}&endDate=${endDate}`, { headers })
  ]);

  if (!userStatsRes.ok || !trafficStatsRes.ok || !pageStatsRes.ok || !eventStatsRes.ok) {
    throw new Error('개요 데이터 조회에 실패했습니다.');
  }

  const userStats = await userStatsRes.json();
  const trafficStats = await trafficStatsRes.json();
  const pageStats = await pageStatsRes.json();
  const eventStats = await eventStatsRes.json();
  
  return {
    userStats: userStats.data,
    userChanges: userStats.changes,
    userTrend: userStats.trend,
    trafficStats: trafficStats.data,
    pageStats: pageStats.data,
    eventStats: eventStats.data
  };
}

// 실시간 데이터만 가져오기 (필터와 무관)
async function fetchRealtimeData() {
  const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
  
  if (!token) {
    throw new Error('인증 토큰이 필요합니다');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const realtimeRes = await fetch('/api/overview/realtime', { headers });

  if (!realtimeRes.ok) {
    throw new Error('실시간 데이터 조회에 실패했습니다.');
  }

  const realtime = await realtimeRes.json();
  return realtime.data;
}

// Google Analytics 스타일의 개요 대시보드
export const OverviewDashboard = forwardRef((props, ref) => {
  // 날짜 범위 상태 및 핸들러 추가
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  const handleDateRangeChange = useCallback((range: { startDate: Date; endDate: Date }[]) => {
    const rangeWithKey = range.map(r => ({ ...r, key: 'selection' }));
    setDateRange(rangeWithKey);
  }, []);

  const handleTempRangeChange = useCallback((range: { startDate: Date; endDate: Date }[]) => {
    const rangeWithKey = range.map(r => ({ ...r, key: 'selection' }));
    setTempRange(rangeWithKey);
  }, []);

  const handleDateRangeApply = useCallback((start: Date, end: Date) => {
    const newRange = [{ startDate: start, endDate: end, key: 'selection' }];
    setDateRange(newRange);
    setShowPicker(false);
  }, []);

  const handleShowPickerToggle = useCallback((val: boolean) => {
    setShowPicker(val);
  }, []);

  // 메인 개요 데이터 상태
  const [overviewData, setOverviewData] = useState<{
    trafficSources: any[];
    topPages: any[];
    topClicks: any[];
    kpiData: any[];
    visitorTrendData: any[];
  }>({
    trafficSources: [],
    topPages: [],
    topClicks: [],
    kpiData: [],
    visitorTrendData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 실시간 데이터 별도 상태
  const [realtimeData, setRealtimeData] = useState<{
    realtimeUsers: number;
    realtimeTrend: any[];
    topLocations: any[];
  }>({
    realtimeUsers: 0,
    realtimeTrend: [],
    topLocations: []
  });
  const [realtimeLoading, setRealtimeLoading] = useState(true);

  // 필터에 따른 메인 데이터 가져오기
  useEffect(() => {
    const getOverviewData = async () => {
      try {
        setLoading(true);
        const startDate = dayjs(dateRange[0].startDate).format('YYYY-MM-DD');
        const endDate = dayjs(dateRange[0].endDate).format('YYYY-MM-DD');
        
        const { userStats, userChanges, userTrend, trafficStats, pageStats, eventStats } = await fetchOverviewData(startDate, endDate);
        
        // KPI 데이터 포맷팅
        const formattedKpiData = [
          {
            title: "활성 사용자",
            value: userStats.activeUsers,
            change: userChanges.activeUsers,
            changeType: userChanges.activeUsers >= 0 ? "increase" : "decrease",
            icon: "Users",
            color: "blue"
          },
          {
            title: "평균 세션 시간",
            value: userStats.avgSessionDuration,
            change: userChanges.avgSessionDuration,
            changeType: userChanges.avgSessionDuration >= 0 ? "increase" : "decrease",
            icon: "Clock",
            color: "green"
          },
          {
            title: "세션당 이벤트",
            value: userStats.conversionRate,
            change: userChanges.conversionRate,
            changeType: userChanges.conversionRate >= 0 ? "increase" : "decrease",
            icon: "PieChart",
            color: "purple"
          },
          {
            title: "참여 세션수",
            value: userStats.engagedSessions,
            change: userChanges.engagedSessions,
            changeType: userChanges.engagedSessions >= 0 ? "increase" : "decrease",
            icon: "BarChart",
            color: "red"
          }
        ];

        // 방문자 추이 데이터 변환 (VisitorChart 형태에 맞게)
        const formattedVisitorTrend = (userTrend || []).map((item: any) => ({
          date: item.date,
          visitors: item.users || 0,
          newVisitors: Math.round((item.users || 0) * 0.6), // 임시로 60%를 신규 방문자로 가정
          returningVisitors: Math.round((item.users || 0) * 0.4) // 나머지 40%를 재방문자로 가정
        }));

        setOverviewData({
          trafficSources: trafficStats.trafficSources || [],
          topPages: pageStats.topPages || [],
          topClicks: eventStats.topEvents?.map((event: any) => ({
            label: event.event,
            count: event.count
          })) || [],
          kpiData: formattedKpiData,
          visitorTrendData: formattedVisitorTrend
        });
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getOverviewData();
  }, [dateRange]); // dateRange가 변경될 때만 실행

  // 실시간 데이터 별도 업데이트 (1분마다)
  useEffect(() => {
    const getRealtimeData = async () => {
      try {
        setRealtimeLoading(true);
        const realtime = await fetchRealtimeData();
        
        setRealtimeData({
          realtimeUsers: parseInt(realtime.activeUsers30min) || 0,
          realtimeTrend: realtime.trend || [],
          topLocations: realtime.topLocations || []
        });
      } catch (err) {
        console.error('실시간 데이터 조회 실패:', err);
        // 실시간 데이터 조회 실패는 전체 에러로 처리하지 않음
      } finally {
        setRealtimeLoading(false);
      }
    };

    // 초기 로드
    getRealtimeData();
    
    // 1분마다 실시간 데이터만 새로고침
    const realtimeInterval = setInterval(getRealtimeData, 60000);

    return () => clearInterval(realtimeInterval);
  }, []); // 빈 의존성 배열 = 컴포넌트 마운트시에만 실행

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
    <>
      <div className="w-full flex justify-end border-b-2 border-dashed">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
        <KpiAndTrendSection 
          kpiData={overviewData.kpiData}
          visitorTrendData={overviewData.visitorTrendData}
          loading={loading}
        />
        <RealtimeUsersSection 
          activeUsers={realtimeData.realtimeUsers}
          trend={realtimeData.realtimeTrend}
          locations={realtimeData.topLocations}
          loading={realtimeLoading}
        />
      </div>
      {/* 이하 기존 하단 위젯 그리드 등은 그대로 유지 */}
      <InfoWidgetsSection 
        trafficSources={overviewData.trafficSources}
        topPages={overviewData.topPages}
        topClicks={overviewData.topClicks}
        loading={loading}
      />
    </>
  );
});

OverviewDashboard.displayName = 'OverviewDashboard';
