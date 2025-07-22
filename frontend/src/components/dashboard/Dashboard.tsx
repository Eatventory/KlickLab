import React, { useState, useRef } from 'react';
import HeaderBar from '../ui/Headerbar';
import { Sidebar } from '../ui/Sidebar';
import { GlobalFilterBar } from '../ui/GlobalFilterBar';
import { RefreshCw } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import clsx from 'clsx';

// 새로운 탭별 대시보드 컴포넌트들
import { OverviewDashboard } from '../overview/OverviewDashboard';
import { UserDashboard } from '../user/UserDashboard';
import { TrafficDashboard } from '../traffic/TrafficDashboard';
import { EngagementDashboard } from '../engagement/EngagementDashboard';
import { ReportDashboard } from '../report/ReportDashboard';
import { SettingsDashboard } from '../settings/SettingsDashboard';
import { ConversionDashboard } from '../conversion/ConversionDashboard';
import { AcquisitionDashboard } from '../acquisition/AcquisitionDashboard';

export const Dashboard: React.FC = () => {
  // activeTab, setActiveTab 제거
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const overviewRef = useRef<any>(null);
  const [overviewLastUpdated, setOverviewLastUpdated] = useState<Date | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 탭을 URL에서 추출
  const tabPath = location.pathname.split('/')[2] || 'overview';
  
  // 디버깅용 로그



  // console.log('Current pathname:', location.pathname);
  // console.log('Current tabPath:', tabPath);


  const handleTabChange = (tab: string) => {
    navigate(`/dashboard/${tab}`);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleOverviewUpdate = (lastUpdated: Date) => {
    setOverviewLastUpdated(lastUpdated);
  };

  // 탭별 타이틀/설명
  const tabTitles: Record<string, string> = {
    overview: '전체 개요',
    users: '사용자 분석',
    // traffic: '트래픽 분석',
    engagement: '참여도 분석',
    reports: '리포트',
    settings: '설정',
    // conversion: '전환율',
    acquisition: '유입 분석',
  };
  const tabDescriptions: Record<string, string> = {
    overview: '전체 개요 및 주요 지표',
    users: '사용자 행동 및 세그먼트 분석',
    // traffic: '방문자 추이 및 소스 분석',
    engagement: '체류시간 및 참여도 분석',
    reports: '상세 리포트 및 데이터 내보내기',
    settings: '시스템 설정 및 계정 관리',
    // conversion: '전환율 및 퍼널 분석',
    acquisition: '유입 소스별 분석 및 전환율',
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 상단 헤더바 */}
      <HeaderBar />
      <div className="flex flex-1 overflow-hidden">
      {/* 사이드바 */}
      <Sidebar
        activeTab={tabPath}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* 메인 콘텐츠 */}
        <div className={"flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-hidden ml-16"}>
          {/* 레벨2 헤더 */}
          <div className={"fixed top-16 z-20 transition-all duration-300 bg-white border-b left-16 w-[calc(100%-4rem)]"}>
            <header className="bg-white shadow-sm border-b border-gray-200">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {tabTitles[tabPath] || '전체 개요'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {tabDescriptions[tabPath] || '전체 개요 및 주요 지표'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 새로고침 버튼 */}
                    {/* {tabPath === 'overview' && (
                      <button
                        onClick={() => overviewRef.current?.fetchStats?.()}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="새로고침"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-500" />
                      </button>
                    )} */}
                    <div className="text-right">
                      <p className="text-sm text-gray-600">마지막 업데이트</p>
                      <p className="text-sm font-medium text-gray-900">
                        {tabPath === 'overview' && overviewLastUpdated
                          ? overviewLastUpdated.toLocaleString('ko-KR')
                          : new Date().toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* 전역 필터 바 */}
            {/* <GlobalFilterBar /> */}
          </div>

          {/* 메인 콘텐츠 영역: 탭별 라우팅 */}

          <main className={"flex-1 transition-all overflow-y-auto h-[calc(100vh-148px)] mt-[84px] bg-gray-50"}>
            <div className="p-0">
              <Routes>
                <Route path="overview" element={<OverviewDashboard ref={overviewRef} onLastUpdated={handleOverviewUpdate} />} />
                <Route path="users" element={<UserDashboard />} />
                {/* <Route path="traffic" element={<TrafficDashboard />} /> */}
                <Route path="engagement" element={<EngagementDashboard />} />
                <Route path="reports" element={<ReportDashboard />} />
                <Route path="settings" element={<SettingsDashboard />} />
                <Route path="conversion" element={<ConversionDashboard />} />
                <Route path="acquisition" element={<AcquisitionDashboard />} />
                <Route path="" element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}; 