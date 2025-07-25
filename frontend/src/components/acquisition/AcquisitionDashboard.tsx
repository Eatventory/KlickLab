import React, { useState, useEffect } from 'react';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
// import { Calendar, Settings, Share2, MoreHorizontal, BarChart3, Target, Globe, Users, TrendingUp, Clock } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';
import { REGION_MAPPING } from '../../utils/regionUtils';
import DateRangeSelector from '../ui/DateRangeSelector';

// 컴포넌트들 import
import HorizontalBarChart from '../../components/HorizontalBarChart';
// import { FunnelConversionChart } from './FunnelConversionChart';
import { DeviceBrowserDonutChart } from './DeviceBrowserDonutChart';
import { HourlyTrendLineChart } from './HourlyTrendLineChart';
// import { ClickFlowSankeyChart } from './ClickFlowSankeyChart';
import { ChannelGroupStackedChart } from './ChannelGroupStackedChart';
import { TopLandingPages } from './TopLandingPages';
// import { keyframes } from 'framer-motion';
// import { ConversionRateWidget } from '../conversion/ConversionRateWidget';
// import { ConversionSummaryCard } from '../ConversionSummaryCard';
import { ChannelConversionTable } from '../traffic/ChannelConversionTable';
// import { RealtimeUsersSection } from '../overview/RealtimeUsersSection';
// import { LandingConversionTable } from '../traffic/LandingConversionTable';

// 타입 정의
// interface FilterOptions {
//   period: '1hour' | '1day' | '1week' | '1month';
//   source: 'all' | 'organic' | 'direct' | 'social' | 'referral';
//   device: 'all' | 'mobile' | 'desktop';
// }

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
  landingPagesData: any[];
  channelGroupData: any[];
  sessionData: any[];
  realtimeData: {
    topCountries: any[];
  };
}

