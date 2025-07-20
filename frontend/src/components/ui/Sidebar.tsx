import React from 'react';
import { 
  BarChart3, 
  Users, 
  // TrendingUp, 
  UserRoundCheck, 
  Settings, 
  FileText,
  Target,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const tabs = [
  {
    id: 'overview',
    label: '대시보드',
    icon: BarChart3,
    description: '전체 개요'
  },
  {
    id: 'users',
    label: '사용자 분석',
    icon: Users,
    description: '사용자 행동'
  },
  // {
  //   id: 'traffic',
  //   label: '트래픽 분석',
  //   icon: TrendingUp,
  //   description: '방문자 추이'
  // },
  {
    id: 'acquisition',
    label: '유입 분석',
    icon: Target,
    description: '유입 소스 분석'
  },
  // {
  //   id: 'conversion',
  //   label: '전환율',
  //   icon: Target,
  //   description: '전환 퍼널'
  // },
  {
    id: 'engagement',
    label: '참여도 분석',
    icon: UserRoundCheck,
    description: '체류시간 분석'
  },
  {
    id: 'reports',
    label: '리포트',
    icon: FileText,
    description: '상세 리포트'
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    description: '시스템 설정'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isCollapsed, 
  onToggleCollapse 
}) => {
  return (
    <div
      className={clsx(
        'fixed top-[64px] h-[calc(100vh-64px)] z-30 bg-white border-r border-gray-200 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64 shadow-lg shadow-neutral-300'
      )}
      style={{
        transition: 'width 0.4s cubic-bezier(0.77,0,0.18,1), box-shadow 0.4s cubic-bezier(0.77,0,0.18,1)',
        willChange: 'width, box-shadow',
      }}
      onMouseEnter={() => { if (isCollapsed) onToggleCollapse(); }}
      onMouseLeave={() => { if (!isCollapsed) onToggleCollapse(); }}
    >
      {/* 탭 메뉴 */}
      <nav className="flex-1 p-2 mt-4">
        <ul className="relative space-y-1">
          {/* 하이라이트 백그라운드 */}
          <div
            className={clsx(
              "absolute left-0 h-11 bg-blue-600 rounded-full z-0 transition-all duration-200",
              isCollapsed ? "w-11" : "w-full"
            )}
            style={{
              transform: `translateY(${tabs.findIndex(t => t.id === activeTab) * 48}px)`
            }}
          />
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id} className="relative z-10">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'relative w-full flex items-center px-3 py-3 rounded-lg transition-colors duration-100 text-left',
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {/* 아이콘 */}
                  <div className="w-5 h-5 flex-shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* 텍스트 */}
                  <div
                    className={clsx(
                      'absolute left-11 top-1/2 -translate-y-1/2 whitespace-nowrap transition-all duration-200',
                      isCollapsed
                        ? 'opacity-0 pointer-events-none translate-x-[-8px]'
                        : 'opacity-100 pointer-events-auto translate-x-0 delay-100'
                    )}
                  >
                    <div
                      className={clsx(
                        "text-md",
                        isActive ? "font-bold text-white" : "font-medium text-gray-700"
                      )}
                    >
                      {tab.label}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* 하단 정보 */}
      <div
        className={clsx(
          "p-4 border-t border-gray-200 transition-all duration-200 transform",
          isCollapsed
            ? "opacity-0 translate-y-4 pointer-events-none"
            : "opacity-100 translate-y-0 pointer-events-auto delay-100"
        )}
      >
        <div className="text-xs text-gray-500 whitespace-nowrap">
          <div>버전 1.1.0</div>
          <div>© 2025 KlickLab</div>
        </div>
      </div>
    </div>
  );
}; 