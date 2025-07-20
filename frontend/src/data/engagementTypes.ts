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
  datetime: string;
  totalVisitors: number;
  existingVisitors: number;
  newVisitors: number;
}


export interface RevisitData {
  date: string;
  dau: number;
  wau: number;
  mau: number;
  dauWauRatio: number;
  dauMauRatio: number;
  wauMauRatio: number;
}

export interface EventCountsData {
  date: string;
  eventName: string;
  eventCount: number;
  userCount: number;
  avgEventPerUser: number;

}

export interface PageStatsData {
  date: string;
  pagePath: string;
  pageViews: number;
  activeUsers: number;
  pageviewsPerUser: number;
  avgEngagementTimeSec: number;
  totalEvents: number;
}

export interface VisitStatsData {
  date: string;
  pagePath: string;
  sessions: number;
  activeUsers: number;
  newVisitors: number;
  avgSessionSeconds: number;
}