export const AcquisitionDashboard: React.FC = () => {
  const { filter: globalFilter } = useSegmentFilter();
  // const [filters, setFilters] = useState<FilterOptions>({
  //   period: '1day',
  //   source: 'all',
  //   device: 'all'
  // });

  const [acquisitionData, setAcquisitionData] = useState<AcquisitionData | null>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 실시간 사용자 데이터 상태
  const [realtimeUsers, setRealtimeUsers] = useState<number>(0);
  const [realtimeTrend, setRealtimeTrend] = useState<any[]>([]);
  const [realtimeLocations, setRealtimeLocations] = useState<any[]>([]);
  const [realtimeLoading, setRealtimeLoading] = useState<boolean>(false);

  // DateRangeSelector 상태 추가
  const [dateRange, setDateRange] = useState([
    { startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }
  ]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

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
      // console.log('[SDK_KEY CHECK] Bearer Token:', token);
      // try {
      //   const payload = JSON.parse(atob(token.split('.')[1]));
      //   console.log('[Decoded SDK Key]', payload.sdk_key || payload.sub || 'N/A');
      // } catch (err) {
      //   console.warn('[SDK_KEY CHECK] 토큰 디코딩 실패:', err);
      // }

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
        landingPagesRes,
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
        fetch(`/api/acquisition/landing-pages?${dateQuery}${globalFilterQuery}`, { headers: { Authorization: `Bearer ${token}` } }),
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
      if (!landingPagesRes.ok) throw new Error('Landing Pages 데이터를 불러오지 못했습니다.');
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
        landingPagesData,
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
        landingPagesRes.json(),
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
        landingPagesData: landingPagesData.map((item: any) => ({
          page: item.page,
          sessions: item.sessions,
          users: item.users,
          engagement_rate: item.engagement_rate,
          conversion_rate: item.conversion_rate,
          bounce_rate: item.bounce_rate
        })),
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

  // 실시간 사용자 데이터 가져오기
  const fetchRealtimeData = async () => {
    try {
      setRealtimeLoading(true);
      
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

      const response = await fetch('/api/overview/realtime', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('실시간 데이터를 불러올 수 없습니다.');
      
      const result = await response.json();
      
      if (result.data) {
        // console.log('[REALTIME DEBUG] Frontend received data:', result.data);
        setRealtimeUsers(result.data.activeUsers30min || 0);
        setRealtimeTrend(result.data.trend || []);
        setRealtimeLocations(result.data.topLocations || []);
        // console.log('[REALTIME DEBUG] Frontend state set:', {
        //   users: result.data.activeUsers30min || 0,
        //   trendLength: (result.data.trend || []).length,
        //   locationsLength: (result.data.topLocations || []).length
        // });
      }
    } catch (err) {
      console.error('실시간 데이터 fetch 오류:', err);
      // 에러 시 기본값 설정
      setRealtimeUsers(0);
      setRealtimeTrend([]);
      setRealtimeLocations([]);
    } finally {
      setRealtimeLoading(false);
    }
  };

  useEffect(() => {
    const { startDate, endDate } = dateRange[0];
    if (startDate && endDate) {
      fetchAcquisitionData(startDate, endDate);
    }

    const interval = setInterval(() => {
      const { startDate, endDate } = dateRange[0];
      if (startDate && endDate) {
        fetchAcquisitionData(startDate, endDate);
      }
    }, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [dateRange]);

  // 실시간 데이터를 주기적으로 가져오기
  useEffect(() => {
    fetchRealtimeData(); // 초기 로드
    
    const realtimeInterval = setInterval(() => {
      fetchRealtimeData();
    }, 30000); // 30초마다 갱신
    
    return () => clearInterval(realtimeInterval);
  }, []);

  // landingPagesData 로그 추가
  useEffect(() => {
    if (acquisitionData && acquisitionData.landingPagesData) {
      // console.log('[LOG] landingPagesData:', acquisitionData.landingPagesData);
    }
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
            setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
            fetchAcquisitionData(start, end);
          }}
        />
      </div>

      <div className="min-h-screen bg-gray-50 p-4 space-y-6">
        {/* 1행: KPI 카드 + 시간별 트렌드 + 전환율 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* KPI 카드 영역 (위아래로 쌓기) */}
          <div className="md:col-span-2 space-y-4 h-64">
            {/* 유입 사용자 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">유입 사용자</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {kpiData ? kpiData.active_users?.toLocaleString() || '0' : '0'}
                </div>
                <div className="text-xs text-green-600">+8.2%</div>
              </div>
            </div>

            {/* 직접 유입 비율 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-[calc(50%-0.5rem)]">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">직접 유입 비율</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {kpiData ? `${kpiData.direct_traffic_rate || kpiData.bounceRate || 0}%` : '0%'}
                </div>
                <div className="text-xs text-green-600">+8.7%</div>
              </div>
            </div>
          </div>

          {/* 시간별 유입 트렌드 */}
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-4 h-64">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">시간별 유입 트렌드</h3>
            <HourlyTrendLineChart data={acquisitionData.hourlyTrendData} refreshKey={refreshKey} />
          </div>

          {/* 30분간 활성 사용자 */}
          <div className="md:col-span-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-64 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="mb-2">
                  <h2 className="text-sm font-semibold text-gray-800 mb-1">실시간 활성 사용자</h2>
                  <div className="text-lg font-bold text-blue-600">
                    {realtimeUsers.toLocaleString()}명
                  </div>
                  <p className="text-xs text-gray-500">최근 30분간 활성 사용자</p>
                </div>
                
                {/* 실시간 차트 - 높이 조정 */}
                <div className="flex-1 min-h-0">
                  <div className="h-full flex items-end gap-0.5">
                    {realtimeTrend.map((d, i) => {
                      const maxUsers = Math.max(...realtimeTrend.map((item) => item.users), 1);
                      const barHeight = maxUsers > 0 ? (d.users / maxUsers) * 100 : 0;
                      return (
                        <div
                          key={i}
                          style={{ height: `${Math.max(barHeight, 2)}%` }}
                          className="flex-1 bg-blue-400 rounded-t cursor-pointer hover:bg-blue-600 transition-colors"
                          title={`${d.users}명`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2행: 상위 유입채널 + 신규 사용자 채널 + 유입 채널별 디바이스 비율 + 유입 플랫폼 분석 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 상위 유입채널 */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4 h-[320px] shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">상위 유입 채널</h3>
            <HorizontalBarChart
              data={acquisitionData.topChannelData.slice(0, 5).map((d:any, index: number)=>({label:d.channel,value:d.users, key: `${d.channel}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString() + '명'}
            />
          </div>

          {/* 상위 방문 페이지 */}
          <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4 h-[320px] shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">상위 방문 페이지</h4>
            <div className="h-[280px]">
              <TopLandingPages 
                data={acquisitionData.landingPagesData} 
                refreshKey={refreshKey} 
              />
            </div>
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

        {/* 3행: 마케팅 캠페인 유입 + 상위 지역 유입 + 전환율 표 2개 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 마케팅 캠페인 유입 */}
          <div className="md:col-span-3 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">마케팅 캠페인 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.sessionData.slice(0, 5).map((c:any, index: number)=>({label:c.campaign,value:c.sessions, key: `campaign-${c.campaign}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'회'}
            />
          </div>

          {/* 채널별 전환율 */}
          <div className="md:col-span-3">
            <ChannelConversionTable dateRange={dateRange[0]} />
          </div>

          {/* 상위 지역 유입 */}
          <div className="md:col-span-3 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">상위 지역 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.realtimeData.topCountries.slice(0, 5).map((c:any, index: number)=>({
                label:REGION_MAPPING[c.city],
                value:c.users,
                key: `country-${c.city}-${index}`
              }))}
              valueFormatter={(v)=>v.toLocaleString()+'명'}
            />
          </div>
        </div>
      </div>
    </>
  );
}; 