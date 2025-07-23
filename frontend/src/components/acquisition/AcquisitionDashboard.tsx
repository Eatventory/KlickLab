import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { Calendar, Settings, Share2, MoreHorizontal, BarChart3, Target, Globe, Users, TrendingUp, Clock } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';

import DateRangeSelector from '../ui/DateRangeSelector';

// 컴포넌트들 import
import HorizontalBarChart from '../../components/HorizontalBarChart';
import { FunnelConversionChart } from './FunnelConversionChart';
import { DeviceBrowserDonutChart } from './DeviceBrowserDonutChart';
import { HourlyTrendLineChart } from './HourlyTrendLineChart';
import { ClickFlowSankeyChart } from './ClickFlowSankeyChart';
import { ChannelGroupStackedChart } from './ChannelGroupStackedChart';
import { keyframes } from 'framer-motion';
import { ConversionRateWidget } from '../conversion/ConversionRateWidget';
import { ConversionSummaryCard } from '../ConversionSummaryCard';
import { ChannelConversionTable } from '../traffic/ChannelConversionTable';
import { LandingConversionTable } from '../traffic/LandingConversionTable';

// 타입 정의
interface FilterOptions {
  period: '1hour' | '1day' | '1week' | '1month';
  source: 'all' | 'organic' | 'direct' | 'social' | 'referral';
  device: 'all' | 'mobile' | 'desktop';
}

interface AcquisitionData {
  hourlyTrendData: any[];
  topChannelData: any[];
  funnelData: any[];
  deviceData: any[];
  browserData: any[];
  clickFlowData: {
    nodes: any[];
    links: any[];
  };
  channelGroupData: any[];
  sessionData: any[];
  realtimeData: {
    topCountries: any[];
  };
  channelConversionData: any[];
}

// Mock Data 생성 함수들 (활성 사용자 3457명, 신규 유입 사용자 2505명 기준)
const generateMockHourlyData = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => {
    let baseUsers;
    // 새벽(0-6시): 낮은 수치
    if (hour >= 0 && hour <= 6) {
      baseUsers = Math.floor(Math.random() * 80) + 30; // 30-110명
    }
    // 밤 9시-10시: 높은 수치
    else if (hour >= 21 && hour <= 22) {
      baseUsers = Math.floor(Math.random() * 120) + 200; // 200-320명
    }
    // 나머지 시간: 중간 수치
    else {
      baseUsers = Math.floor(Math.random() * 80) + 120; // 120-200명
    }
    
    const newUsers = Math.floor(baseUsers * (0.65 + Math.random() * 0.2)); // 65-85%가 신규
    const existingUsers = baseUsers - newUsers;
    
    return {
      hour: hour.toString().padStart(2, '0'),
      total_users: baseUsers,
      new_users: newUsers,
      existing_users: existingUsers
    };
  });
};

const generateMockTopChannelData = () => [
  { channel: 'google', users: 1730, clicks: 2684 }, // 가장 높음
  { channel: 'naver', users: 1040, clicks: 1612 }, // 2위
  { channel: 'kakao', users: 520, clicks: 806 },   // 3위  
  { channel: 'direct', users: 167, clicks: 259 }   // 가장 낮음
];

const generateMockNewUserChannelData = () => [
  { channel: 'google', users: 577 }, // 상위 유입 채널의 정확히 1/3
  { channel: 'naver', users: 347 }, // 정확히 1/3
  { channel: 'kakao', users: 173 }, // 정확히 1/3
  { channel: 'direct', users: 56 }  // 정확히 1/3
];

const generateMockDeviceData = () => {
  const total = 3457;
  return [
    { name: 'Mobile', value: Math.floor(total * 0.68), percentage: 68 },
    { name: 'Desktop', value: Math.floor(total * 0.27), percentage: 27 },
    { name: 'Tablet', value: Math.floor(total * 0.05), percentage: 5 }
  ];
};

const generateMockBrowserData = () => {
  const total = 3457;
  return [
    { name: 'Chrome', value: Math.floor(total * 0.52), percentage: 52 },
    { name: 'Safari', value: Math.floor(total * 0.26), percentage: 26 },
    { name: 'Edge', value: Math.floor(total * 0.17), percentage: 17 },
    { name: 'Others', value: Math.floor(total * 0.05), percentage: 5 }
  ];
};

