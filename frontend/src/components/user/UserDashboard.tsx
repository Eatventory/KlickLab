import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { UserSegmentSummary } from './UserSegmentSummary';
import { RegionalActiveUsers } from './RegionalActiveUsers';
import { GenderActiveUsers } from './GenderActiveUsers';
import { AgeActiveUsers } from './AgeActiveUsers';
import { DevicePlatformChart } from './DevicePlatformChart';

import DateRangeSelector from '../ui/DateRangeSelector';

// API 응답 데이터의 타입을 정의합니다.
export interface UserData {
  summary_date: string;
  city: string;
  age_group: string;
  gender: string;
  device_type: string;
  device_os: string;
  users: number;
  sessions: number;
  session_duration_sum: number;
}

export const UserDashboard: React.FC = () => {
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  // API로부터 받은 원본 데이터 상태
  const [apiData, setApiData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜 쿼리 문자열 메모화
  const dateQuery = useMemo(() => {
    if (!dateRange?.[0]) return '';
    const startStr = dayjs(dateRange[0].startDate).format('YYYY-MM-DD');
    const endStr = dayjs(dateRange[0].endDate).format('YYYY-MM-DD');
    return `?startDate=${startStr}&endDate=${endStr}`;
  }, [dateRange]);

  // API 호출 함수
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
      
      const data: UserData[] = Array.isArray(result.data) ? result.data : [];
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
        <div className="flex gap-6">
          {/* 좌측 컬럼: 지역별 + 연령별 */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="h-[550px] overflow-hidden">
              <RegionalActiveUsers 
                dateRange={dateRange[0]}
                data={apiData}
                loading={loading}
              />
            </div>
            <div className="h-[310px] overflow-hidden">
              <AgeActiveUsers 
                dateRange={dateRange[0]}
              />
            </div>
          </div>
          
          {/* 우측 컬럼: UserSegmentSummary + (성별, 기기플랫폼) */}
          <div className="flex-none w-[824px] flex flex-col gap-6">
            <div>
              <UserSegmentSummary 
                dateRange={dateRange[0]}
              />
            </div>
            <div className="flex gap-6 flex-1">
              <div className="flex-none w-[400px] h-[530px]">
                <GenderActiveUsers 
                  dateRange={dateRange[0]}
                  data={apiData}
                  loading={loading}
                />
              </div>
              <div className="flex-none w-[400px] h-[530px]">
                <DevicePlatformChart 
                  dateRange={dateRange[0]}
                  data={apiData} // 전체 데이터 전달
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