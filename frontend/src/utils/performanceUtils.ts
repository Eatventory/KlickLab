import type { UserSegmentClickData } from '../data/mockData';

// 사용자 ID별 클릭 이벤트 그룹화 및 상위 요소 추출
export const processUserClickEvents = (
  clickEvents: Array<{
    userId: string;
    element: string;
    timestamp: number;
    gender?: 'male' | 'female' | 'other';
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
    region?: string;
    signupPath?: 'google' | 'facebook' | 'email' | 'kakao' | 'naver' | 'direct' | 'instagram';
    device?: 'mobile' | 'desktop' | 'tablet';
  }>
): UserSegmentClickData[] => {
  // 사용자별로 클릭 이벤트 그룹화
  const userClickGroups = new Map<string, {
    userId: string;
    clicks: Map<string, number>;
    totalClicks: number;
    gender?: 'male' | 'female' | 'other';
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
    region?: string;
    signupPath?: 'google' | 'facebook' | 'email' | 'kakao' | 'naver' | 'direct' | 'instagram';
    device?: 'mobile' | 'desktop' | 'tablet';
  }>();

  // 클릭 이벤트 처리
  clickEvents.forEach(event => {
    const { userId, element, gender, ageGroup, region, signupPath, device } = event;
    
    if (!userClickGroups.has(userId)) {
      userClickGroups.set(userId, {
        userId,
        clicks: new Map(),
        totalClicks: 0,
        gender,
        ageGroup,
        region,
        signupPath,
        device
      });
    }

    const userGroup = userClickGroups.get(userId)!;
    userGroup.totalClicks++;
    userGroup.clicks.set(element, (userGroup.clicks.get(element) || 0) + 1);
  });

  // 각 사용자별로 TOP 3 요소 추출
  const result: UserSegmentClickData[] = [];
  
  userClickGroups.forEach(userGroup => {
    const topElements = Array.from(userGroup.clicks.entries())
      .map(([element, clicks]) => ({ element, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3)
      .map(({ element, clicks }) => ({
        element,
        clicks,
        percentage: Math.round((clicks / userGroup.totalClicks) * 100)
      }));

    result.push({
      userId: userGroup.userId,
      gender: userGroup.gender || 'other',
      ageGroup: userGroup.ageGroup || '20s',
      region: userGroup.region || '서울',
      signupPath: userGroup.signupPath || 'direct',
      device: userGroup.device || 'desktop',
      clickCount: userGroup.totalClicks,
      topElements
    });
  });

  return result;
};

// 세그먼트별 그룹 집계 (성능 최적화)
export const aggregateSegmentGroups = (
  users: UserSegmentClickData[],
  segment: 'gender' | 'age' | 'region' | 'signupPath' | 'device'
): Array<{
  segmentValue: string;
  totalUsers: number;
  totalClicks: number;
  averageClicksPerUser: number;
  topElements: Array<{
    element: string;
    totalClicks: number;
    percentage: number;
    userCount: number;
  }>;
  userDistribution: { [key: string]: number };
}> => {
  // 세그먼트별로 사용자 그룹화
  const segmentGroups = new Map<string, UserSegmentClickData[]>();

  users.forEach(user => {
    let segmentValue: string;
    switch (segment) {
      case 'gender':
        segmentValue = user.gender;
        break;
      case 'age':
        segmentValue = user.ageGroup;
        break;
      case 'region':
        segmentValue = user.region;
        break;
      case 'signupPath':
        segmentValue = user.signupPath;
        break;
      case 'device':
        segmentValue = user.device;
        break;
      default:
        segmentValue = 'unknown';
    }
    
    if (!segmentGroups.has(segmentValue)) {
      segmentGroups.set(segmentValue, []);
    }
    segmentGroups.get(segmentValue)!.push(user);
  });

  // 각 세그먼트 그룹별로 집계
  const result: Array<{
    segmentValue: string;
    totalUsers: number;
    totalClicks: number;
    averageClicksPerUser: number;
    topElements: Array<{
      element: string;
      totalClicks: number;
      percentage: number;
      userCount: number;
    }>;
    userDistribution: { [key: string]: number };
  }> = [];
  
  segmentGroups.forEach((groupUsers, segmentValue) => {
    const totalUsers = groupUsers.length;
    const totalClicks = groupUsers.reduce((sum, user) => sum + user.clickCount, 0);
    const averageClicksPerUser = totalClicks / totalUsers;

    // 모든 사용자의 클릭 요소를 집계
    const elementCounts = new Map<string, { totalClicks: number; userCount: number }>();
    
    groupUsers.forEach(user => {
      user.topElements.forEach(element => {
        if (!elementCounts.has(element.element)) {
          elementCounts.set(element.element, { totalClicks: 0, userCount: 0 });
        }
        const current = elementCounts.get(element.element)!;
        current.totalClicks += element.clicks;
        current.userCount += 1;
      });
    });

    // TOP 3 요소 추출
    const topElements = Array.from(elementCounts.entries())
      .map(([element, data]) => ({
        element,
        totalClicks: data.totalClicks,
        percentage: Math.round((data.totalClicks / totalClicks) * 100),
        userCount: data.userCount
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 3);

    // 사용자 분포 계산 (다른 세그먼트 기준)
    const userDistribution: { [key: string]: number } = {};
    const distributionKey = segment === 'gender' ? 'ageGroup' : 
                           segment === 'age' ? 'gender' : 
                           segment === 'region' ? 'ageGroup' : 
                           segment === 'signupPath' ? 'gender' : 'gender';
    
    groupUsers.forEach(user => {
      const value = user[distributionKey as keyof UserSegmentClickData] as string;
      userDistribution[value] = (userDistribution[value] || 0) + 1;
    });

    result.push({
      segmentValue,
      totalUsers,
      totalClicks,
      averageClicksPerUser,
      topElements,
      userDistribution
    });
  });

  // 전체 클릭 수 기준으로 정렬
  return result.sort((a, b) => b.totalClicks - a.totalClicks);
};

// 가상화를 위한 아이템 크기 계산
export const calculateItemSize = (index: number, itemHeight: number = 300): number => {
  return itemHeight;
};

// 디바운스 함수 (검색 최적화)
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

// 메모이제이션을 위한 해시 함수
export const hashObject = (obj: any): string => {
  return JSON.stringify(obj);
};

// 무한 스크롤을 위한 페이지네이션
export const paginateData = <T>(
  data: T[],
  page: number,
  pageSize: number
): { items: T[]; hasMore: boolean; total: number } => {
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const items = data.slice(startIndex, endIndex);
  
  return {
    items,
    hasMore: endIndex < data.length,
    total: data.length
  };
}; 