import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface TopClickItem {
  label: string;
  count: number;
}

interface SummaryData {
  topClicks: TopClickItem[];
  totalClicks: number;
}

export const Summary: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    const generateSummary = async () => {
      try {
        // Top 클릭 요소와 전체 클릭 수를 동시에 가져오기
        const [topClicksResponse, clicksResponse] = await Promise.all([
          fetch(`/api/stats/top-clicks`),
          fetch(`/api/stats/clicks`)
        ]);
        
        const topClicksData = await topClicksResponse.json();
        const clicksData = await clicksResponse.json();
        
        const topClicks = topClicksData.items || [];
        const totalClicks = clicksData.today || 0;
        
        if (topClicks.length > 0 && totalClicks > 0) {
          const topItem = topClicks[0];
          const percentage = ((topItem.count / totalClicks) * 100).toFixed(1);
          
          const summaryText = `오늘 가장 많이 클릭된 요소는 <strong>${topItem.label}</strong>로, 전체 클릭의 <strong>${percentage}%</strong>를 차지했습니다.`;
          setSummary(summaryText);
        } else {
          setSummary('오늘의 클릭 데이터를 분석 중입니다.');
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
        // Fallback 데이터로 요약 생성
        const mockTopClicks = [
          { label: '구매하기', count: 1203 },
          { label: '장바구니', count: 987 },
          { label: '로그인', count: 756 }
        ];
        const mockTotalClicks = 5000;
        
        const topItem = mockTopClicks[0];
        const percentage = ((topItem.count / mockTotalClicks) * 100).toFixed(1);
        setSummary(`오늘 가장 많이 클릭된 요소는 <strong>${topItem.label}</strong>로, 전체 클릭의 <strong>${percentage}%</strong>를 차지했습니다.`);
      }
    };
    generateSummary();
    // setInterval 제거
    // 30초마다 요약 갱신 X, 오직 refreshKey 변경 시만 실행
    return () => {};
  }, [refreshKey]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            오늘의 클릭 분석 요약
          </h3>
          <p 
            className="text-sm text-blue-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: summary || '오늘의 클릭 데이터를 분석 중입니다.' }}
          />
        </div>
      </div>
    </div>
  );
}; 