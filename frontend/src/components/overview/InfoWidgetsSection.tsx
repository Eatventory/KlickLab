import React from 'react';
import { TopClicks } from './TopClicks';
import { PieChart, Globe, MousePointer } from 'lucide-react';

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
const SimpleTable = ({ data, columns, loading }) => {
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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 font-semibold text-sm text-gray-500">
        <span>{columns[0].label}</span>
        <span className="text-right">{columns[1].label}</span>
      </div>
      {data.map((item, index) => (
        <div key={index} className="grid grid-cols-2 text-sm text-gray-700 border-t pt-2">
          <span>{item[columns[0].key]}</span>
          <span className="text-right font-medium">{item[columns[1].key].toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const InfoWidgetsSection = ({ trafficSources, topPages, topClicks, loading }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* 왼쪽: 트래픽 소스 */}
            <div className="lg:col-span-1">
            <WidgetFrame title="소스 / 매체별 사용자" icon={PieChart}>
                <SimpleTable data={trafficSources} columns={[{key: 'source', label: '소스'}, {key: 'users', label: '사용자'}]} loading={loading} />
                {/* 여기에 파이 차트를 추가할 수 있습니다. */}
            </WidgetFrame>
            </div>

            {/* 중앙: 상위 활성 페이지 */}
            <div className="lg:col-span-1">
            <WidgetFrame title="가장 많이 본 페이지" icon={Globe}>
                <SimpleTable data={topPages} columns={[{key: 'page', label: '페이지 경로'}, {key: 'views', label: '조회수'}]} loading={loading} />
            </WidgetFrame>
            </div>
            
            {/* 오른쪽: TopClicks (기존 컴포넌트 재사용) */}
            <div className="lg:col-span-1">
                <WidgetFrame title="가장 많이 클릭된 요소" icon={MousePointer}>
                    <TopClicks data={topClicks} loading={loading} />
                </WidgetFrame>
            </div>
      </div>
    );
}