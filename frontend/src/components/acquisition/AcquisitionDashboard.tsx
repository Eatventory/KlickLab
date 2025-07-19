import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Share2, MoreHorizontal, BarChart3, Target, Globe, Users, TrendingUp, Clock } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';

// 컴포넌트들 import
import HorizontalBarChart from '../HorizontalBarChart';
import { FunnelConversionChart } from './FunnelConversionChart';
import { DeviceBrowserDonutChart } from './DeviceBrowserDonutChart';
import { HourlyTrendLineChart } from './HourlyTrendLineChart';
import { ClickFlowSankeyChart } from './ClickFlowSankeyChart';
import { keyframes } from 'framer-motion';

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
}

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

  const fetchAcquisitionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");

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
        fetch(`/api/acquisition/overview?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/hourly-trend?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/top-channels?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/funnel-conversion?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/platform-analysis?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/click-flow?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/channel-groups?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/campaigns?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/acquisition/top-countries?${globalFilterString}`, { headers: { Authorization: `Bearer ${token}` } })
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
        hourlyTrendData: hourlyTrendData.map((item: any) => ({
          hour: item.hour,
          visitors: item.users
        })),
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
          console.log('[DEBUG] platformData.browser:', platformData.browser);
          const totalBrowserUsers = platformData.browser.reduce((sum: number, item: any) => sum + item.users, 0);
          console.log('[DEBUG] totalBrowserUsers:', totalBrowserUsers);
          const result = platformData.browser.map((item: any) => ({
            name: item.name,
            value: item.users,
            percentage: totalBrowserUsers > 0 ? Math.round((item.users / totalBrowserUsers) * 100) : 0
          }));
          console.log('[DEBUG] browserData result:', result);
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
            console.log('[Region Key]', key, '| item:', item);
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

  useEffect(() => {
    fetchAcquisitionData();
  }, [filters, JSON.stringify(globalFilter.conditions)]);

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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">획득 개요</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>최근 7일 대비 이전 기간</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-gray-600 hover:text-gray-900">
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-600 hover:text-gray-900">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-600 hover:text-gray-900">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 1행: KPI 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 활성 사용자 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-32 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">활성 사용자</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {kpiData ? kpiData.active_users?.toLocaleString() || '0' : '0'}
            </div>
            <div className="text-xs text-green-600">+8.2%</div>
          </div>

          {/* 신규 유입 사용자 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-32 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">신규 유입 사용자</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {kpiData ? kpiData.new_users?.toLocaleString() || '0' : '0'}
            </div>
            <div className="text-xs text-green-600">+12.5%</div>
          </div>

          {/* 실시간 사용자 */}
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-32 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">실시간 사용자</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {kpiData ? kpiData.realtime_users || '0' : '0'}
            </div>
            <div className="text-xs text-gray-500">지난 5분 기준</div>
          </div>
        </div>

        {/* 2행: 시간별 트렌드 + 전환율 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 bg-white rounded-lg border border-gray-200 p-4 h-64 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">시간별 유입 트렌드</h3>
            <HourlyTrendLineChart data={acquisitionData.hourlyTrendData} refreshKey={refreshKey} />
          </div>
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-4 h-64 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">첫 방문 전환율</h3>
            <FunnelConversionChart data={acquisitionData.funnelData} refreshKey={refreshKey} />
          </div>
        </div>

        {/* 3행: 상위 채널 + 플랫폼 분석 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">상위 유입 채널</h3>
            <HorizontalBarChart
              data={acquisitionData.topChannelData.map((d:any, index: number)=>({label:d.channel,value:d.users, key: `${d.channel}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString() + '명'}
            />
          </div>
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-4 h-[300px] hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">디바이스/브라우저 분석</h3>
            <DeviceBrowserDonutChart 
              deviceData={acquisitionData.deviceData} 
              browserData={acquisitionData.browserData}
              refreshKey={refreshKey} 
            />
          </div>
        </div>

        {/* 4행: 유입 흐름 + 채널 그룹 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-4 h-56 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">유입 흐름</h3>
            <ClickFlowSankeyChart data={acquisitionData.clickFlowData} refreshKey={refreshKey} />
          </div>
          <div className="md:col-span-6 bg-white rounded-lg border border-gray-200 p-4 h-56 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">채널 그룹 분석</h3>
            <div className="space-y-1 text-xs">
              {acquisitionData.channelGroupData.slice(0, 5).map((group, index) => (
                <div key={`${group.channel}-${group.device}-${index}`} className="flex justify-between">
                  <span>{group.channel} - {group.device}</span>
                  <span>{group.users}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 5행: 하단 상세 정보 3분할 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">신규 사용자 채널</h4>
            <HorizontalBarChart
              data={acquisitionData.channelGroupData.slice(0,10).map((c:any, index: number)=>({label:c.channel,value:c.newUsers, key: `new-${c.channel}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'명'}
            />
          </div>
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">마케팅 캠페인 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.sessionData.slice(0,10).map((c:any, index: number)=>({label:c.campaign,value:c.sessions, key: `campaign-${c.campaign}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'회'}
            />
          </div>
          <div className="md:col-span-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">상위 지역 유입</h4>
            <HorizontalBarChart
              data={acquisitionData.realtimeData.topCountries.slice(0,10).map((c:any, index: number)=>({label:c.city,value:c.users, key: `country-${c.city}-${index}`}))}
              valueFormatter={(v)=>v.toLocaleString()+'명'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 