import React, { memo } from 'react';
import { Users, MousePointer, TrendingUp, BarChart3 } from 'lucide-react';
import type { SegmentGroupData } from '../../data/mockData';

interface SegmentGroupCardProps {
  segment: SegmentGroupData;
  rank: number;
  segmentType: 'gender' | 'age' | 'signupPath' | 'device';
}

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 2:
      return 'bg-gray-100 border-gray-300 text-gray-800';
    case 3:
      return 'bg-orange-100 border-orange-300 text-orange-800';
    default:
      return 'bg-blue-100 border-blue-300 text-blue-800';
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `${rank}`;
  }
};

const getSegmentIcon = (segmentType: string) => {
  switch (segmentType) {
    case 'gender':
      return '👥';
    case 'age':
      return '📅';
    case 'region':
      return '📍';
    case 'signupPath':
      return '🔗';
    case 'device':
      return '📱';
    default:
      return '📊';
  }
};

// 메모이제이션된 클릭 패턴 아이템
const ClickPatternItem = memo<{ 
  element: { 
    element: string; 
    totalClicks: number; 
    percentage: number; 
    userCount: number 
  }; 
  index: number 
}>(
  ({ element, index }) => (
    <div className="flex items-center justify-between text-sm">
      <div className="flex-1 min-w-0">
        <div className="text-gray-700 truncate">{element.element}</div>
        <div className="text-xs text-gray-500">{element.userCount}명이 클릭</div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className="text-gray-600">{element.totalClicks.toLocaleString()}회</span>
        <span className="text-blue-600 font-medium">{element.percentage}%</span>
      </div>
    </div>
  )
);

ClickPatternItem.displayName = 'ClickPatternItem';

// 메모이제이션된 사용자 분포 아이템
const UserDistributionItem = memo<{ 
  label: string; 
  count: number; 
  total: number 
}>(
  ({ label, count, total }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full"
            style={{ width: `${(count / total) * 100}%` }}
          />
        </div>
        <span className="text-gray-700 font-medium">{count}</span>
      </div>
    </div>
  )
);

UserDistributionItem.displayName = 'UserDistributionItem';

// 메모이제이션된 SegmentGroupCard 컴포넌트
export const SegmentGroupCard = memo<SegmentGroupCardProps>(({ 
  segment, 
  rank, 
  segmentType 
}) => {
  const getDistributionData = () => {
    const distribution = segment.userDistribution;
    switch (segmentType) {
      case 'gender':
        return distribution.ageGroup ? Object.entries(distribution.ageGroup) : [];
      case 'age':
        return distribution.gender ? Object.entries(distribution.gender) : [];
      case 'signupPath':
        return distribution.gender ? Object.entries(distribution.gender) : [];
      case 'device':
        return distribution.gender ? Object.entries(distribution.gender) : [];
      default:
        return [];
    }
  };

  const distributionData = getDistributionData();
  const totalDistribution = distributionData.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* 랭킹 배지 */}
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRankColor(rank)}`}>
          <span className="mr-1">{getRankIcon(rank)}</span>
          {rank}위
        </div>
        <div className="text-sm text-gray-500">
          {segment.totalClicks.toLocaleString()}회 클릭
        </div>
      </div>

      {/* 세그먼트 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
          <span className="text-xl">{getSegmentIcon(segmentType)}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-lg">{segment.segmentValue}</span>
          </div>
          <div className="text-sm text-gray-600">
            {segment.totalUsers.toLocaleString()}명의 사용자
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">사용자</span>
          </div>
          <div className="font-bold text-gray-900">{segment.totalUsers.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-xs">클릭</span>
          </div>
          <div className="font-bold text-gray-900">{segment.totalClicks.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">평균</span>
          </div>
          <div className="font-bold text-gray-900">{segment.averageClicksPerUser.toFixed(1)}</div>
        </div>
      </div>

      {/* 클릭 패턴 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <div className="text-sm font-medium text-gray-900">TOP 3 클릭 패턴</div>
        </div>
        <div className="space-y-3">
          {segment.topElements.map((element, index) => (
            <ClickPatternItem key={index} element={element} index={index} />
          ))}
        </div>
      </div>

      {/* 사용자 분포 */}
      {distributionData.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900 mb-3">사용자 분포</div>
          <div className="space-y-2">
            {distributionData.map(([label, count]) => (
              <UserDistributionItem 
                key={label} 
                label={label} 
                count={count} 
                total={totalDistribution} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SegmentGroupCard.displayName = 'SegmentGroupCard'; 