import React, { forwardRef, useState, useEffect } from 'react';
import { KpiAndTrendSection } from './KpiAndTrendSection';
import { RealtimeUsersSection } from './RealtimeUsersSection';
import { InfoWidgetsSection } from './InfoWidgetsSection';
import { useAuthStore } from '../../store/useAuthStore';

// 하드코딩된 mock 데이터
const mockData = {
  realtime: {
    activeUsers30min: 23
  },
  // 하드코딩된 5개의 트렌드 데이터 포인트 (5분 간격)
  trend: [
    { timestamp: '00:00', value: 7 },
    { timestamp: '00:05', value: 5 },
    { timestamp: '00:10', value: 3 },
    { timestamp: '00:15', value: 3 },
    { timestamp: '00:20', value: 6 }
  ],
  widgets: {
    trafficSources: [
      { source: 'direct', count: 25, percentage: 45 },
      { source: 'search', count: 12, percentage: 32 },
      { source: 'social', count: 15, percentage: 15 },
      { source: 'origin', count: 8, percentage: 8 }
    ],
    topPages: [
      { path: '/home', title: '홈페이지', views: 125 },
      { path: '/products', title: '제품 목록', views: 85 },
      { path: '/about', title: '회사 소개', views: 62 },
      { path: '/contact', title: '문의하기', views: 45 },
      { path: '/blog', title: '블로그', views: 38 }
    ],
    topClicks: [
      { element: 'view_details', count: 87 },
      { element: 'add_to_cart', count: 52 },
      { element: 'questions', count: 21 },
      { element: 'purchase_success', count: 18 },
      { element: 'signup_success', count: 15 }
    ]
  },
  // KpiAndTrendSection을 위한 mock 데이터 추가
  kpi: {
    data: {
      activeUsers: 450,
      avgSessionDuration: 185, // 3분 5초
      conversionRate: 12.5,
      engagedSessions: 328
    },
    changes: {
      activeUsers: -1.2,
      avgSessionDuration: 0.7,
      conversionRate: -2.3,
      engagedSessions: -2.3
    }
  },
  visitorTrend: [
    { date: '2023-05-25', users: 1850 },
    { date: '2023-05-26', users: 1950 },
    { date: '2023-05-27', users: 2100 },
    { date: '2023-05-28', users: 2050 },
    { date: '2023-05-29', users: 2200 },
    { date: '2023-05-30', users: 2350 },
    { date: '2023-05-31', users: 2450 }
  ]
};

// 원래 API 호출 함수 (주석 처리)
/*
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
*/

// Mock 데이터를 반환하는 함수
async function fetchOverviewData() {
  // API 호출을 시뮬레이션하기 위한 지연 추가
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockData);
    }, 500); // 0.5초 지연
  });
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
    // 원래 코드 (주석 처리)
    /*
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
    */
    
    // 초기 데이터 설정
    setOverviewData({
      realtimeUsers: mockData.realtime.activeUsers30min,
      realtimeTrend: mockData.trend, // 하드코딩된 고정 데이터
      trafficSources: mockData.widgets.trafficSources,
      topPages: mockData.widgets.topPages,
      topClicks: mockData.widgets.topClicks
    });
    setLoading(false);
    
    // 데이터 갱신 안함 - 고정 데이터 사용
    /*
    const intervalId = setInterval(() => {
      const randomChange = Math.floor(Math.random() * 10) - 5;
      setOverviewData(prev => ({
        ...prev,
        realtimeUsers: Math.max(0, prev.realtimeUsers + randomChange)
      }));
    }, 60000);

    return () => clearInterval(intervalId);
    */

    // 인터벌이 없으므로 빈 함수 반환
    return () => {};
  }, []); // token 의존성 제거

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
        <KpiAndTrendSection 
          mockKpiData={mockData.kpi}
          mockVisitorTrend={mockData.visitorTrend}
        />
        <RealtimeUsersSection 
          activeUsers={overviewData.realtimeUsers}
          trend={overviewData.realtimeTrend}
          sources={overviewData.trafficSources}
          loading={loading}
        />
      </div>
      {/* 하단 위젯 그리드 */}
      <InfoWidgetsSection 
        trafficSources={mockData.widgets.trafficSources}
        topPages={mockData.widgets.topPages}
        topClicks={mockData.widgets.topClicks}
        loading={false}
      />
    </div>
  );
});
