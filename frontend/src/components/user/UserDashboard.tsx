import React, { useState } from 'react';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { Users, RefreshCw } from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 사용자 세그먼트 분석 요약 */}
      <div className="mb-6">
        <UserSegmentSummary refreshKey={refreshKey} />
      </div>

      {/* 사용자 분석 */}
      <div className="mb-6 flex items-start gap-6">
        {/* 지역별 활성 사용자 */}
        <div className="flex-none w-[870px]">
          <RegionalActiveUsers />
        </div>
        
        {/* 성별 별 활성 사용자 */}
        <div className="flex-none w-80">
          <GenderActiveUsers />
        </div>
      </div>

      {/* 추가 컨텐츠 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">추가 사용자 분석</h3>
          <p className="text-gray-600">더 많은 분석 기능이 곧 추가될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}; 