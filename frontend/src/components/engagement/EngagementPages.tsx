import React from 'react';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartTableWrapper from '../ui/ChartTableWrapper';
import type { PageStatsData } from '../../data/engagementTypes';

interface EngagementPagesProps {
  pageStats: PageStatsData[];
}

const EngagementPages: React.FC<EngagementPagesProps> = ({ pageStats }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6" id="engagementPages">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          시간 경과에 따른 페이지 경로 조회수
        </h2>
      </div>

      <ChartTableWrapper
        data={(() => {
          const map: Record<string, { pageViews: number; activeUsers: number; totalEvents: number; totalEngagementTime: number }> = {};
          pageStats
            .filter(({ pagePath }) => pagePath !== '')
            .forEach(({ pagePath, pageViews, activeUsers, avgEngagementTimeSec, totalEvents }) => {
              if (!map[pagePath]) {
                map[pagePath] = { pageViews: 0, activeUsers: 0, totalEvents: 0, totalEngagementTime: 0 };
              }
              map[pagePath].pageViews += pageViews;
              map[pagePath].activeUsers += activeUsers;
              map[pagePath].totalEvents += totalEvents;
              map[pagePath].totalEngagementTime += avgEngagementTimeSec * activeUsers;
            });

          return Object.entries(map).map(([pagePath, { pageViews, activeUsers, totalEvents, totalEngagementTime }]) => {
            const pageviewsPerUser = activeUsers ? pageViews / activeUsers : 0;
            const avgEngagementTimeSec = activeUsers ? totalEngagementTime / activeUsers : 0;
            return {
              key: pagePath,
              label: pagePath,
              values: {
                pageViews,
                activeUsers,
                pageviewsPerUser,
                avgEngagementTimeSec,
                totalEvents,
              },
            };
          });
        })()}
        valueKeys={[
          { key: 'pageViews', label: '조회수', showPercent: true },
          { key: 'activeUsers', label: '활성 사용자', showPercent: true },
          { key: 'pageviewsPerUser', label: '사용자당 조회수' },
          { key: 'avgEngagementTimeSec', label: '평균 참여 시간(초)' },
          { key: 'totalEvents', label: '이벤트 수' },
        ]}
        autoSelectBy="pageViews"
        title="페이지 경로"
      >
        {(selectedKeys, chartData, lineDefs) => (
          <HorizontalLineChart
            data={(() => {
              const uniqueDates = [...new Set(pageStats.map(d => d.date))].sort();
              return uniqueDates.map(date => {
                const row: Record<string, any> = { date };
                let sum = 0;
                selectedKeys.forEach(path => {
                  const match = pageStats.find(d => d.date === date && d.pagePath === path);
                  const val = match?.pageViews || 0;
                  row[path] = val;
                  sum += val;
                });
                row['SUM'] = sum;
                return row;
              });
            })()}
            lines={[
              ...selectedKeys
                .filter(k => k !== 'SUM')
                .map(k => ({ key: k, name: k })),
              ...(selectedKeys.includes('SUM')
                ? [{ key: 'SUM', name: '합계', color: '#2596be', dash: '3 3' }]
                : []),
            ]}
            areas={
              selectedKeys.includes('SUM')
                ? [{ key: 'SUM', name: '합계', color: '#2596be' }]
                : []
            }
            height={400}
            tooltipRenderer={(item, hoveredLineKey) => {
              const sortedKeys = selectedKeys
                .filter(key => item[key] !== undefined)
                .sort((a, b) => {
                  if (a === 'SUM') return -1;
                  if (b === 'SUM') return 1;
                  return (item[b] ?? 0) - (item[a] ?? 0);
                });
              const colors = ['#3b82f6', '#10b981', '#f97316', '#6366f1', '#ef4444', '#2596be'];

              return (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  {sortedKeys.map(key => {
                    const colorIndex = key === 'SUM'
                      ? colors.length - 1
                      : selectedKeys.indexOf(key);
                    const color = colors[colorIndex] || '#999';
                    return (
                      <div
                        className="flex items-center"
                        key={key}
                        style={{ opacity: hoveredLineKey && hoveredLineKey !== key ? 0.3 : 1 }}
                      >
                        <span className="w-2 h-0.5" style={{ backgroundColor: color }} />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white mr-1"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-gray-700 mr-1">
                          {key === 'SUM' ? '합계' : key}
                        </span>
                        <span className="ml-auto font-bold text-right text-gray-900">
                          {item[key].toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        )}
      </ChartTableWrapper>
    </div>
  );
};

export default EngagementPages;
