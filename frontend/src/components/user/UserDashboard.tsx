import React, { useState } from 'react';
import { UserPathSankeyChart } from './UserPathSankeyChart';
import { Users, Route, PieChart } from 'lucide-react';

// 타입 정의
interface FilterOptions {
  period: '5min' | '1hour' | '1day' | '1week';
  userType: 'all' | 'new' | 'returning';
  device: 'all' | 'mobile' | 'desktop';
}

export const UserDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    userType: 'all',
    device: 'all'
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-8">
      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">사용자 분석 필터</h2>
        </div>
        <div className="flex gap-4">
          <select 
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="5min">최근 5분</option>
            <option value="1hour">최근 1시간</option>
            <option value="1day">최근 1일</option>
            <option value="1week">최근 1주</option>
          </select>
          <select 
            value={filters.userType}
            onChange={(e) => handleFilterChange('userType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 사용자</option>
            <option value="new">신규 사용자</option>
            <option value="returning">재방문자</option>
          </select>
          <select 
            value={filters.device}
            onChange={(e) => handleFilterChange('device', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 기기</option>
            <option value="mobile">모바일</option>
            <option value="desktop">데스크탑</option>
          </select>
        </div>
      </div>

      {/* 유저 클릭 흐름 Sankey */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">사용자 클릭 흐름 분석</h2>
        </div>
        <UserPathSankeyChart />
      </div>

      {/* 향후 구현 예정 컴포넌트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 재방문률 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">재방문률</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>

        {/* 신규 vs 기존 유저 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">신규 vs 기존 유저</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div>
    </div>
  );
}; 