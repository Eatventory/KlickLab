// 타입 정의를 직접 포함
interface StatCardData {
  title: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
}

interface VisitorData {
  date: string;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
}

interface ExitPageData {
  page: string;
  exitCount: number;
  percentage: number;
}

interface PageTimeData {
  page: string;
  averageTime: number;
  visitCount: number;
}

interface DeviceData {
  device: string;
  users: number;
  percentage: number;
}

interface ClickRankingData {
  id: string;
  name: string;
  type: 'button' | 'link' | 'menu' | 'card' | 'banner';
  clicks: number;
  uniqueClicks: number;
  clickRate: number; // 클릭률 (%)
  avgTimeToClick: number; // 평균 클릭까지 걸린 시간 (초)
  rank: number;
}

// 확장 가능한 대시보드 데이터 인터페이스
interface DashboardData {
  stats: StatCardData[];
  visitorTrend: VisitorData[];
  exitPages: ExitPageData[];
  pageTimes: PageTimeData[];
  devices: DeviceData[];
  clickRanking: ClickRankingData[];
  // 팀원들이 추가할 수 있는 확장 필드들
  userSegments?: any[];
  behaviorAnalytics?: any[];
  conversionFunnel?: any[];
  performanceMetrics?: any[];
  customReports?: any[];
  [key: string]: any; // 동적 필드 허용
}

// 통계 카드 더미 데이터
const statsData: StatCardData[] = [
  {
    title: '일일 방문자',
    value: 1247,
    change: 12.5,
    changeType: 'increase',
    icon: 'Users',
    color: 'blue'
  },
  {
    title: '신규 사용자',
    value: 892,
    change: 8.2,
    changeType: 'increase',
    icon: 'UserPlus',
    color: 'green'
  },
  {
    title: '재방문자',
    value: 355,
    change: -3.1,
    changeType: 'decrease',
    icon: 'UserCheck',
    color: 'purple'
  },
  {
    title: '탈퇴자',
    value: 23,
    change: 0,
    changeType: 'neutral',
    icon: 'UserMinus',
    color: 'red'
  },
  {
    title: 'Android 사용자',
    value: 743,
    change: 15.3,
    changeType: 'increase',
    icon: 'Smartphone',
    color: 'green'
  },
  {
    title: 'iOS 사용자',
    value: 504,
    change: 5.7,
    changeType: 'increase',
    icon: 'Smartphone',
    color: 'blue'
  }
];

// 방문자 추이 더미 데이터 (최근 7일)
const visitorTrendData: VisitorData[] = [
  { date: '2024-01-01', visitors: 1150, newVisitors: 820, returningVisitors: 330 },
  { date: '2024-01-02', visitors: 1280, newVisitors: 890, returningVisitors: 390 },
  { date: '2024-01-03', visitors: 1420, newVisitors: 950, returningVisitors: 470 },
  { date: '2024-01-04', visitors: 1380, newVisitors: 920, returningVisitors: 460 },
  { date: '2024-01-05', visitors: 1560, newVisitors: 1050, returningVisitors: 510 },
  { date: '2024-01-06', visitors: 1680, newVisitors: 1120, returningVisitors: 560 },
  { date: '2024-01-07', visitors: 1247, newVisitors: 892, returningVisitors: 355 }
];

// 이탈 페이지 더미 데이터
const exitPageData: ExitPageData[] = [
  { page: '/products', exitCount: 156, percentage: 12.5 },
  { page: '/cart', exitCount: 89, percentage: 7.1 },
  { page: '/checkout', exitCount: 67, percentage: 5.4 },
  { page: '/login', exitCount: 45, percentage: 3.6 },
  { page: '/register', exitCount: 34, percentage: 2.7 },
  { page: '/about', exitCount: 23, percentage: 1.8 },
  { page: '/contact', exitCount: 18, percentage: 1.4 }
];

// 페이지별 체류시간 더미 데이터
const pageTimeData: PageTimeData[] = [
  { page: '/home', averageTime: 2.5, visitCount: 1247 },
  { page: '/products', averageTime: 4.2, visitCount: 892 },
  { page: '/product-detail', averageTime: 6.8, visitCount: 743 },
  { page: '/cart', averageTime: 1.8, visitCount: 456 },
  { page: '/checkout', averageTime: 3.5, visitCount: 234 },
  { page: '/profile', averageTime: 5.2, visitCount: 189 },
  { page: '/about', averageTime: 2.1, visitCount: 123 }
];

