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

export const Dashboard: React.FC = () => {
  // activeTab, setActiveTab 제거
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const overviewRef = useRef<any>(null);
  const [overviewLastUpdated, setOverviewLastUpdated] = useState<Date | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 탭을 URL에서 추출
  const tabPath = location.pathname.split('/')[2] || 'overview';

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
    overview: '대시보드',
    users: '사용자 분석',
    traffic: '트래픽 분석',
    engagement: '참여도 분석',
    reports: '리포트',
    settings: '설정',
  };
  const tabDescriptions: Record<string, string> = {
    overview: '전체 개요 및 주요 지표',
    users: '사용자 행동 및 세그먼트 분석',
    traffic: '방문자 추이 및 소스 분석',
    engagement: '체류시간 및 참여도 분석',
    reports: '상세 리포트 및 데이터 내보내기',
    settings: '시스템 설정 및 계정 관리',
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* 상단 헤더바 */}
      <HeaderBar />
      <div className='flex'>
        {/* 사이드바 */}
        <Sidebar
          activeTab={tabPath}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* 메인 콘텐츠 */}
        <div
          className={clsx(
            "flex-1 flex flex-col mt-16 min-w-0 transition-all duration-300",
            isSidebarCollapsed ? "ml-16" : "ml-64"
          )}
        >
          {/* 헤더 */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {tabTitles[tabPath] || '대시보드'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {tabDescriptions[tabPath] || '전체 개요 및 주요 지표'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* 새로고침 버튼 */}
                  {tabPath === 'overview' && (
                    <button
                      onClick={() => overviewRef.current?.fetchStats?.()}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="새로고침"
                    >
                      <RefreshCw className="w-5 h-5 text-gray-500" />
                    </button>
                  )}
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
          <GlobalFilterBar />

          {/* 메인 콘텐츠 영역: 탭별 라우팅 */}
          <main className="flex-1 p-6">
            <Routes>
              <Route path="overview" element={<OverviewDashboard ref={overviewRef} onLastUpdated={handleOverviewUpdate} />} />
              <Route path="users" element={<UserDashboard />} />
              <Route path="traffic" element={<TrafficDashboard />} />
              <Route path="engagement" element={<EngagementDashboard />} />
              <Route path="reports" element={<ReportDashboard />} />
              <Route path="settings" element={<SettingsDashboard />} />
              <Route path="" element={<Navigate to="overview" replace />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}; 