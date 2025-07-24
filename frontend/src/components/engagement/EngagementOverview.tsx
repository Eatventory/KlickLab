import React from 'react';
import HorizontalBarChart from '../HorizontalBarChart';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartWrapper from '../ui/ChartWrapper';
import { getRangeLabel } from '../../utils/getRangeLabel';

import type {
  PageTimeData,
  PageViewCountsData,
  BounceRatesData,
  ViewCountsData,
  ClickCountsData,
  AvgSessionSecsData,
  SessionsPerUsersData,
  UsersOverTimeData,

  RevisitData,
} from '../../data/engagementTypes';

interface Props {
  avgSessionSecs: AvgSessionSecsData[];
  sessionsPerUsers: SessionsPerUsersData[];
  pageTimes: PageTimeData[];
  pageViewCounts: PageViewCountsData[];
  bounceRates: BounceRatesData[];
  viewCounts: ViewCountsData[];
  clickCounts: ClickCountsData[];
  usersOverTime: UsersOverTimeData[];

  revisit: RevisitData[];
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

  revisit,
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
        <div className="custom-card col-span-2" style={{ paddingTop: 0 }}>
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

        <div className="custom-card">
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

        <div className="custom-card">
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

        <div className="custom-card">
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

        <div className="custom-card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">사용자 재방문</h2>
          </div>
          <HorizontalLineChart
            data={revisit.map((d) => ({
              date: d.date,
              dauWauRatio: d.dauWauRatio,
              dauMauRatio: d.dauMauRatio,
              wauMauRatio: d.wauMauRatio,
            }))}
            lines={[
              { key: 'wauMauRatio', name: 'WAU/MAU' },
              { key: 'dauMauRatio', name: 'DAU/MAU' },
              { key: 'dauWauRatio', name: 'DAU/WAU' },
            ]}
            tooltipRenderer={(item, hoveredLineKey) => (
              <div className="text-sm space-y-1 min-w-[120px]">
                <div className="text-gray-500">{item.date}</div>

                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'wauMauRatio' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#3b82f6]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-white mr-1" />
                  <span className="text-xs text-gray-700">WAU/MAU</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {(item.wauMauRatio * 100).toFixed(1)}%
                  </span>
                </div>

                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'dauMauRatio' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#22c55e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-white mr-1" />
                  <span className="text-xs text-gray-700">DAU/MAU</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {(item.dauMauRatio * 100).toFixed(1)}%
                  </span>
                </div>

                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'dauWauRatio' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#f97316]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] border border-white mr-1" />
                  <span className="text-xs text-gray-700">DAU/WAU</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {(item.dauWauRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          />
        </div>

        <div className="custom-card col-span-2" style={{ paddingTop: 0 }}>
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

        <div className="custom-card col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">시간 경과에 따른 사용자 활동</h2>
          </div>
          <HorizontalLineChart
            data={usersOverTime.map((d) => ({
              date: d.date,
              dailyUsers: d.dailyUsers,
              weeklyUsers: d.weeklyUsers,
              monthlyUsers: d.monthlyUsers,
            }))}
            lines={[
              { key: 'monthlyUsers', name: '30일' },
              { key: 'weeklyUsers', name: '7일' },
              { key: 'dailyUsers', name: '1일' },
            ]}
            showLegend={true}

            tooltipRenderer={(item, hoveredLineKey) => (
              <div className="text-sm space-y-1 min-w-[120px]">
                <div className="text-gray-500">{item.date}</div>
            
                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'monthlyUsers' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#3b82f6]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-white mr-1" />
                  <span className="text-xs text-gray-700">30일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.monthlyUsers.toLocaleString()}
                  </span>
                </div>

            
                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'weeklyUsers' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#22c55e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-white mr-1" />
                  <span className="text-xs text-gray-700">7일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.weeklyUsers.toLocaleString()}
                  </span>
                </div>

            
                <div
                  className="flex items-center"
                  style={{ opacity: hoveredLineKey && hoveredLineKey !== 'dailyUsers' ? 0.3 : 1 }}
                >
                  <span className="w-2 h-0.5 bg-[#f97316]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] border border-white mr-1" />
                  <span className="text-xs text-gray-700">1일</span>
                  <span className="ml-auto font-bold text-right text-gray-900">
                    {item.dailyUsers.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            legendTooltipRenderer={(item, key) => (
              <div>
                <div className="text-gray-500 text-xs">{item.date}</div>
                <div className="text-xs text-gray-700">{key === "monthlyUsers" ? "30일" : key === "weeklyUsers" ? "7일" : "1일"}</div>
                <div className="font-bold text-gray-900">
                  {typeof item[key] === 'number' ? item[key].toLocaleString() : '-'}
                </div>
              </div>
            )}
          />
        </div>

        {/* <div className="custom-card">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">TBD</h2>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default EngagementOverview;
