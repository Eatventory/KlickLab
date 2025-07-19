import React, { useState } from 'react';
import HorizontalLineChart from '../HorizontalLineChart';
import ChartTableWrapper from '../ui/ChartTableWrapper';
import type { EventCountsData } from '../../data/engagementTypes';

interface EngagementEventsProps {
  eventCounts: EventCountsData[];
}

const keys = ['eventCount', 'userCount', 'avgEventPerUser'];
const labels = ['이벤트 수', '총 사용자', '사용자당 평균 이벤트 수'];
const valueKeys = [
  { key: keys[0], label: labels[0], showPercent: true },
  { key: keys[1], label: labels[1], showPercent: true },
  { key: keys[2], label: labels[2] },
];
const getKeyIndex = (k: string) => keys.indexOf(k) >= 0 ? keys.indexOf(k) : 0;

const EngagementEvents: React.FC<EngagementEventsProps> = ({ eventCounts }) => {
  const [sortKey, setSortKey] = useState<string>(keys[0]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6" id="engagementEvents">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          시간 경과에 따른 이벤트 이름별 활성 사용자당 {labels[getKeyIndex(sortKey)]}
        </h2>
      </div>
      <ChartTableWrapper
        data={(() => {
          const map: Record<string, { eventCount: number; userCount: number }> = {};
          eventCounts
            .filter(({ eventName }) => eventName !== '')
            .forEach(({ eventName, eventCount, userCount }) => {
            if (!map[eventName]) {
              map[eventName] = { eventCount: 0, userCount: 0 };
            }
            map[eventName].eventCount += eventCount;
            map[eventName].userCount += userCount;
          });
          return Object.entries(map).map(([eventName, { eventCount, userCount }]) => {
            const avg = userCount ? eventCount / userCount : 0;
            return {
              key: eventName,
              label: eventName,
              values: {
                eventCount,
                userCount,
                avgEventPerUser: avg,
              },
            };
          });
        })()}
        valueKeys={valueKeys}
        autoSelectBy={keys[0]}
        title="이벤트 이름"
        onSortChange={(KEY) => {
          setSortKey(KEY);
        }}
      >
        {(selectedKeys) => (
          <HorizontalLineChart
            data={(() => {
              const uniqueDates = [...new Set(eventCounts.map(d => d.date))].sort();
              return uniqueDates.map(date => {
                const row: Record<string, any> = { date };
                let sum = 0;
                selectedKeys.forEach(event => {
                  const match = eventCounts.find(d => d.date === date && d.eventName === event);
                  const val = match
                    ? {
                        [keys[0]]: match.eventCount,
                        [keys[1]]: match.userCount,
                        [keys[2]]: match.avgEventPerUser ?? 0,
                      }[sortKey] ?? 0
                    : 0;
                  row[event] = val;
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
                .filter((key) => item[key] !== undefined)
                .sort((a, b) => {
                  if (a === 'SUM') return -1;
                  if (b === 'SUM') return 1;
                  return (item[b] ?? 0) - (item[a] ?? 0);
                });
              const colors = ['#3b82f6', '#10b981', '#f97316', '#6366f1', '#ef4444', '#2596be'];
              return (
                <div className="text-sm">
                  <div className="text-gray-500">{item.date}</div>
                  {sortedKeys.map((key) => {
                    const colorIndex =
                      key === 'SUM' ? colors.length - 1 : selectedKeys.indexOf(key);
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

export default EngagementEvents;
