import React, { useState } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { AgeActiveUsers } from './AgeActiveUsers';
import { DevicePlatformChart } from './DevicePlatformChart';
import DateRangeSelector from '../ui/DateRangeSelector';
import { Users } from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDateRangeApply = (start: Date, end: Date) => {
    // 새로운 날짜 범위를 설정
    const newDateRange = [{ startDate: start, endDate: end, key: 'selection' }];
    setDateRange(newDateRange);
    setTempRange(newDateRange);
    
    // refreshKey를 업데이트하여 컴포넌트 갱신
    setRefreshKey(prev => prev + 1);
  };

  // DateRangeSelector용 wrapper 함수들
  const handleSetDateRange = (range: { startDate: Date; endDate: Date; }[]) => {
    setDateRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  const handleSetTempRange = (range: { startDate: Date; endDate: Date; }[]) => {
    setTempRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 날짜 범위 선택기 */}
      <div className="w-full flex justify-end border-b-2 border-dashed mb-6">
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={handleSetDateRange}
          setTempRange={handleSetTempRange}
          setShowPicker={setShowPicker}
          onApply={handleDateRangeApply}
        />
      </div>

      {/* 사용자 세그먼트 분석 요약 */}
      <div className="mb-6">
        <UserSegmentSummary 
          refreshKey={refreshKey}
          dateRange={dateRange[0]}
        />
      </div>

      {/* 사용자 분석 */}
      <div className="mb-6 flex items-start gap-6">
        {/* 지역별 활성 사용자 */}
        <div className="flex-none w-[870px] h-[550px]">
          <RegionalActiveUsers />
        </div>
        {/* 오른쪽 차트들 */}
        <div className="flex-1 flex flex-col gap-6">
          {/* 상단 차트들 */}
          <div className="flex gap-6">
            {/* 성별 별 활성 사용자 */}
            <div className="flex-none w-80 h-[550px]">
              <GenderActiveUsers />
            </div>
            
            {/* 연령 별 활성 사용자 */}
            <div className="flex-1 h-[550px]">
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