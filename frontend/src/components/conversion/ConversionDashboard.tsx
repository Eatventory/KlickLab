import React from 'react';
import { ConversionSummaryCard } from '../overview/ConversionSummaryCard';
import ConversionPathsCard from '../overview/ConversionPathsCard';

const ConversionDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">전환 요약</h2>
        <ConversionSummaryCard />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">전환 경로 Top 3</h2>
        <ConversionPathsCard refreshKey={0} />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">퍼널 차트 (추후 구현 예정)</h2>
        <p>전환 퍼널 시각화 기능이 곧 추가될 예정입니다.</p>
      </div>
    </div>
  );
};

export { ConversionDashboard }; 