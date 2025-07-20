import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { AgeActiveUsers } from './AgeActiveUsers';
import { DevicePlatformChart } from './DevicePlatformChart';

import DateRangeSelector from '../ui/DateRangeSelector';

interface ApiData {
  segment_type: string;
  segment_value: string;
  dist_type?: string;
  dist_value?: string;
  user_count: number;
}

export const UserDashboard: React.FC = () => {
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  // 공통 API 데이터 상태
  const [apiData, setApiData] = useState<ApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜 쿼리 문자열 메모화
  const dateQuery = useMemo(() => {
    if (!dateRange?.[0]) return '';
    const startStr = dayjs(dateRange[0].startDate).format('YYYY-MM-DD');
    const endStr = dayjs(dateRange[0].endDate).format('YYYY-MM-DD');
    return `?startDate=${startStr}&endDate=${endStr}`;
  }, [dateRange]);

  // 공통 API 호출 함수
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

      const response = await fetch(`/api/users/realtime-analytics${dateQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      
      // 안전한 데이터 접근 및 타입 확인
      const data = Array.isArray(result.data) ? result.data : [];
      setApiData(data);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      setApiData([]);
    } finally {
      setLoading(false);
    }
  }, [dateQuery]);

  // 날짜 범위 변경 시 데이터 새로고침
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // 날짜 범위 업데이트 핸들러들
  const handleDateRangeChange = useCallback((range: { startDate: Date; endDate: Date }[]) => {
    const rangeWithKey = range.map(r => ({ ...r, key: 'selection' }));
    setDateRange(rangeWithKey);
  }, []);

  const handleTempRangeChange = useCallback((range: { startDate: Date; endDate: Date }[]) => {
    const rangeWithKey = range.map(r => ({ ...r, key: 'selection' }));
    setTempRange(rangeWithKey);
  }, []);

  const handleDateRangeApply = useCallback((start: Date, end: Date) => {
    const newRange = [{ startDate: start, endDate: end, key: 'selection' }];
    setDateRange(newRange);
    setShowPicker(false);
  }, []);

  const handleShowPickerToggle = useCallback((val: boolean) => {
    setShowPicker(val);
  }, []);

  // 데이터 필터링 메모화
  const filteredData = useMemo(() => ({
    gender: apiData.filter(item => item.segment_type === 'user_gender'),
    age: apiData.filter(item => item.segment_type === 'user_age'),
    region: apiData.filter(item => item.segment_type === 'country'),
    device: apiData.filter(item => item.segment_type === 'device_type')
  }), [apiData]);

  return (
    <>
              <div className="w-full flex justify-end border-b-2 border-dashed mb-6">
          <DateRangeSelector
            dateRange={dateRange}
            tempRange={tempRange}
            showPicker={showPicker}
            setDateRange={handleDateRangeChange}
            setTempRange={handleTempRangeChange}
            setShowPicker={handleShowPickerToggle}
            onApply={handleDateRangeApply}
          />
        </div>

      {/* 사용자 분석 */}
      <div className="mb-6 px-6">
        {/* 메인 차트 영역 (좌측 컬럼 + 우측 컬럼) */}
        <div className="flex gap-6">
          {/* 좌측 컬럼: 지역별 + 연령별 */}
          <div className="flex-1 flex flex-col gap-6">
            {/* 지역별 활성 사용자 */}
            <div className="h-[530px] overflow-hidden">
              <RegionalActiveUsers 
                dateRange={dateRange[0]} 
                onDataSourceUpdate={() => {}} // This prop is no longer needed
                data={filteredData.region}
                loading={loading}
              />
            </div>
            
            {/* 연령별 활성 사용자 */}
            <div className="h-[270px] overflow-hidden">
              <AgeActiveUsers 
                dateRange={dateRange[0]}
                data={filteredData.age}
                loading={loading}
              />
            </div>
          </div>
          
          {/* 우측 컬럼: UserSegmentSummary + (성별, 기기플랫폼) */}
          <div className="flex-none w-[824px] flex flex-col gap-6">
            {/* 사용자 세그먼트 분석 요약 */}
            <div>
              <UserSegmentSummary 
                refreshKey={0} // refreshKey is no longer needed
                dateRange={dateRange[0]}
              />
            </div>
            
            {/* 성별 + 기기플랫폼 가로 배치 */}
            <div className="flex gap-6 flex-1">
              {/* 성별 별 활성 사용자 */}
              <div className="flex-none w-[400px] h-[530px]">
                <GenderActiveUsers 
                  dateRange={dateRange[0]} 
                  data={filteredData.gender}
                  loading={loading}
                />
              </div>
              
              {/* 기기 및 플랫폼 분석 */}
              <div className="flex-none w-[400px] h-[530px]">
                <DevicePlatformChart 
                  dateRange={dateRange[0]}
                  data={filteredData.device}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>      
    </>
  );
}; 