// 디바이스별 사용자 더미 데이터
const deviceData: DeviceData[] = [
  { device: 'Android', users: 743, percentage: 59.6 },
  { device: 'iOS', users: 504, percentage: 40.4 }
];

// 메인 페이지 클릭 랭킹 더미 데이터
const clickRankingData: ClickRankingData[] = [
  {
    id: '1',
    name: '상품 보기 버튼',
    type: 'button',
    clicks: 1247,
    uniqueClicks: 892,
    clickRate: 85.2,
    avgTimeToClick: 3.2,
    rank: 1
  },
  {
    id: '2',
    name: '장바구니 추가',
    type: 'button',
    clicks: 892,
    uniqueClicks: 743,
    clickRate: 72.1,
    avgTimeToClick: 4.8,
    rank: 2
  },
  {
    id: '3',
    name: '상품 상세 링크',
    type: 'link',
    clicks: 743,
    uniqueClicks: 456,
    clickRate: 68.7,
    avgTimeToClick: 6.5,
    rank: 3
  },
  {
    id: '4',
    name: '로그인 메뉴',
    type: 'menu',
    clicks: 456,
    uniqueClicks: 234,
    clickRate: 45.3,
    avgTimeToClick: 2.1,
    rank: 4
  },
  {
    id: '5',
    name: '프로모션 배너',
    type: 'banner',
    clicks: 234,
    uniqueClicks: 189,
    clickRate: 42.8,
    avgTimeToClick: 4.3,
    rank: 5
  },
  {
    id: '6',
    name: '상품 카드',
    type: 'card',
    clicks: 189,
    uniqueClicks: 156,
    clickRate: 38.9,
    avgTimeToClick: 5.7,
    rank: 6
  },
  {
    id: '7',
    name: '검색 버튼',
    type: 'button',
    clicks: 156,
    uniqueClicks: 123,
    clickRate: 28.5,
    avgTimeToClick: 1.8,
    rank: 7
  },
  {
    id: '8',
    name: '회원가입 링크',
    type: 'link',
    clicks: 123,
    uniqueClicks: 98,
    clickRate: 22.3,
    avgTimeToClick: 2.4,
    rank: 8
  }
];

// ===== 팀원들이 추가할 수 있는 확장 데이터 영역 =====

// 사용자 세그먼트 데이터 (팀원 A용)
const userSegmentData = [
  { type: '신규 유저', value: 892 },
  { type: '기존 유저', value: 355 }
];

// OS 분포 데이터 (팀원 B용)
const osDistributionData = [
  { os: 'Android', users: 743, category: 'mobile' },
  { os: 'iOS', users: 504, category: 'mobile' },
  { os: 'Windows', users: 620, category: 'desktop' },
  { os: 'macOS', users: 210, category: 'desktop' },
  { os: 'Linux', users: 85, category: 'desktop' }
];

// 브라우저 분포 데이터 (팀원 C용)
const browserDistributionData = [
  { browser: 'Chrome', users: 900, category: 'desktop' },
  { browser: 'Edge', users: 180, category: 'desktop' },
  { browser: 'Firefox', users: 110, category: 'desktop' },
  { browser: 'Safari', users: 120, category: 'desktop' },
  { browser: 'Chrome Mobile', users: 200, category: 'mobile' },
  { browser: 'Safari Mobile', users: 300, category: 'mobile' },
  { browser: 'Samsung Internet', users: 90, category: 'mobile' },
  { browser: '기타', users: 62, category: 'mobile' }
];

// 사용자 행동 분석 데이터 (팀원 D용)
const userBehaviorData = [
  { behavior: '페이지 스크롤', count: 2345, percentage: 45.2 },
  { behavior: '마우스 호버', count: 1890, percentage: 36.4 },
  { behavior: '검색 사용', count: 1234, percentage: 23.8 },
  { behavior: '필터 적용', count: 890, percentage: 17.2 },
  { behavior: '북마크', count: 567, percentage: 10.9 }
];

// 전환 퍼널 데이터 (팀원 E용)
const conversionFunnelData = [
  { stage: '방문', count: 1247, conversionRate: 100 },
  { stage: '상품 조회', count: 892, conversionRate: 71.5 },
  { stage: '장바구니 추가', count: 456, conversionRate: 36.6 },
  { stage: '결제 시작', count: 234, conversionRate: 18.8 },
  { stage: '결제 완료', count: 123, conversionRate: 9.9 }
];

