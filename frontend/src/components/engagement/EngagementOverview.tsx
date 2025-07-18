import React from 'react';
import HorizontalBarChart from '../HorizontalBarChart';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartWrapper from '../ui/ChartWrapper';
import { getRangeLabel } from '../../utils/getRangeLabel';

interface PageTimeData {
  page: string;
  averageTime: number;
  visitCount: number;
}

interface PageViewCountsData {
  page: string;
  totalViews: number;
}

interface BounceRatesData {
  page_path: string;
  total_views: string;
  total_exits: string;
  bounce_rate: number;
}

interface ViewCountsData {
  date: string;
  totalViews: number;
}

interface ClickCountsData {
  date: string;
  totalClicks: number;
}

interface AvgSessionSecsData {
  date: string;
  avgSessionSeconds: number;
}

interface SessionsPerUsersData {
  date: string;
  totalVisitors: number;
  totalClicks: number;
  sessionsPerUser: number;
}

interface UsersOverTimeData {
  date: string;
  dailyUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
}

interface Props {
  avgSessionSecs: AvgSessionSecsData[];
  sessionsPerUsers: SessionsPerUsersData[];
  pageTimes: PageTimeData[];
  pageViewCounts: PageViewCountsData[];
  bounceRates: BounceRatesData[];
  viewCounts: ViewCountsData[];
  clickCounts: ClickCountsData[];
  usersOverTime: UsersOverTimeData[];
  selectedMetric: 'viewCounts' | 'clickCounts';
  selectedMetric2: 'avgSessionSecs' | 'sessionsPerUsers';
  setSelectedMetric: (key: 'viewCounts' | 'clickCounts') => void;
  setSelectedMetric2: (key: 'avgSessionSecs' | 'sessionsPerUsers') => void;
  isFirstLoad: boolean;
  dateRange: { startDate: Date; endDate: Date }[];
}

const EngagementOverview: React.FC<Props> = ({
  avgSessionSecs,
  sessionsPerUsers,
  pageTimes,
  pageViewCounts,
  bounceRates,
  viewCounts,
  clickCounts,
  usersOverTime,
  selectedMetric,
  selectedMetric2,
  setSelectedMetric,
  setSelectedMetric2,
  isFirstLoad,
  dateRange,
}) => {
  const rangeText = getRangeLabel(dateRange[0].startDate, dateRange[0].endDate);

  return (
    <div id="engagementOverview" className="space-y-8">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 pt-0 col-span-2">
          <ChartWrapper
            metrics={[
              { key: 'avgSessionSecs', label: '평균 온라인 세션 참여 시간',
                value: avgSessionSecs.length
                  ? `${(avgSessionSecs.reduce((acc, d) => acc + d.avgSessionSeconds, 0) / avgSessionSecs.length).toFixed(1)}초`
                  : '-'
              },
              { key: 'sessionsPerUsers', label: '활성 사용자 당 세션 수',
                value: sessionsPerUsers.length
                  ? `${(sessionsPerUsers.reduce((acc, d) => acc + d.sessionsPerUser, 0) / sessionsPerUsers.length).toFixed(1)}`
                  : '-' 
              },
            ]}
            selectedKey={selectedMetric2}
            onSelect={setSelectedMetric2}
          >
            <HorizontalLineChart
              data={(selectedMetric2 === 'avgSessionSecs' ? avgSessionSecs : sessionsPerUsers).map((d) => ({
                date: d.date,
                [selectedMetric2]: selectedMetric2 === 'avgSessionSecs' ? d.avgSessionSeconds : d.sessionsPerUser,
              }))}
              lines={[
                {
                  key: selectedMetric2,
                  name: selectedMetric2 === 'avgSessionSecs' ? '평균 세션 시간' : '세션/유저',
                }
              ]}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">
                    {selectedMetric2 === 'avgSessionSecs'
                      ? `${item[selectedMetric2].toFixed(1)}초`
                      : item[selectedMetric2].toFixed(1)}
                  </div>
                </div>
              )}
            />
          </ChartWrapper>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페이지 평균 체류시간</h2>
          </div>
          <HorizontalBarChart
            data={pageTimes.map((d) => ({ label: d.page, value: d.averageTime, raw: d }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">{rangeText}</div>
                <div className="text-xs font-semibold uppercase text-gray-600 mb-1">{item.label}</div>
                <div className="text-sm font-bold text-gray-900">
                  평균 체류시간 {item.value < 1 ? `${Math.round(item.value * 60)}초` : `${item.value.toFixed(1)}분`}
                </div>
              </>
            )}
            isLoading={isFirstLoad}
            valueFormatter={(val) => `${val.toFixed(1)}분`}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">페이지 별 조회수</h2>
          </div>
          <HorizontalBarChart
            data={pageViewCounts.map((d) => ({ label: d.page, value: d.totalViews, raw: d }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">{rangeText}</div>
                <div className="text-xs font-semibold uppercase text-gray-600 mb-1">{item.label}</div>
                <div className="text-sm font-bold text-gray-900">조회수 {item.value.toLocaleString()}회</div>
              </>
            )}
            isLoading={isFirstLoad}
            valueFormatter={(val) => `${val.toLocaleString()}회`}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">이탈률</h2>
          </div>
          <HorizontalBarChart
            data={bounceRates.map((item) => ({ label: item.page_path, value: item.bounce_rate, raw: item }))}
            tooltipRenderer={(item) => (
              <>
                <div className="text-sm text-gray-500 mb-1">{rangeText}</div>
                <div className="text-sm font-semibold uppercase text-gray-600 mb-1">{item.label}</div>
                <div className="text-md font-bold text-gray-900">이탈률 {item.value.toLocaleString()}%</div>
              </>
            )}
            isLoading={isFirstLoad}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 pt-0 col-span-2">
          <ChartWrapper
            metrics={[
              { key: 'viewCounts', label: '조회수', value: `${viewCounts.reduce((acc, d) => acc + d.totalViews, 0).toLocaleString()}` },
              { key: 'clickCounts', label: '클릭수', value: `${clickCounts.reduce((acc, d) => acc + d.totalClicks, 0).toLocaleString()}` },
            ]}
            selectedKey={selectedMetric}
            onSelect={setSelectedMetric}
          >
            <HorizontalLineChart
              data={(selectedMetric === 'viewCounts' ? viewCounts : clickCounts).map((d) => ({
                date: d.date,
                [selectedMetric]: selectedMetric === 'viewCounts' ? d.totalViews : d.totalClicks,
              }))}
              lines={[{ key: selectedMetric, name: selectedMetric === 'viewCounts' ? '조회수' : '클릭수' }]}
              tooltipRenderer={(item) => (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  <div className="font-bold text-gray-900">{item[selectedMetric].toLocaleString()}건</div>
                </div>
              )}
            />
          </ChartWrapper>
        </div>
      </div>
    </div>
  );
};

export default EngagementOverview;
