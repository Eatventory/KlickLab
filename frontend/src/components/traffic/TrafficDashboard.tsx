import React, { useState, useEffect } from 'react';
import { VisitorChart } from './VisitorChart';
import { TopPageFromMainPage } from './TopPageFromMainPage';
import { TrendingUp, Globe, Clock } from 'lucide-react';
import { mockDashboardData } from '../../data/mockData';

// 타입 정의
interface FilterOptions {
  period: 'daily' | 'weekly' | 'monthly';
  gender: 'all' | 'male' | 'female';
  ageGroup: 'all' | '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
}

interface TrafficData {
  visitorTrend: any[];
  mainPageNavigation: any[];
  filters: {
    period: string;
    gender: string;
    ageGroup: string;
  };
}

export const TrafficDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    period: 'daily',
    gender: 'all',
    ageGroup: 'all'
  });
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // 필터 변경 시 즉시 API 재호출
    setLoading(true);
  };

  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const queryParams = new URLSearchParams({
          period: filters.period,
          gender: filters.gender,
          ageGroup: filters.ageGroup
        });
        
        const response = await fetch(`/api/dashboard/traffic?${queryParams}`);
        const data: TrafficData = await response.json();
        setTrafficData(data);
      } catch (error) {
        console.error('Failed to fetch traffic data:', error);
        // Fallback to mock data
        setTrafficData({
          visitorTrend: mockDashboardData.visitorTrend,
          mainPageNavigation: mockDashboardData.clickRanking,
          filters: filters
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficData();
    
    // 30초마다 데이터 갱신
    const interval = setInterval(fetchTrafficData, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">트래픽 분석 필터</h2>
        </div>
        <div className="flex gap-4">
          <select 
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="hourly">시간별</option>
            <option value="daily">일별</option>
            <option value="weekly">주별</option>
            <option value="monthly">월별</option>
          </select>
          <select 
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 성별</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <select 
            value={filters.ageGroup}
            onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 나이대</option>
            <option value="10s">10대</option>
            <option value="20s">20대</option>
            <option value="30s">30대</option>
            <option value="40s">40대</option>
            <option value="50s">50대</option>
            <option value="60s+">60대 이상</option>
          </select>
        </div>
      </div>

      {/* 방문자 수 트렌드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">방문자 수 트렌드</h2>
        </div>
        <VisitorChart data={trafficData?.visitorTrend || mockDashboardData.visitorTrend} />
      </div>

      

      {/* 향후 구현 예정 컴포넌트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 유입 채널 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">유입 채널 분포</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>

        {/* 시간대별 유입 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">시간대별 유입 분포</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div>

      {/* 메인 페이지에서 이동하는 페이지 Top */}
      <TopPageFromMainPage 
        data={trafficData?.mainPageNavigation} 
        filters={trafficData?.filters}
      />
    </div>
  );
}; 