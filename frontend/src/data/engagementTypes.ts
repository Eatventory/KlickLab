export interface PageTimeData {
  page: string;
  averageTime: number;
  visitCount: number;
}

export interface PageViewCountsData {
  page: string;
  totalViews: number;
}

export interface BounceRatesData {
  page_path: string;
  total_views: string;
  total_exits: string;
  bounce_rate: number;
}

export interface ViewCountsData {
  date: string;
  totalViews: number;
}

export interface ClickCountsData {
  date: string;
  totalClicks: number;
}

export interface AvgSessionSecsData {
  date: string;
  avgSessionSeconds: number;
}

export interface SessionsPerUsersData {
  date: string;
  totalVisitors: number;
  totalClicks: number;
  sessionsPerUser: number;
}

export interface UsersOverTimeData {
  date: string;
  dailyUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
}

export interface EventCountsData {
  date: string;
  eventName: string;
  eventCount: number;
  userCount: number;
  avgEventPerUser: number;
}

export interface PageStatsData {
  pagePath: string;
  pageViews: number;
  activeUsers: number;
  pageviewsPerUser: number;
  avgEngagementTimeSec: number;
  totalEvents: number;
}