import React from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  Settings, 
  FileText,
  ChevronLeft,
  ChevronRight
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
    id: 'dashboard',
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
  {
    id: 'traffic',
    label: '트래픽 분석',
    icon: TrendingUp,
    description: '방문자 추이'
  },
  {
    id: 'engagement',
    label: '참여도 분석',
    icon: Clock,
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
        'fixed top-[64px] h-[calc(100vh-64px)] z-30 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <IconComponent className={clsx(
                    'flex-shrink-0',
                    isActive ? 'w-5 h-5' : 'w-5 h-5'
                  )} />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {tab.description}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 정보 */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>버전 1.0.2</div>
            <div>© 2025 KlickLab</div>
          </div>
        </div>
      )}
    </div>
  );
}; 