import React from 'react';
import { TopClicks } from './TopClicks';
import { PieChart, Globe, MousePointer } from 'lucide-react';
import { useOverviewWidgets } from '../../hooks/useOverviewWidgets';

// 위젯의 기본 프레임을 위한 컴포넌트
const WidgetFrame = ({ title, children, icon: Icon }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-gray-500" />}
      <h2 className="text-base md:text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="flex-grow">{children}</div>
  </div>
);

// 간단한 목록 표시를 위한 컴포넌트 (예: 상위 페이지)
const SimpleTable = ({ data, columns, loading, showBar }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
        <div className="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 animate-pulse rounded w-3/5"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-gray-400 text-sm">데이터가 없습니다</div>
    );
  }

  const maxValue = Math.max(...data.map(item => item[columns[1].key]), 1);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 font-semibold text-sm text-gray-500">
        <span className="truncate">{columns[0].label}</span>
        <span className="text-right truncate">{columns[1].label}</span>
      </div>
      {data.map((item, index) => (
        <div key={index} className="grid grid-cols-2 text-sm text-gray-700 border-t pt-2 items-center">
          <span className="truncate overflow-hidden whitespace-nowrap" title={item[columns[0].key]}>{item[columns[0].key]}</span>
          <span className="text-right font-medium flex items-center gap-2 justify-end">
            {showBar && (
              <div className="bg-blue-100 rounded h-2 w-20 mr-2 relative">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${(item[columns[1].key] / maxValue) * 100}%` }}
                />
              </div>
            )}
            <span className="truncate max-w-[120px] overflow-hidden whitespace-nowrap">
              {(item[columns[1].key] ?? 0).toLocaleString()}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

export const InfoWidgetsSection = () => {
    const { loading, widgets } = useOverviewWidgets();
    // 데이터 변환: API 결과를 컴포넌트에 맞게 매핑
    const trafficSources = widgets?.trafficSources?.map((row) => ({
      source: row.source,
      users: row.users,
    })) || [];
    const topPages = widgets?.topPages?.map((row) => ({
      page: row.page,
      views: row.views,
    })) || [];
    const topClicks = widgets?.topClicks?.map((row) => ({
      label: row.element,
      value: row.clicks,
    })) || [];
    const topConversions = widgets?.topConversions?.map((row) => ({
      event: row.event,
      conversions: row.conversions,
    })) || [];
    const topEvents = widgets?.topEvents?.map((row) => ({
      event: row.event,
      count: row.count,
    })) || [];
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* 왼쪽: 트래픽 소스 */}
            <div className="lg:col-span-1">
            <WidgetFrame title="소스 / 매체별 사용자" icon={PieChart}>
                <SimpleTable data={trafficSources} columns={[{key: 'source', label: '소스'}, {key: 'users', label: '사용자'}]} loading={loading} showBar />
            </WidgetFrame>
            </div>

            {/* 중앙: 상위 활성 페이지 */}
            <div className="lg:col-span-1">
            <WidgetFrame title="가장 많이 본 페이지" icon={Globe}>
                <SimpleTable data={topPages} columns={[{key: 'page', label: '페이지 경로'}, {key: 'views', label: '조회수'}]} loading={loading} showBar />
            </WidgetFrame>
            </div>
            
            {/* 오른쪽: 상위 이벤트 */}
            <div className="lg:col-span-1">
                <WidgetFrame title="상위 이벤트" icon={MousePointer}>
                    <SimpleTable data={topEvents} columns={[{key: 'event', label: '이벤트'}, {key: 'count', label: '발생수'}]} loading={loading} showBar />
                </WidgetFrame>
            </div>
      </div>
    );
}