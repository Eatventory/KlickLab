import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { AgeActiveUsers } from './AgeActiveUsers';
import { DevicePlatformChart } from './DevicePlatformChart';

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
        <div className="flex-none w-[870px] h-[530px]">
          <RegionalActiveUsers />
        </div>
        {/* 오른쪽 차트들 */}
        <div className="flex-1 flex flex-col gap-6">
          {/* 상단 차트들 */}
          <div className="flex gap-6">
            {/* 성별 별 활성 사용자 */}
            <div className="flex-none w-80 h-[530px]">
              <GenderActiveUsers />
            </div>
            
            {/* 연령 별 활성 사용자 */}
            <div className="flex-1 h-[530px]">
              <AgeActiveUsers />
            </div>
          </div>
          
          {/* 기기 및 플랫폼 분석 */}
          <div className="h-[530px]">
            <DevicePlatformChart />
          </div>
        </div>
      </div>      
    </div>
  );
}; 