const generateMockChannelGroupData = () => [
  { channel: 'google', device: 'mobile', users: 433 }, // 75% mobile (577의 75%)
  { channel: 'google', device: 'desktop', users: 144 }, // 25% desktop (577의 25%)
  { channel: 'naver', device: 'mobile', users: 212 }, // 61% mobile (347의 61%)
  { channel: 'naver', device: 'desktop', users: 135 }, // 39% desktop (347의 39%)
  { channel: 'kakao', device: 'mobile', users: 125 }, // 72% mobile (173의 72%)
  { channel: 'kakao', device: 'desktop', users: 48 }, // 28% desktop (173의 28%)
  { channel: 'direct', device: 'mobile', users: 34 }, // 60% mobile (56의 60%)
  { channel: 'direct', device: 'desktop', users: 22 }  // 40% desktop (56의 40%)
];

const generateMockFunnelData = () => [
  { stage: '회원가입', visitors: 2457, conversionRate: 61 },
  { stage: '구매', visitors: 561, conversionRate: 12 }
];

const generateMockCampaignData = () => [
  { campaign: 'summer2024', description: '시즌 한정 할인 이벤트', sessions: 950 }, // 1위
  { campaign: 'welcome_offer', description: '신규 가입 혜택 캠페인', sessions: 720 }, // 2위
  { campaign: 'instagram_promo', description: 'SNS 리그램 이벤트', sessions: 480 }, // 3위
  { campaign: 'Google Ads - Brand', sessions: 380 },
  { campaign: 'Naver Search', sessions: 290 },
  { campaign: 'Kakao Display', sessions: 220 },
  { campaign: 'Facebook Campaign', sessions: 150 },
  { campaign: 'YouTube Ads', sessions: 80 }
];

const generateMockCountriesData = () => [
  { city: '서울특별시', users: 1384 },  // 40%
  { city: '경기도', users: 518 },       // 15%
  { city: '부산광역시', users: 311 },   // 9%
  { city: '경상남도', users: 242 },     // 7%
  { city: '인천광역시', users: 207 },   // 6%
  { city: '경상북도', users: 173 },     // 5%
  { city: '대구광역시', users: 138 },   // 4%
  { city: '충청남도', users: 104 },     // 3%
  { city: '전라북도', users: 104 },     // 3%
  { city: '강원특별자치도', users: 86 }, // 2.5%
  { city: '충청북도', users: 69 },      // 2%
  { city: '전라남도', users: 69 },      // 2%
  { city: '광주광역시', users: 52 },    // 1.5%
];

const generateMockChannelConversionData = () => [
  { channel: 'google', visitors: 1730, conversions: 346, conversionRate: 20.0 }, // 1위 (20%)
  { channel: 'naver', visitors: 1040, conversions: 182, conversionRate: 17.5 },  // 2위 (17.5%)
  { channel: 'kakao', visitors: 520, conversions: 73, conversionRate: 14.0 },    // 3위 (14%)
  { channel: 'direct', visitors: 167, conversions: 17, conversionRate: 10.2 }    // 4위 (10.2%)
];