// 성능 메트릭 데이터 (팀원 F용)
const performanceMetricsData = [
  { metric: '페이지 로드 시간', value: 2.3, unit: '초', target: 3.0 },
  { metric: 'TTFB', value: 180, unit: 'ms', target: 200 },
  { metric: 'FCP', value: 1.2, unit: '초', target: 1.5 },
  { metric: 'LCP', value: 2.8, unit: '초', target: 2.5 },
  { metric: 'CLS', value: 0.08, unit: '', target: 0.1 }
];

// 지역별 데이터 (팀원 G용)
const regionalData = [
  { region: '서울', users: 456, percentage: 36.6 },
  { region: '경기', users: 234, percentage: 18.8 },
  { region: '부산', users: 123, percentage: 9.9 },
  { region: '대구', users: 89, percentage: 7.1 },
  { region: '인천', users: 78, percentage: 6.3 },
  { region: '기타', users: 267, percentage: 21.4 }
];

// 시간대별 데이터 (팀원 H용)
const timeBasedData = [
  { hour: '09:00', activity: 234 },
  { hour: '10:00', activity: 345 },
  { hour: '11:00', activity: 456 },
  { hour: '12:00', activity: 567 },
  { hour: '13:00', activity: 678 },
  { hour: '14:00', activity: 789 },
  { hour: '15:00', activity: 890 },
  { hour: '16:00', activity: 756 },
  { hour: '17:00', activity: 654 },
  { hour: '18:00', activity: 543 },
  { hour: '19:00', activity: 432 },
  { hour: '20:00', activity: 321 }
];

// ===== 메인 대시보드 데이터 =====
export const mockDashboardData: DashboardData = {
  stats: statsData,
  visitorTrend: visitorTrendData,
  exitPages: exitPageData,
  pageTimes: pageTimeData,
  devices: deviceData,
  clickRanking: clickRankingData,
  // 확장 데이터들 (팀원들이 필요시 사용)
  userSegments: userSegmentData,
  osDistribution: osDistributionData,
  browserDistribution: browserDistributionData,
  userBehavior: userBehaviorData,
  conversionFunnel: conversionFunnelData,
  performanceMetrics: performanceMetricsData,
  regionalData: regionalData,
  timeBasedData: timeBasedData
};

// ===== 개별 데이터 export (팀원들이 필요시 사용) =====
export { userSegmentData, osDistributionData, browserDistributionData };
export { userBehaviorData, conversionFunnelData, performanceMetricsData };
export { regionalData, timeBasedData };

// ===== fharena-frontend 브랜치에서 추가된 상세 세그먼트 데이터 =====

// 사용자 세그먼트별 클릭 TOP 3 데이터
export interface UserSegmentClickData {
  userId: string;
  gender: 'male' | 'female' | 'other';
  ageGroup: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
  signupPath: 'google' | 'facebook' | 'email' | 'kakao' | 'naver' | 'direct' | 'instagram';
  device: 'mobile' | 'desktop' | 'tablet';
  clickCount: number;
  topElements: Array<{
    element: string;
    clicks: number;
    percentage: number;
  }>;
}

// 성별 세그먼트 데이터
export const genderSegmentData: UserSegmentClickData[] = [
  {
    userId: 'user_001',
    gender: 'male',
    ageGroup: '20s',
    signupPath: 'google',
    device: 'mobile',
    clickCount: 156,
    topElements: [
      { element: '상품 상세 버튼', clicks: 45, percentage: 28.8 },
      { element: '장바구니 추가', clicks: 32, percentage: 20.5 },
      { element: '리뷰 보기', clicks: 28, percentage: 17.9 }
    ]
  },
  {
    userId: 'user_002',
    gender: 'male',
    ageGroup: '30s',
    signupPath: 'email',
    device: 'desktop',
    clickCount: 203,
    topElements: [
      { element: '검색 필터', clicks: 67, percentage: 33.0 },
      { element: '상품 비교', clicks: 45, percentage: 22.2 },
      { element: '위시리스트', clicks: 38, percentage: 18.7 }
    ]
  },
  {
    userId: 'user_003',
    gender: 'male',
    ageGroup: '40s',
    signupPath: 'kakao',
    device: 'mobile',
    clickCount: 89,
    topElements: [
      { element: '쿠폰 적용', clicks: 31, percentage: 34.8 },
      { element: '배송 조회', clicks: 25, percentage: 28.1 },
      { element: '고객센터', clicks: 18, percentage: 20.2 }
    ]
  }
];

