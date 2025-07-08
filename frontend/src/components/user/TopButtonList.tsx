import React from 'react';
import { Users, Calendar, Share2, Smartphone } from 'lucide-react';

export type SegmentType = 'gender' | 'age' | 'signupPath' | 'device';

interface TopButtonListProps {
  activeSegment: SegmentType;
  onSegmentChange: (segment: SegmentType) => void;
}

const segmentOptions = [
  {
    type: 'gender' as SegmentType,
    label: '성별',
    icon: Users,
    description: '남성/여성별 클릭 패턴'
  },
  {
    type: 'age' as SegmentType,
    label: '연령대',
    icon: Calendar,
    description: '연령대별 클릭 패턴'
  },

  {
    type: 'signupPath' as SegmentType,
    label: '유입 경로',
    icon: Share2,
    description: '가입 경로별 클릭 패턴'
  },
  {
    type: 'device' as SegmentType,
    label: '기기',
    icon: Smartphone,
    description: '기기별 클릭 패턴'
  }
];

export const TopButtonList: React.FC<TopButtonListProps> = ({ 
  activeSegment, 
  onSegmentChange 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">사용자 세그먼트별 클릭 TOP 3</h3>
        <p className="text-sm text-gray-600">각 세그먼트별로 가장 활발한 사용자들의 클릭 패턴을 확인하세요</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {segmentOptions.map((option) => {
          const IconComponent = option.icon;
          const isActive = activeSegment === option.type;
          
          return (
            <button
              key={option.type}
              onClick={() => onSegmentChange(option.type)}
              className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                isActive
                  ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isActive ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    isActive ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    isActive ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {option.label}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}; 