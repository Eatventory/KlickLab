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
      return null;
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
        <div className="text-xs text-gray-500">{element.userCount}명</div>
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

// 연령대 영문 → 한글 변환 함수
const ageGroupLabelMap: Record<string, string> = {
  '10s': '10대',
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60s+': '60대 이상',
};

// segmentValue 변환 함수
function getDisplaySegmentValue(segmentType: string, segmentValue: string) {
  if (!segmentValue || segmentValue.trim() === '') return '불명';

  if (/^\d+대$/.test(segmentValue) || segmentValue === '60대 이상') {
    return segmentValue;
  }

  if (segmentType === 'age') {
    if (ageGroupLabelMap[segmentValue]) return ageGroupLabelMap[segmentValue];
    return '불명';
  }

  if (segmentType === 'gender') {
    if (segmentValue === 'male') return '남성';
    if (segmentValue === 'female') return '여성';
    return '불명';
  }

  if (segmentType === 'device') {
    if (segmentValue === 'mobile') return '모바일';
    if (segmentValue === 'desktop') return '데스크탑';
    return '불명';
  }

  return segmentValue;
}

// 연령대별 그룹 합산 함수
function mergeAgeSegmentsIfNeeded(segmentType: string, segment: SegmentGroupData, allSegments: SegmentGroupData[]) {
  if (segmentType !== 'age') return segment;

  const group = getDisplaySegmentValue('age', segment.segmentValue);
  let totalUsers = 0;
  let totalClicks = 0;

  for (const cur of allSegments) {
    if (getDisplaySegmentValue('age', cur.segmentValue) === group) {
      totalUsers += Number(cur.totalUsers) || 0;
      totalClicks += Number(cur.totalClicks) || 0;
    }
  }

  return {
    ...segment,
    segmentValue: group,
    totalUsers,
    totalClicks,
    averageClicksPerUser: totalUsers > 0 ? totalClicks / totalUsers : 0
  };
}

function getLabelText(segmentType: string, label: string | null): string {
  if (!label || label.trim() === '') return '불명';
  if (ageGroupLabelMap[label]) return ageGroupLabelMap[label];
  if (segmentType === 'gender') {
    if (label === 'male') return '남성';
    if (label === 'female') return '여성';
  }
  if (segmentType === 'device') {
    if (label === 'mobile') return '모바일';
    if (label === 'desktop') return '데스크탑';
  }
  return '불명';
}

// 메모이제이션된 SegmentGroupCard 컴포넌트
export const SegmentGroupCard = memo<SegmentGroupCardProps>(({ 
  segment, 
  rank, 
  segmentType 
}) => {
  // 연령대 세그먼트면 같은 그룹끼리 합산
  const mergedSegment = mergeAgeSegmentsIfNeeded(segmentType, segment, (segment as any).allSegments || [segment]);
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
        return distribution.device ? Object.entries(distribution.device) : [];
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
          {getRankIcon(rank) ? (
            <>
              <span className="mr-1">{getRankIcon(rank)}</span>{rank}위
            </>
          ) : (
            <>{rank}위</>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {mergedSegment.totalClicks.toLocaleString()}회 클릭
        </div>
      </div>

      {/* 세그먼트 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
          <span className="text-xl">{getSegmentIcon(segmentType)}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold text-gray-900 text-lg truncate max-w-[160px]"
              title={getDisplaySegmentValue(segmentType, mergedSegment.segmentValue)}
            >
              {getDisplaySegmentValue(segmentType, mergedSegment.segmentValue)}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {mergedSegment.totalUsers.toLocaleString()}명의 사용자
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="flex flex-col gap-2 mb-4 items-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">사용자</span>
          </div>
          <div className="font-bold text-gray-900">{mergedSegment.totalUsers.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-xs">클릭</span>
          </div>
          <div className="font-bold text-gray-900">{mergedSegment.totalClicks.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">평균</span>
          </div>
          <div className="font-bold text-gray-900">{mergedSegment.averageClicksPerUser != null ? mergedSegment.averageClicksPerUser.toFixed(1) : '-'}</div>
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
                label={getLabelText(segmentType, label)}
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