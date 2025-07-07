import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';

interface SummaryData {
  dailyVisitors: number;
  dailyClicks: number;
  topButton: string;
  topButtonClicks: number;
  clickTrend: '증가' | '감소' | '안정';
  visitorChange: number;
  clickChange: number;
}

export const SummaryCard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    dailyVisitors: 1247,
    dailyClicks: 892,
    topButton: '로그인',
    topButtonClicks: 245,
    clickTrend: '증가',
    visitorChange: 12.5,
    clickChange: 8.2
  });

  const [isGenerating, setIsGenerating] = useState(false);
  // 템플릿 기반 요약 문장 생성
  const generateSummary = (data: SummaryData): string[] => {
    const summaries: string[] = [];

    // 방문자 관련 요약
    if (data.visitorChange > 0) {
      summaries.push(`오늘 ${data.dailyVisitors.toLocaleString()}명이 방문하여 전일 대비 ${data.visitorChange}% 증가했습니다.`);
    } else if (data.visitorChange < 0) {
      summaries.push(`오늘 ${data.dailyVisitors.toLocaleString()}명이 방문하여 전일 대비 ${Math.abs(data.visitorChange)}% 감소했습니다.`);
    } else {
      summaries.push(`오늘 ${data.dailyVisitors.toLocaleString()}명이 방문하여 전일과 동일한 수준을 유지했습니다.`);
    }

    // 클릭 활동 관련 요약
    if (data.clickChange > 0) {
      summaries.push(`총 ${data.dailyClicks.toLocaleString()}회의 클릭이 발생하여 전일 대비 ${data.clickChange}% 증가했습니다.`);
    } else {
      summaries.push(`총 ${data.dailyClicks.toLocaleString()}회의 클릭이 발생했습니다.`);
    }

    // Top 클릭 버튼 관련 요약
    summaries.push(`가장 많이 클릭된 버튼은 '${data.topButton}'으로 ${data.topButtonClicks}회 클릭되었습니다.`);

    // 클릭 트렌드 관련 요약
    if (data.clickTrend === '증가') {
      summaries.push(`클릭 트렌드는 증가 추세를 보이고 있어 사용자 참여도가 높아지고 있습니다.`);
    } else if (data.clickTrend === '감소') {
      summaries.push(`클릭 트렌드는 감소 추세를 보이고 있어 사용자 참여도 개선이 필요합니다.`);
    } else {
      summaries.push(`클릭 트렌드는 안정적인 수준을 유지하고 있습니다.`);
    }

    return summaries;
  };

  const handleRefresh = () => {
    setIsGenerating(true);
    // 실제로는 API 호출로 최신 데이터 가져오기
    setTimeout(() => {
      setSummaryData(prev => ({
        ...prev,
        dailyVisitors: Math.floor(Math.random() * 500) + 1000,
        dailyClicks: Math.floor(Math.random() * 300) + 800
      }));
      setIsGenerating(false);
    }, 1000);
  };

  const summaries = generateSummary(summaryData);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI 요약</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? '생성 중...' : '새로고침'}
        </button>
      </div>
      
      <div className="space-y-3">
        {summaries.map((summary, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {summary}
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          💡 이 요약은 실시간 데이터를 기반으로 자동 생성됩니다.
        </p>
      </div>
    </div>
  );
}; 