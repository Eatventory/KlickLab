export interface StatCardData {
    title: string;
    value: number;
    change: number;
    changeType: "increase" | "decrease" | "neutral";
    icon: string;
    color: string;
}

export interface VisitorData {
    date: string;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
}

export interface ExitPageData {
    page: string;
    exitCount: number;
    percentage: number;
}

export interface PageTimeData {
    page: string;
    averageTime: number;
    averageTimeSeconds?: number; // 초 단위 체류시간 (선택적)
    visitCount: number;
}

export interface DeviceData {
    device: string;
    users: number;
    percentage: number;
}

export interface DataTypes {
    stats: StatCardData[];
    visitorTrend: VisitorData[];
    exitPages: ExitPageData[];
    pageTimes: PageTimeData[];
    devices: DeviceData[];
}
