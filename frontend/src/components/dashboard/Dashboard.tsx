import React, { useState } from 'react';
import { Sidebar } from '../ui/Sidebar';
import { FilterTabs } from '../ui/FilterTabs';
import Test from './Test';
import { BarChart3 } from 'lucide-react';

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // 탭별 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard />;
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
      case 'test':
        return <Test />;
      default:
        return <OverviewDashboard />;
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
                  {activeTab === 'test' && '데모용 테스트'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'dashboard' && '전체 개요 및 주요 지표'}
                  {activeTab === 'users' && '사용자 행동 및 세그먼트 분석'}
                  {activeTab === 'traffic' && '방문자 추이 및 소스 분석'}
                  {activeTab === 'engagement' && '체류시간 및 참여도 분석'}
                  {activeTab === 'reports' && '상세 리포트 및 데이터 내보내기'}
                  {activeTab === 'settings' && '시스템 설정 및 계정 관리'}
                  {activeTab === 'test' && '차트 및 랭킹 데모'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">마지막 업데이트</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}; 