// 연령대 세그먼트 데이터
export const ageSegmentData: UserSegmentClickData[] = [
  {
    userId: 'user_004',
    gender: 'female',
    ageGroup: '10s',
    signupPath: 'kakao',
    device: 'mobile',
    clickCount: 234,
    topElements: [
      { element: '소셜 공유', clicks: 89, percentage: 38.0 },
      { element: '이모티콘', clicks: 67, percentage: 28.6 },
      { element: '친구 초대', clicks: 45, percentage: 19.2 }
    ]
  },
  {
    userId: 'user_005',
    gender: 'female',
    ageGroup: '20s',
    signupPath: 'instagram',
    device: 'mobile',
    clickCount: 187,
    topElements: [
      { element: '인스타그램 링크', clicks: 78, percentage: 41.7 },
      { element: '스토리 공유', clicks: 56, percentage: 29.9 },
      { element: '해시태그', clicks: 34, percentage: 18.2 }
    ]
  },
  {
    userId: 'user_006',
    gender: 'male',
    ageGroup: '30s',
    signupPath: 'email',
    device: 'desktop',
    clickCount: 145,
    topElements: [
      { element: '상품 리뷰', clicks: 52, percentage: 35.9 },
      { element: '가격 비교', clicks: 38, percentage: 26.2 },
      { element: '스펙 확인', clicks: 29, percentage: 20.0 }
    ]
  }
];

// 가입 경로 세그먼트 데이터
export const signupPathSegmentData: UserSegmentClickData[] = [
  {
    userId: 'user_010',
    gender: 'male',
    ageGroup: '20s',
    signupPath: 'google',
    device: 'desktop',
    clickCount: 245,
    topElements: [
      { element: '구글 검색', clicks: 98, percentage: 40.0 },
      { element: '구글 맵', clicks: 67, percentage: 27.3 },
      { element: '구글 번역', clicks: 45, percentage: 18.4 }
    ]
  },
  {
    userId: 'user_011',
    gender: 'female',
    ageGroup: '20s',
    signupPath: 'facebook',
    device: 'mobile',
    clickCount: 178,
    topElements: [
      { element: '페이스북 공유', clicks: 72, percentage: 40.4 },
      { element: '페이스북 로그인', clicks: 54, percentage: 30.3 },
      { element: '친구 추천', clicks: 38, percentage: 21.3 }
    ]
  },
  {
    userId: 'user_012',
    gender: 'male',
    ageGroup: '30s',
    signupPath: 'email',
    device: 'desktop',
    clickCount: 156,
    topElements: [
      { element: '이메일 인증', clicks: 62, percentage: 39.7 },
      { element: '뉴스레터 구독', clicks: 43, percentage: 27.6 },
      { element: '이메일 공유', clicks: 31, percentage: 19.9 }
    ]
  }
];

// 기기별 세그먼트 데이터
export const deviceSegmentData: UserSegmentClickData[] = [
  {
    userId: 'user_013',
    gender: 'female',
    ageGroup: '20s',
    signupPath: 'kakao',
    device: 'mobile',
    clickCount: 267,
    topElements: [
      { element: '터치 스와이프', clicks: 112, percentage: 41.9 },
      { element: '모바일 메뉴', clicks: 78, percentage: 29.2 },
      { element: '앱 다운로드', clicks: 56, percentage: 21.0 }
    ]
  },
  {
    userId: 'user_014',
    gender: 'male',
    ageGroup: '40s',
    signupPath: 'direct',
    device: 'desktop',
    clickCount: 189,
    topElements: [
      { element: '마우스 호버', clicks: 76, percentage: 40.2 },
      { element: '키보드 단축키', clicks: 54, percentage: 28.6 },
      { element: '데스크탑 메뉴', clicks: 42, percentage: 22.2 }
    ]
  },
  {
    userId: 'user_015',
    gender: 'female',
    ageGroup: '30s',
    signupPath: 'naver',
    device: 'tablet',
    clickCount: 134,
    topElements: [
      { element: '태블릿 터치', clicks: 58, percentage: 43.3 },
      { element: '태블릿 메뉴', clicks: 41, percentage: 30.6 },
      { element: '화면 회전', clicks: 28, percentage: 20.9 }
    ]
  }
];

