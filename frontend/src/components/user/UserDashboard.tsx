import React, { useState } from 'react';
import { UserPathSankeyChart } from './UserPathSankeyChart';
import { Users, Route, PieChart } from 'lucide-react';
import { UserSegmentPieChart } from './UserSegmentPieChart';
import { userSegmentData } from '../../data/mockData';
import { OsBrowserPieChart } from './OsBrowserPieChart';
import { OsBrowserTable } from './OsBrowserTable';
import { osDistributionData, browserDistributionData } from '../../data/mockData';
import { OsFilterDropdown } from './OsFilterDropdown';
import { SegmentGroupCard } from './SegmentGroupCard';
import { TopButtonList, type SegmentType } from './TopButtonList';
import { 
  genderSegmentGroupData, 
  ageSegmentGroupData, 
  signupPathSegmentGroupData, 
  deviceSegmentGroupData 
} from '../../data/mockData';

// 타입 정의
interface FilterOptions {
  period: '5min' | '1hour' | '1day' | '1week';
  userType: 'all' | 'new' | 'returning';
  device: 'all' | 'mobile' | 'desktop';
}

// 범례 버튼 렌더링 함수
const renderLegendButtons = (
  data: { label: string; value: number }[],
  activeLegends: string[],
  handleLegendClick: (label: string) => void,
  colors: string[]
) => (
  <div className="flex flex-col gap-2 ml-8">
    {data.map((d, i) => (
      <button
        key={d.label}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm border ${activeLegends.includes(d.label) ? 'bg-gray-100 border-blue-500' : 'bg-white border-gray-300 text-gray-400'}`}
        onClick={() => handleLegendClick(d.label)}
        type="button"
      >
        <span style={{ width: 12, height: 12, background: colors[i % colors.length], display: 'inline-block', borderRadius: 6 }} />
        {d.label}
      </button>
    ))}
  </div>
);

const COLORS = ['#4F46E5', '#F59E42', '#10B981', '#6366F1', '#F43F5E', '#FACC15', '#A3A3A3'];

export const UserDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    period: '1day',
    userType: 'all',
    device: 'all'
  });

  const [distType, setDistType] = useState<'os' | 'browser'>('os');
  
  // 세그먼트별 TOP 3 상태
  const [activeSegment, setActiveSegment] = useState<SegmentType>('gender');

  // OS 필터 상태
  const [osFilter, setOsFilter] = useState<{ mainCategory: 'all' | 'mobile' | 'desktop' }>({ mainCategory: 'all' });
  // 브라우저 필터 상태
  const [browserFilter, setBrowserFilter] = useState<{ mainCategory: 'all' | 'mobile' | 'desktop' }>({ mainCategory: 'all' });

  // OS 필터링 데이터
  const filteredOsData = osDistributionData.filter(d => {
    if (osFilter.mainCategory === 'all') return true;
    return d.category === osFilter.mainCategory;
  });
  const osPieData = filteredOsData.map(d => ({ label: d.os, value: d.users }));

  // 브라우저 필터링 데이터
  const filteredBrowserData = browserDistributionData.filter(d => {
    if (browserFilter.mainCategory === 'all') return true;
    return d.category === browserFilter.mainCategory;
  });
  const browserPieData = filteredBrowserData.map(d => ({ label: d.browser, value: d.users }));

  // 범례 필터링 상태 관리
  const [osActiveLegends, setOsActiveLegends] = useState(osPieData.map(d => d.label));
  const [browserActiveLegends, setBrowserActiveLegends] = useState(browserPieData.map(d => d.label));

  // 범례 클릭 핸들러
  const handleLegendClick = (type: 'os' | 'browser', label: string) => {
    if (type === 'os') {
      setOsActiveLegends(prev => {
        if (prev.length === 1 && prev[0] === label) return prev; // 최소 1개 유지
        return prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label];
      });
    } else {
      setBrowserActiveLegends(prev => {
        if (prev.length === 1 && prev[0] === label) return prev; // 최소 1개 유지
        return prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label];
      });
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 드롭다운 핸들러 타입 명확화
  const handleOsFilterChange = (key: keyof typeof osFilter, value: string) => {
    setOsFilter(f => ({ ...f, [key]: value as 'all' | 'mobile' | 'desktop' }));
  };
  const handleBrowserFilterChange = (key: keyof typeof browserFilter, value: string) => {
    setBrowserFilter(f => ({ ...f, [key]: value as 'all' | 'mobile' | 'desktop' }));
  };

  // 세그먼트별 데이터 가져오기
  const getSegmentData = (segment: SegmentType) => {
    switch (segment) {
      case 'gender':
        return genderSegmentGroupData;
      case 'age':
        return ageSegmentGroupData;
      case 'signupPath':
        return signupPathSegmentGroupData;
      case 'device':
        return deviceSegmentGroupData;
      default:
        return genderSegmentGroupData;
    }
  };

  const currentSegmentData = getSegmentData(activeSegment);

  return (
    <div className="space-y-8">
      {/* 세그먼트별 TOP 3 필터 */}
      <TopButtonList 
        activeSegment={activeSegment} 
        onSegmentChange={setActiveSegment} 
      />

      {/* 세그먼트별 TOP 3 사용자 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {activeSegment === 'gender' && '성별별 클릭 TOP 3'}
            {activeSegment === 'age' && '연령대별 클릭 TOP 3'}
            {activeSegment === 'signupPath' && '가입 경로별 클릭 TOP 3'}
            {activeSegment === 'device' && '기기별 클릭 TOP 3'}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentSegmentData.map((segment, index) => (
            <SegmentGroupCard 
              key={segment.segmentValue} 
              segment={segment} 
              rank={index + 1} 
              segmentType={activeSegment}
            />
          ))}
        </div>
      </div>

      {/* 기존 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">사용자 분석 필터</h2>
        </div>
        <div className="flex gap-4">
          <select 
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="5min">최근 5분</option>
            <option value="1hour">최근 1시간</option>
            <option value="1day">최근 1일</option>
            <option value="1week">최근 1주</option>
          </select>
          <select 
            value={filters.userType}
            onChange={(e) => handleFilterChange('userType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 사용자</option>
            <option value="new">신규 사용자</option>
            <option value="returning">재방문자</option>
          </select>
          <select 
            value={filters.device}
            onChange={(e) => handleFilterChange('device', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체 기기</option>
            <option value="mobile">모바일</option>
            <option value="desktop">데스크탑</option>
          </select>
        </div>
      </div>

      {/* 유저 클릭 흐름 Sankey */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">사용자 클릭 흐름 분석</h2>
        </div>
        <UserPathSankeyChart />
      </div>

      {/* 향후 구현 예정 컴포넌트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-8">
        {/* 재방문률 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">재방문률</h3>
          </div>
          <div className="flex items-center justify-center h-40 text-gray-500">
            개발 중...
          </div>
        </div>
        {/* 신규 vs 기존 유저 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">신규 vs 기존 유저</h3>
          </div>
          <div className="flex items-center justify-center h-40">
            <UserSegmentPieChart data={userSegmentData} />
          </div>
        </div>
      </div>

      {/* 기기/브라우저 분포 전체를 grid로 감싸기 */}
      <div className="grid grid-cols-1 gap-y-12 w-full">
        {/* 기기 분포 (운영체제) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full max-w-full">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">기기 분포 (운영체제)</h3>
          </div>
          <div className="flex flex-col w-full">
            {/* 파이차트+범례 가로 배치 */}
            <div className="relative flex flex-row items-start w-full min-h-[320px]">
              {/* 파이차트 */}
              <div className="flex flex-col items-center min-w-[180px] max-w-[320px] w-full mx-auto">
                <OsFilterDropdown filters={osFilter} onFilterChange={handleOsFilterChange} />
                <div className="mt-2">
                  <OsBrowserPieChart data={osPieData.filter(d => osActiveLegends.includes(d.label))} legendType="os" />
                </div>
              </div>
              {/* 범례(버튼) */}
              <div className="flex flex-col justify-center min-w-[100px] max-w-[160px] items-center absolute right-0 top-0">
                {renderLegendButtons(osPieData, osActiveLegends, label => handleLegendClick('os', label), COLORS)}
              </div>
            </div>
            {/* 테이블은 아래에 */}
            <div className="flex-1 w-full min-w-0 max-w-full overflow-x-auto mt-4">
              <OsBrowserTable data={osPieData} legendType="os" activeLegends={osActiveLegends} />
            </div>
          </div>
        </div>
        {/* 브라우저 분포 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full max-w-full">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">브라우저 분포</h3>
          </div>
          <div className="flex flex-col w-full">
            {/* 파이차트+범례 가로 배치 */}
            <div className="relative flex flex-row items-start w-full min-h-[320px]">
              {/* 파이차트 */}
              <div className="flex flex-col items-center min-w-[180px] max-w-[320px] w-full mx-auto">
                <OsFilterDropdown filters={browserFilter} onFilterChange={handleBrowserFilterChange} />
                <div className="mt-2">
                  <OsBrowserPieChart data={browserPieData.filter(d => browserActiveLegends.includes(d.label))} legendType="browser" />
                </div>
              </div>
              {/* 범례(버튼) */}
              <div className="flex flex-col justify-center min-w-[100px] max-w-[160px] items-center absolute right-0 top-0">
                {renderLegendButtons(browserPieData, browserActiveLegends, label => handleLegendClick('browser', label), COLORS)}
              </div>
            </div>
            {/* 테이블은 아래에 */}
            <div className="flex-1 w-full min-w-0 max-w-full overflow-x-auto mt-4">
              <OsBrowserTable data={browserPieData} legendType="browser" activeLegends={browserActiveLegends} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 