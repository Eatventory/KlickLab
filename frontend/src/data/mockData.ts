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