// 세그먼트 그룹별 집계 데이터 타입
export interface SegmentGroupData {
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
  userDistribution: {
    gender?: { [key: string]: number };
    ageGroup?: { [key: string]: number };
    signupPath?: { [key: string]: number };
    device?: { [key: string]: number };
  };
}

// 성별 세그먼트 그룹 데이터
export const genderSegmentGroupData: SegmentGroupData[] = [
  {
    segmentValue: '남성',
    totalUsers: 1247,
    totalClicks: 15689,
    averageClicksPerUser: 12.6,
    topElements: [
      { element: '상품 상세 버튼', totalClicks: 4234, percentage: 27.0, userCount: 892 },
      { element: '장바구니 추가', totalClicks: 3123, percentage: 19.9, userCount: 756 },
      { element: '검색 필터', totalClicks: 2891, percentage: 18.4, userCount: 634 }
    ],
    userDistribution: {
      ageGroup: { '20s': 456, '30s': 389, '40s': 234, '50s': 168 },
      device: { 'mobile': 789, 'desktop': 458 }
    }
  },
  {
    segmentValue: '여성',
    totalUsers: 1892,
    totalClicks: 23456,
    averageClicksPerUser: 12.4,
    topElements: [
      { element: '소셜 공유', totalClicks: 6789, percentage: 28.9, userCount: 1234 },
      { element: '위시리스트', totalClicks: 4567, percentage: 19.5, userCount: 987 },
      { element: '리뷰 보기', totalClicks: 3456, percentage: 14.7, userCount: 756 }
    ],
    userDistribution: {
      ageGroup: { '10s': 234, '20s': 567, '30s': 456, '40s': 345, '50s': 290 },
      device: { 'mobile': 1234, 'desktop': 658 }
    }
  }
];

// 연령대 세그먼트 그룹 데이터
export const ageSegmentGroupData: SegmentGroupData[] = [
  {
    segmentValue: '10대',
    totalUsers: 456,
    totalClicks: 6789,
    averageClicksPerUser: 14.9,
    topElements: [
      { element: '소셜 공유', totalClicks: 2345, percentage: 34.5, userCount: 345 },
      { element: '이모티콘', totalClicks: 1234, percentage: 18.2, userCount: 234 },
      { element: '친구 초대', totalClicks: 987, percentage: 14.5, userCount: 189 }
    ],
    userDistribution: {
      gender: { 'male': 234, 'female': 222 },
      device: { 'mobile': 389, 'desktop': 67 }
    }
  },
  {
    segmentValue: '20대',
    totalUsers: 1234,
    totalClicks: 15678,
    averageClicksPerUser: 12.7,
    topElements: [
      { element: '인스타그램 링크', totalClicks: 4567, percentage: 29.1, userCount: 789 },
      { element: '스토리 공유', totalClicks: 3456, percentage: 22.0, userCount: 567 },
      { element: '해시태그', totalClicks: 2345, percentage: 15.0, userCount: 456 }
    ],
    userDistribution: {
      gender: { 'male': 567, 'female': 667 },
      device: { 'mobile': 987, 'desktop': 247 }
    }
  },
  {
    segmentValue: '30대',
    totalUsers: 987,
    totalClicks: 12345,
    averageClicksPerUser: 12.5,
    topElements: [
      { element: '상품 리뷰', totalClicks: 3456, percentage: 28.0, userCount: 456 },
      { element: '가격 비교', totalClicks: 2345, percentage: 19.0, userCount: 345 },
      { element: '스펙 확인', totalClicks: 1890, percentage: 15.3, userCount: 234 }
    ],
    userDistribution: {
      gender: { 'male': 456, 'female': 531 },
      device: { 'mobile': 678, 'desktop': 309 }
    }
  }
];

