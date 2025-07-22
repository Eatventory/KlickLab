import React, { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { VisitorChart } from '../traffic/VisitorChart';
import { getToken } from '../../utils/storage'; // getToken 함수를 임포트합니다.

// Mock 데이터를 props로 받도록 수정
export const KpiAndTrendSection = ({ mockKpiData, mockVisitorTrend }) => {
    const [kpiData, setKpiData] = useState([]);
    const [visitorTrendData, setVisitorTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Mock 데이터가 제공되면 사용
        if (mockKpiData && mockVisitorTrend) {
            const formattedKpiData = [
                {
                    title: "활성 사용자",
                    value: mockKpiData.data.activeUsers,
                    change: mockKpiData.changes.activeUsers,
                    changeType: mockKpiData.changes.activeUsers >= 0 ? "increase" : "decrease",
                    icon: "Users",
                    color: "blue"
                },
                {
                    title: "평균 세션 시간",
                    value: mockKpiData.data.avgSessionDuration, // 초 단위
                    change: mockKpiData.changes.avgSessionDuration,
                    changeType: mockKpiData.changes.avgSessionDuration >= 0 ? "increase" : "decrease",
                    icon: "Clock",
                    color: "green"
                },
                {
                    title: "세션 주요 이벤트 비율",
                    value: mockKpiData.data.conversionRate,
                    change: mockKpiData.changes.conversionRate,
                    changeType: mockKpiData.changes.conversionRate >= 0 ? "increase" : "decrease",
                    icon: "PieChart",
                    color: "purple"
                },
                {
                    title: "참여 세션수",
                    value: mockKpiData.data.engagedSessions,
                    change: mockKpiData.changes.engagedSessions,
                    changeType: mockKpiData.changes.engagedSessions >= 0 ? "increase" : "decrease",
                    icon: "BarChart",
                    color: "red"
                }
            ];

            setKpiData(formattedKpiData);
            setVisitorTrendData(mockVisitorTrend);
            setLoading(false);
            return;
        }

        // Mock 데이터가 없으면 API 호출 (기존 코드)
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = getToken(); // localStorage.getItem('token') 대신 getToken()을 사용합니다.

                if (!token) {
                    throw new Error('Authentication token not found');
                }

                const headers = {
                    'Authorization': `Bearer ${token}`
                };

                const [kpiRes, trendRes] = await Promise.all([
                    fetch('/api/overview/kpi', { headers }),
                    fetch('/api/overview/visitor-trend', { headers })
                ]);

                if (!kpiRes.ok || !trendRes.ok) {
                    throw new Error('Failed to fetch data');
                }

                const kpiResult = await kpiRes.json();
                const trendResult = await trendRes.json();

                const formattedKpiData = [
                    {
                        title: "활성 사용자",
                        value: kpiResult.data.activeUsers,
                        change: kpiResult.changes.activeUsers,
                        changeType: kpiResult.changes.activeUsers >= 0 ? "increase" : "decrease",
                        icon: "Users",
                        color: "blue"
                    },
                    {
                        title: "평균 세션 시간",
                        value: kpiResult.data.avgSessionDuration, // 초 단위
                        change: kpiResult.changes.avgSessionDuration,
                        changeType: kpiResult.changes.avgSessionDuration >= 0 ? "increase" : "decrease",
                        icon: "Clock",
                        color: "green"
                    },
                    {
                        title: "세션 주요 이벤트 비율",
                        value: kpiResult.data.conversionRate,
                        change: kpiResult.changes.conversionRate,
                        changeType: kpiResult.changes.conversionRate >= 0 ? "increase" : "decrease",
                        icon: "PieChart",
                        color: "purple"
                    },
                    {
                        title: "참여 세션수",
                        value: kpiResult.data.engagedSessions,
                        change: kpiResult.changes.engagedSessions,
                        changeType: kpiResult.changes.engagedSessions >= 0 ? "increase" : "decrease",
                        icon: "BarChart",
                        color: "red"
                    }
                ];

                setKpiData(formattedKpiData);
                setVisitorTrendData(trendResult.data);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [mockKpiData, mockVisitorTrend]);

    // 초를 '분 초'로 변환
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}분 ${s}초`;
    };

    if (loading) return <div className="p-4 text-center">Loading...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="md:col-span-2 bg-white rounded-lg shadow p-8 flex flex-col justify-between">
          {/* KPI 카드 4개 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {kpiData.map((kpi, idx) => (
              <StatCard
                key={kpi.title}
                data={{
                  ...kpi,
                  value:
                    kpi.title === "평균 세션 시간"
                      ? formatDuration(kpi.value)
                      : kpi.title === "세션 주요 이벤트 비율"
                      ? `${kpi.value}%`
                      : kpi.value,
                  changeType: kpi.changeType
                }}
              />
            ))}
          </div>
          {/* 선그래프 (트렌드) */}
          <div className="w-full flex-1 mb-4">
            <VisitorChart data={visitorTrendData} period="daily" />
          </div>
        </div>
    );
}