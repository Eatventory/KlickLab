import React, { forwardRef } from 'react';
import { KpiAndTrendSection } from './KpiAndTrendSection';
import { RealtimeUsersSection } from './RealtimeUsersSection';
import { InfoWidgetsSection } from './InfoWidgetsSection';

// Google Analytics 스타일의 개요 대시보드
export const OverviewDashboard = forwardRef((props, ref) => {

  return (
    <div className="bg-gray-50 p-4 sm:p-8">
      {/* GA 스타일 상단 2분할 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <KpiAndTrendSection />
        <RealtimeUsersSection />
      </div>
      {/* 이하 기존 하단 위젯 그리드 등은 그대로 유지 */}
      <InfoWidgetsSection />
    </div>
  );
});