import React, { useState, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { AgeActiveUsers } from './AgeActiveUsers';
import { DevicePlatformChart } from './DevicePlatformChart';
import DateRangeSelector from '../ui/DateRangeSelector';
import Collapse from '../ui/Collapse';
import { Users, RefreshCw } from 'lucide-react';

const userTabs: string[] = ["사용자 개요"];

export const UserDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [openCollapse, setOpenCollapse] = useState<string | null>(userTabs[0]);
  
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  // 공통 API 데이터 상태
  const [apiData, setApiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 공통 API 호출 함수
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

      let dateQuery = '';
      if (dateRange && dateRange.length > 0) {
        const startStr = dayjs(dateRange[0].startDate).format('YYYY-MM-DD');
        const endStr = dayjs(dateRange[0].endDate).format('YYYY-MM-DD');
        dateQuery = `?startDate=${startStr}&endDate=${endStr}`;
      }

      console.log('[UserDashboard] 공통 API 호출:', dateQuery);

      const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      console.log('[UserDashboard] 공통 API 응답:', result);
      
      // 데이터 소스 정보 업데이트
      if (result.meta?.dataSource) {
        handleDataSourceUpdate(result.meta.dataSource);
      }
      
      // 안전한 데이터 접근
      const dataArray = result.data || result || [];
      setApiData(dataArray);
      
    } catch (error) {
      console.error('[UserDashboard] API 호출 실패:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setApiData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 데이터 세그먼트별 분류
  const segmentedData = React.useMemo(() => {
    return {
      userAge: apiData.filter(row => row.segment_type === 'user_age'),
      userGender: apiData.filter(row => row.segment_type === 'user_gender'),
      deviceType: apiData.filter(row => row.segment_type === 'device_type'),
      country: apiData.filter(row => row.segment_type === 'country')
    };
  }, [apiData]);

  // 컴포넌트 마운트 및 날짜 변경 시 API 호출
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, refreshKey]);

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

  // 데이터 소스 정보 업데이트 콜백 (빈 함수)
  const handleDataSourceUpdate = (dataSource: string) => {
    // UI에서 표시하지 않으므로 빈 함수로 유지
  };

  // DateRangeSelector용 wrapper 함수들
  const handleSetDateRange = (range: { startDate: Date; endDate: Date; }[]) => {
    setDateRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  const handleSetTempRange = (range: { startDate: Date; endDate: Date; }[]) => {
    setTempRange(range.map(r => ({ ...r, key: 'selection' })));
  };

  return (
    <>
      <div className="w-full flex justify-end border-b-2 border-dashed">
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

      <Collapse
        title={userTabs[0]}
        isOpen={openCollapse === userTabs[0]}
        onToggle={() => setOpenCollapse(prev => prev === userTabs[0] ? null : userTabs[0])}
      >
        {/* 사용자 세그먼트 분석 요약 */}
        <div className="mb-6">
          <UserSegmentSummary 
            refreshKey={refreshKey}
            dateRange={dateRange[0]}
          />
        </div>

        {/* 사용자 분석 */}
        <div className="mb-6 space-y-6">
          {/* 상단 차트들 (지역별 + 성별 + 기기플랫폼) */}
          <div className="flex gap-6">
            {/* 지역별 활성 사용자 */}
            <div className="flex-1 h-[550px]">
              <RegionalActiveUsers 
                dateRange={dateRange[0]} 
                onDataSourceUpdate={handleDataSourceUpdate}
                data={segmentedData.country}
                loading={loading}
              />
            </div>
            
            {/* 성별 별 활성 사용자 */}
            <div className="flex-none w-80 h-[550px]">
              <GenderActiveUsers 
                dateRange={dateRange[0]} 
                data={segmentedData.userGender}
                loading={loading}
              />
            </div>
            
            {/* 기기 및 플랫폼 분석 */}
            <div className="flex-none w-80 h-[550px]">
              <DevicePlatformChart 
                dateRange={dateRange[0]}
                data={segmentedData.deviceType}
                loading={loading}
              />
            </div>
          </div>
          
          {/* 연령별 활성 사용자 (전체 width) */}
          <div className="h-[350px]">
            <AgeActiveUsers 
              dateRange={dateRange[0]}
              data={segmentedData.userAge}
              loading={loading}
            />
          </div>
        </div>
      </Collapse>      
    </>
  );
}; 