export const AcquisitionDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    source: 'all',
    device: 'all'
  });

  const [acquisitionData, setAcquisitionData] = useState<AcquisitionData | null>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // DateRangeSelector 상태 추가
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  // Mock 데이터와 실제 KPI 데이터를 함께 사용하는 함수
  const initializeMockData = () => {
    // console.log('=== MOCK DATA 로딩 시작 (활성 사용자 3457명, 신규 유입 사용자 2505명 기준) ===');
    
    setLoading(true);
    setError(null);
    
    // 차트용 Mock 데이터 생성
    const mockChartData: AcquisitionData = {
      hourlyTrendData: generateMockHourlyData(),
      topChannelData: generateMockTopChannelData(),
      funnelData: generateMockFunnelData(),
      deviceData: generateMockDeviceData(),
      browserData: generateMockBrowserData(),
      clickFlowData: { nodes: [], links: [] },
      channelGroupData: generateMockChannelGroupData(),
      sessionData: generateMockCampaignData(),
      realtimeData: { topCountries: generateMockCountriesData() },
      channelConversionData: generateMockChannelConversionData()
    };
    
    // console.log('=== MOCK DATA 설정 완료 ===', mockChartData);
    
    // Mock 차트 데이터 설정
    setAcquisitionData(mockChartData);
    setRefreshKey(prev => prev + 1);
    setLoading(false);
    
    // 실제 KPI 데이터 가져오기 (활성 사용자, 신규 유입 사용자만)
    tryFetchRealKpiData();
  };

  // 활성 사용자와 신규 유입 사용자만 실제 API에서 가져오기
  const tryFetchRealKpiData = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) {
        // console.log('[KPI] 토큰 없음 - Mock KPI 사용: 활성 사용자 3457명, 신규 유입 사용자 2505명');
        setKpiData({
          active_users: 3457,
          new_users: 2505
        });
        return;
      }

      const startDate = dateRange[0].startDate;
      const endDate = dateRange[0].endDate;
      const startStr = dayjs(startDate).format('YYYY-MM-DD');
      const endStr = dayjs(endDate).format('YYYY-MM-DD');
      const dateQuery = `startDate=${startStr}&endDate=${endStr}`;

      const globalFilterParams = new URLSearchParams();
      if (globalFilter.conditions) {
        Object.entries(globalFilter.conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            globalFilterParams.append(key, String(value));
          }
        });
      }
      
      const globalFilterString = globalFilterParams.toString();
      const globalFilterQuery = globalFilterString ? `&${globalFilterString}` : '';

      // console.log('[KPI] 실제 API 시도 (활성 사용자, 신규 유입 사용자만)...');
      const response = await fetch(`/api/acquisition/overview?${dateQuery}${globalFilterQuery}`, { 
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const realKpiData = await response.json();
        // console.log('[KPI] 실제 데이터 수신:', realKpiData);
        // 실제 KPI 데이터가 있으면 사용, 없으면 Mock 사용
        setKpiData({
          active_users: realKpiData.active_users || 3457,
          new_users: realKpiData.new_users || 2505
        });
      } else {
        // console.log('[KPI] API 응답 실패 - Mock KPI 사용');
        setKpiData({
          active_users: 3457,
          new_users: 2505
        });
      }
    } catch (err) {
      // console.log('[KPI] API 에러 - Mock KPI 사용:', err);
      setKpiData({
        active_users: 3457,
        new_users: 2505
      });
    }
  };



  /* fetchAcquisitionData 함수 - Mock 모드에서는 사용하지 않음
  const fetchAcquisitionData = async (start?: Date, end?: Date) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

      // 날짜 범위 처리
      const startDate = start || dateRange[0].startDate;
      const endDate = end || dateRange[0].endDate;
      const startStr = dayjs(startDate).format('YYYY-MM-DD');
      const endStr = dayjs(endDate).format('YYYY-MM-DD');
      const dateQuery = `startDate=${startStr}&endDate=${endStr}`;

      // SDK_KEY 확인 로그
      console.log('[SDK_KEY CHECK] Bearer Token:', token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[Decoded SDK Key]', payload.sdk_key || payload.sub || 'N/A');
      } catch (err) {
        console.warn('[SDK_KEY CHECK] 토큰 디코딩 실패:', err);
      }

      // 전역 필터 조건을 URL 파라미터로 변환
      const globalFilterParams = new URLSearchParams();
      if (globalFilter.conditions) {
        Object.entries(globalFilter.conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            globalFilterParams.append(key, String(value));
          }
        });
      }
      
      const globalFilterString = globalFilterParams.toString();
      const globalFilterQuery = globalFilterString ? `&${globalFilterString}` : '';

      // 모든 API 호출을 병렬로 실행
      const [
        overviewRes,
        hourlyTrendRes,
        topChannelsRes,
        funnelRes,
        platformRes,
        clickFlowRes,
        channelGroupsRes,
        campaignsRes,
        countriesRes
      ] = await Promise.all([
        fetch(`/api/acquisition/overview?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/hourly-trend?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/top-channels?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/funnel-conversion?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/platform-analysis?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/click-flow?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/channel-groups?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/campaigns?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/top-countries?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // 응답 확인
      if (!overviewRes.ok) throw new Error('Overview 데이터를 불러오지 못했습니다.');
      if (!hourlyTrendRes.ok) throw new Error('Hourly Trend 데이터를 불러오지 못했습니다.');
      if (!topChannelsRes.ok) throw new Error('Top Channels 데이터를 불러오지 못했습니다.');
      if (!funnelRes.ok) throw new Error('Funnel 데이터를 불러오지 못했습니다.');
      if (!platformRes.ok) throw new Error('Platform 데이터를 불러오지 못했습니다.');
      if (!clickFlowRes.ok) throw new Error('Click Flow 데이터를 불러오지 못했습니다.');
      if (!channelGroupsRes.ok) throw new Error('Channel Groups 데이터를 불러오지 못했습니다.');
      if (!campaignsRes.ok) throw new Error('Campaigns 데이터를 불러오지 못했습니다.');
      if (!countriesRes.ok) throw new Error('Countries 데이터를 불러오지 못했습니다.');

      // JSON 파싱
      const [
        overviewData,
        hourlyTrendData,
        topChannelsData,
        funnelData,
        platformData,
        clickFlowData,
        channelGroupsData,
        campaignsData,
        countriesData
      ] = await Promise.all([
        overviewRes.json(),
        hourlyTrendRes.json(),
        topChannelsRes.json(),
        funnelRes.json(),
        platformRes.json(),
        clickFlowRes.json(),
        channelGroupsRes.json(),
        campaignsRes.json(),
        countriesRes.json()
      ]);

      // 데이터 변환 및 매핑
      const transformedData: AcquisitionData = {
        // KPI 데이터는 별도로 처리
        hourlyTrendData: hourlyTrendData.map((item: any) => {
          // 데이터 검증 및 수정
          const newUsers = Number(item.new_users) || 0;
          const existingUsers = Number(item.existing_users) || 0;
          const reportedTotal = Number(item.total_users) || 0;
          
          // total_users가 new_users + existing_users와 일치하는지 확인
          const calculatedTotal = newUsers + existingUsers;
          const totalUsers = reportedTotal > 0 && Math.abs(reportedTotal - calculatedTotal) < 10 
            ? reportedTotal 
            : calculatedTotal;
          
          // 데이터 로깅 (문제 진단용)
          if (newUsers > totalUsers) {
            console.warn(`시간 ${item.hour}: 신규 사용자(${newUsers})가 전체 사용자(${totalUsers})보다 많음`);
          }
          
          return {
            hour: item.hour.padStart(2, '0'),
            total_users: totalUsers,
            new_users: newUsers,
            existing_users: existingUsers
          };
        }),
        topChannelData: topChannelsData.map((item: any) => ({
          channel: item.channel,
          users: item.users,
          clicks: item.clicks || 0,
        })),
        funnelData: funnelData.map((item: any) => ({
          stage: item.step,
          visitors: item.users,
          conversionRate: 0 // 백엔드에서 계산 필요
        })),
        deviceData: (() => {
          const totalDeviceUsers = platformData.device.reduce((sum: number, item: any) => sum + item.users, 0);
          return platformData.device.map((item: any) => ({
            name: item.type,
            value: item.users,
            percentage: totalDeviceUsers > 0 ? Math.round((item.users / totalDeviceUsers) * 100) : 0
          }));
        })(),
        browserData: (() => {
          const totalBrowserUsers = platformData.browser.reduce((sum: number, item: any) => sum + item.users, 0);
          const result = platformData.browser.map((item: any) => ({
            name: item.name,
            value: item.users,
            percentage: totalBrowserUsers > 0 ? Math.round((item.users / totalBrowserUsers) * 100) : 0
          }));
          return result;
        })(),
        clickFlowData: {
          nodes: [], // clickFlowData에서 노드 추출 로직 필요
          links: clickFlowData.map((item: any) => ({
            source: item.from,
            target: item.to,
            value: item.count
          }))
        },
        channelGroupData: channelGroupsData.map((item: any) => ({
          channel: item.channel,
          device: item.device,
          users: item.users,
          newUsers: item.users,
          sessions: item.users // 임시로 users 사용
        })),
        sessionData: campaignsData.map((item: any) => ({
          campaign: item.campaign,
          sessions: item.users,
          clicks: 0 // 백엔드에서 clicks 데이터 추가 필요
        })),
        realtimeData: {
          topCountries: countriesData.map((item: any) => {
            const key = Object.keys(item).find(k => k !== 'users');
            return {
              city: item[key ?? 'unknown'],
              users: item.users
            };
          })
        }
      };

      // KPI 데이터 저장 (별도 상태로 관리)
      setKpiData(overviewData);

      setAcquisitionData(transformedData);
      setRefreshKey(prev => prev + 1);

    } catch (err: any) {
      console.error('Acquisition 데이터 요청 실패:', err);
      setError(err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };
  */

  // 컴포넌트 마운트 시 Mock 데이터 로드
  useEffect(() => {
    // console.log('🚀 컴포넌트 마운트 - Mock 데이터 로딩');
    initializeMockData();
  }, []); // 마운트 시에만 실행

  // 날짜 범위나 필터 변경 시 KPI만 재시도
  useEffect(() => {
    // console.log('📅 날짜/필터 변경 - KPI 재시도');
    tryFetchRealKpiData();
  }, [dateRange, globalFilter]);

  // 주기적 KPI 갱신 (Mock 데이터는 건드리지 않음)
  useEffect(() => {
    const interval = setInterval(() => {
      // console.log('⏰ 주기적 KPI 갱신');
      tryFetchRealKpiData();
    }, 60000); // 1분마다 KPI만 시도
    return () => clearInterval(interval);
  }, []);

  // channelGroupData 로그 추가
  useEffect(() => {
    if (acquisitionData && acquisitionData.channelGroupData) {
      // console.log('[LOG] channelGroupData:', acquisitionData.channelGroupData);
    }
  }, [acquisitionData]);

  if (loading && !acquisitionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!acquisitionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex justify-end border-b-2 border-dashed">
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={(range) => setDateRange(range.map(r => ({ ...r, key: 'selection' })))}
          setTempRange={(range) => setTempRange(range.map(r => ({ ...r, key: 'selection' })))}
          setShowPicker={setShowPicker}
          onApply={(start, end) => {
            // console.log('📅 날짜 범위 적용:', start, end);
            setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
            // Mock 데이터는 그대로 유지, KPI만 새 날짜로 재시도 (useEffect에서 자동 처리)
          }}
        />
      </div>

      <div className="min-h-screen bg-gray-50 p-4 space-y-6">
        {/* 1행: KPI 카드 + 시간별 트렌드 + 전환율 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* KPI 카드 영역 (위아래로 쌓기) */}
          <div className="md:col-span-2 space-y-4 h-64">
            {/* 활성 사용자 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-[calc(50%-0.5rem)]">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">활성 사용자</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {kpiData ? kpiData.active_users?.toLocaleString() || '3,457' : '3,457'}
                </div>
                <div className="text-xs text-green-600">+8.2%</div>
              </div>
            </div>

            {/* 신규 유입 사용자 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-[calc(50%-0.5rem)]">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">신규 유입 사용자</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {kpiData ? kpiData.new_users?.toLocaleString() || '2,505' : '2,505'}
                </div>
                <div className="text-xs text-green-600">+12.5%</div>
              </div>
            </div>
          </div>

          {/* 시간별 유입 트렌드 */}
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-4 h-64">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">시간별 유입 트렌드</h3>
            <HourlyTrendLineChart data={acquisitionData.hourlyTrendData} refreshKey={refreshKey} />
          </div>

          {/* 첫 방문 전환율 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-64">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">첫 방문 전환율</h3>
            <FunnelConversionChart data={acquisitionData.funnelData} refreshKey={refreshKey} />
          </div>
        </div>

        {/* 2행: 상위 유입채널 + 신규 사용자 채널 + 유입 채널별 디바이스 비율 + 유입 플랫폼 분석 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 상위 유입채널 */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4 h-[320px] shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">상위 유입 채널</h3>
            <HorizontalBarChart
              data={acquisitionData.topChannelData.map((d:any, index: number)=>({label:d.channel,value:d.users, key: `${d.channel}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString() + '명'}
            />
          </div>

          {/* 신규 사용자 채널 */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4 h-[320px] shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">신규 사용자 채널</h4>
            <HorizontalBarChart
              data={(() => {
                // 채널별로 사용자 수 집계
                const channelTotals = acquisitionData.channelGroupData.reduce((acc: any, item: any) => {
                  if (!acc[item.channel]) {
                    acc[item.channel] = 0;
                  }
                  acc[item.channel] += item.users || 0;
                  return acc;
                }, {});
                
                // 상위 10개 채널 선택
                return Object.entries(channelTotals)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .slice(0, 10)
                  .map(([channel, users]: any, index: number) => ({
                    label: channel,
                    value: users,
                    key: `new-${channel}-${index}`
                  }));
              })()}
              valueFormatter={(v)=>v.toLocaleString()+'명'}
            />
          </div>

          {/* 유입 채널별 디바이스 비율 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-[320px]">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">유입 채널별 디바이스 비율</h3>
            <ChannelGroupStackedChart 
              data={acquisitionData.channelGroupData} 
              refreshKey={refreshKey} 
            />
          </div>

          {/* 유입 플랫폼 분석 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-[320px]">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">유입 플랫폼 분석</h3>
            <DeviceBrowserDonutChart 
              deviceData={acquisitionData.deviceData} 
              browserData={acquisitionData.browserData}
              refreshKey={refreshKey} 
            />
          </div>
        </div>

        {/* 3행: 마케팅 캠페인 유입 + 채널별 전환율 + 상위 지역 유입 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 마케팅 캠페인 유입 */}
          <div className="md:col-span-3 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">마케팅 캠페인 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.sessionData.slice(0,10).map((c:any, index: number)=>({label:c.campaign,value:c.sessions, key: `campaign-${c.campaign}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'회'}
            />
          </div>

          {/* 채널별 전환율 */}
          <div className="md:col-span-3">
            <ChannelConversionTable />
          </div>

          {/* 상위 지역 유입 */}
          <div className="md:col-span-3 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">상위 지역 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.realtimeData.topCountries.slice(0,10).map((c:any, index: number)=>({label:c.city,value:c.users, key: `country-${c.city}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'명'}
            />
          </div>
        </div>
      </div>
    </>
  );
}; 