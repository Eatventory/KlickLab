import React, { useState, useRef } from 'react';
import { Sidebar } from '../ui/Sidebar';
import { GlobalFilterBar } from '../ui/GlobalFilterBar';
import { RefreshCw } from 'lucide-react';

// 새로운 탭별 대시보드 컴포넌트들
import { OverviewDashboard } from '../overview/OverviewDashboard';
import { UserDashboard } from '../user/UserDashboard';
import { TrafficDashboard } from '../traffic/TrafficDashboard';
import { EngagementDashboard } from '../engagement/EngagementDashboard';
import { ReportDashboard } from '../report/ReportDashboard';
import { SettingsDashboard } from '../settings/SettingsDashboard';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const overviewRef = useRef<any>(null);
  const [overviewLastUpdated, setOverviewLastUpdated] = useState<Date | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // OverviewDashboard에서 lastUpdated를 받아오는 콜백
  const handleOverviewUpdate = (lastUpdated: Date) => {
    setOverviewLastUpdated(lastUpdated);
  };

  // 탭별 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard ref={overviewRef} onLastUpdated={handleOverviewUpdate} />;
      case 'users':
        return <UserDashboard />;
      case 'traffic':
        return <TrafficDashboard />;
      case 'engagement':
        return <EngagementDashboard />;
      case 'reports':
        return <ReportDashboard />;
      case 'settings':
        return <SettingsDashboard />;
      default:
        return <OverviewDashboard ref={overviewRef} onLastUpdated={handleOverviewUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {activeTab === 'dashboard' && '대시보드'}
                  {activeTab === 'users' && '사용자 분석'}
                  {activeTab === 'traffic' && '트래픽 분석'}
                  {activeTab === 'engagement' && '참여도 분석'}
                  {activeTab === 'reports' && '리포트'}
                  {activeTab === 'settings' && '설정'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'dashboard' && '전체 개요 및 주요 지표'}
                  {activeTab === 'users' && '사용자 행동 및 세그먼트 분석'}
                  {activeTab === 'traffic' && '방문자 추이 및 소스 분석'}
                  {activeTab === 'engagement' && '체류시간 및 참여도 분석'}
                  {activeTab === 'reports' && '상세 리포트 및 데이터 내보내기'}
                  {activeTab === 'settings' && '시스템 설정 및 계정 관리'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 새로고침 버튼 */}
                {activeTab === 'dashboard' && (
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
                    {activeTab === 'dashboard' && overviewLastUpdated
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

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}; 