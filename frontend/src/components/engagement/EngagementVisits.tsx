import React, { useState } from 'react';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartTableWrapper from '../ui/ChartTableWrapper';
import type { VisitStatsData } from '../../data/engagementTypes';

interface EngagementVisitsProps {
  visitStats: VisitStatsData[];
}

const keys = ['sessions', 'activeUsers', 'newVisitors', 'avgSessionSeconds'];
const labels = ['세션 수', '활성 사용자', '새 사용자 수', '평균 세션 참여 시간'];
const valueKeys = [
  { key: keys[0], label: labels[0], showPercent: true },
  { key: keys[1], label: labels[1], showPercent: true },
  { key: keys[2], label: labels[2], showPercent: true },
  { key: keys[3], label: labels[3] }
];
const getKeyIndex = (k: string) => (keys.indexOf(k) >= 0 ? keys.indexOf(k) : 0);

const EngagementVisits: React.FC<EngagementVisitsProps> = ({ visitStats }) => {
  const [sortKey, setSortKey] = useState<string>(keys[0]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6" id="engagementVisits">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          시간 경과에 따른 방문 페이지별 {labels[getKeyIndex(sortKey)]}
        </h2>
      </div>

      <ChartTableWrapper
        data={(() => {
          const map: Record<
            string,
            { sessions: number; activeUsers: number; newVisitors: number; weightedSum: number; totalSessions: number }
          > = {};

          visitStats.forEach(({ pagePath, sessions, activeUsers, newVisitors, avgSessionSeconds }) => {
            if (!map[pagePath]) {
              map[pagePath] = { sessions: 0, activeUsers: 0, newVisitors: 0, weightedSum: 0, totalSessions: 0 };
            }
            map[pagePath].sessions += sessions;
            map[pagePath].activeUsers += activeUsers;
            map[pagePath].newVisitors += newVisitors;
            map[pagePath].weightedSum += avgSessionSeconds * sessions;
            map[pagePath].totalSessions += sessions;
          });

          return Object.entries(map).map(([pagePath, { sessions, activeUsers, newVisitors, weightedSum, totalSessions }]) => {
            const avg = totalSessions ? weightedSum / totalSessions : 0;
            return {
              key: pagePath,
              label: pagePath,
              values: { sessions, activeUsers, newVisitors, avgSessionSeconds: avg }
            };
          });
        })()}
        valueKeys={valueKeys}
        autoSelectBy={keys[0]}
        title="페이지 경로"
        onSortChange={(KEY) => setSortKey(KEY)}
      >
        {(selectedKeys, chartData, lineDefs, unit) => (
          <HorizontalLineChart
            data={(() => {
              const uniqueDates = [...new Set(visitStats.map(d => d.date))].sort();
              return uniqueDates.map(date => {
                const row: Record<string, any> = { date };
                let sum = 0;

                selectedKeys.forEach(path => {
                  const match = visitStats.find(d => d.date === date && d.pagePath === path);
                  const val = match ? (match[sortKey as keyof VisitStatsData] as number) : 0;
                  row[path] = val;
                  sum += val;
                });

                row['SUM'] = sum;
                return row;
              });
            })()}
            lines={[
              ...selectedKeys.filter(k => k !== 'SUM').map(k => ({ key: k, name: k })),
              ...(selectedKeys.includes('SUM')
                ? [{ key: 'SUM', name: '합계', color: '#2596be', dash: '3 3' }]
                : [])
            ]}
            areas={
              selectedKeys.includes('SUM')
                ? [{ key: 'SUM', name: '합계', color: '#2596be' }]
                : []
            }
            height={400}
            unit={unit}
            showLegendBottom={true}
            tooltipRenderer={(item, hoveredLineKey) => {
              const sortedKeys = selectedKeys
                .filter(k => item[k] !== undefined)
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
                    const colorIndex = key === 'SUM' ? colors.length - 1 : selectedKeys.indexOf(key);
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
                        <span className="text-xs text-gray-700 mr-1">{key === 'SUM' ? '합계' : key}</span>
                        <span className="ml-auto font-bold text-gray-900">{(item[key] as number).toLocaleString()}</span>
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

export default EngagementVisits;