// 가입 경로 세그먼트 그룹 데이터
export const signupPathSegmentGroupData: SegmentGroupData[] = [
  {
    segmentValue: 'Google',
    totalUsers: 678,
    totalClicks: 8923,
    averageClicksPerUser: 13.2,
    topElements: [
      { element: '구글 검색', totalClicks: 3456, percentage: 38.7, userCount: 456 },
      { element: '구글 맵', totalClicks: 2345, percentage: 26.3, userCount: 345 },
      { element: '구글 번역', totalClicks: 1234, percentage: 13.8, userCount: 234 }
    ],
    userDistribution: {
      gender: { 'male': 345, 'female': 333 },
      ageGroup: { '20s': 345, '30s': 234, '40s': 99 },
      device: { 'mobile': 456, 'desktop': 222 }
    }
  },
  {
    segmentValue: 'Facebook',
    totalUsers: 456,
    totalClicks: 5678,
    averageClicksPerUser: 12.5,
    topElements: [
      { element: '페이스북 공유', totalClicks: 2345, percentage: 41.3, userCount: 234 },
      { element: '페이스북 로그인', totalClicks: 1567, percentage: 27.6, userCount: 189 },
      { element: '친구 추천', totalClicks: 890, percentage: 15.7, userCount: 123 }
    ],
    userDistribution: {
      gender: { 'male': 234, 'female': 222 },
      ageGroup: { '20s': 234, '30s': 156, '40s': 66 },
      device: { 'mobile': 312, 'desktop': 144 }
    }
  },
  {
    segmentValue: '카카오',
    totalUsers: 789,
    totalClicks: 9876,
    averageClicksPerUser: 12.5,
    topElements: [
      { element: '카카오톡 공유', totalClicks: 3456, percentage: 35.0, userCount: 456 },
      { element: '카카오 로그인', totalClicks: 2345, percentage: 23.7, userCount: 345 },
      { element: '카카오페이', totalClicks: 1234, percentage: 12.5, userCount: 234 }
    ],
    userDistribution: {
      gender: { 'male': 345, 'female': 444 },
      ageGroup: { '10s': 123, '20s': 345, '30s': 234, '40s': 87 },
      device: { 'mobile': 567, 'desktop': 222 }
    }
  }
];

// 기기별 세그먼트 그룹 데이터
export const deviceSegmentGroupData: SegmentGroupData[] = [
  {
    segmentValue: '모바일',
    totalUsers: 2034,
    totalClicks: 25678,
    averageClicksPerUser: 12.6,
    topElements: [
      { element: '터치 스와이프', totalClicks: 9876, percentage: 38.5, userCount: 1234 },
      { element: '모바일 메뉴', totalClicks: 6789, percentage: 26.4, userCount: 987 },
      { element: '앱 다운로드', totalClicks: 4567, percentage: 17.8, userCount: 678 }
    ],
    userDistribution: {
      gender: { 'male': 987, 'female': 1047 },
      ageGroup: { '10s': 345, '20s': 789, '30s': 567, '40s': 333 }
    }
  },
  {
    segmentValue: '데스크탑',
    totalUsers: 1105,
    totalClicks: 13467,
    averageClicksPerUser: 12.2,
    topElements: [
      { element: '마우스 호버', totalClicks: 4567, percentage: 33.9, userCount: 567 },
      { element: '키보드 단축키', totalClicks: 3456, percentage: 25.7, userCount: 456 },
      { element: '데스크탑 메뉴', totalClicks: 2345, percentage: 17.4, userCount: 345 }
    ],
    userDistribution: {
      gender: { 'male': 567, 'female': 538 },
      ageGroup: { '20s': 445, '30s': 420, '40s': 240 }
    }
  },
  {
    segmentValue: '태블릿',
    totalUsers: 234,
    totalClicks: 3123,
    averageClicksPerUser: 13.3,
    topElements: [
      { element: '태블릿 터치', totalClicks: 1234, percentage: 39.5, userCount: 156 },
      { element: '태블릿 메뉴', totalClicks: 890, percentage: 28.5, userCount: 123 },
      { element: '화면 회전', totalClicks: 567, percentage: 18.2, userCount: 89 }
    ],
    userDistribution: {
      gender: { 'male': 123, 'female': 111 },
      ageGroup: { '20s': 89, '30s': 78, '40s': 67 }
    }
  }
];

// ===== 타입 export (팀원들이 필요시 사용) =====
export type {
  StatCardData,
  VisitorData,
  ExitPageData,
  PageTimeData,
  DeviceData,
  ClickRankingData,
  DashboardData
};

// ===== Sankey(사키) 다이어그램용 mock 경로 데이터 =====
export const mockSankeyPaths = [
  ["session_start", "page_view", "add_to_cart", "purchase"],
  ["session_start", "page_view", "scroll", "leave"],
  ["session_start", "page_view", "view_promotion", "view_item_list", "select_item"]
]; 