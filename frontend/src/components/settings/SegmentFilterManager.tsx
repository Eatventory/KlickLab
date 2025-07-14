import React from 'react';
import { Settings } from 'lucide-react';

const SegmentFilterManager: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center gap-2 mb-4">
      <Settings className="w-5 h-5 text-gray-600" />
      <h2 className="text-lg font-semibold text-gray-900">세그먼트 필터 설정</h2>
    </div>
    <div className="text-gray-500 text-sm">(contents)</div>
  </div>
);

export default SegmentFilterManager; 