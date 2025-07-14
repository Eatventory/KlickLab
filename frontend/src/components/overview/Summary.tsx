import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface Metric {
  name: string;
  value: number;
  prevValue: number;
  unit: string;
  label: string;
}

export const Summary: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const [summaryArr, setSummaryArr] = useState<string[]>([]);

  useEffect(() => {
    const metrics: Metric[] = [
      { name: '방문자 수', value: 1200, prevValue: 1043, unit: '명', label: 'visitors' },
      { name: '전환율', value: 8.2, prevValue: 10.3, unit: '%', label: 'conversionRate' },
      { name: '클릭 수', value: 9800, prevValue: 9333, unit: '회', label: 'clicks' },
      { name: '세션 시간', value: 192, prevValue: 192, unit: '초', label: 'sessionDuration' },
    ];
    const mockTopClicks = [
      { label: '구매하기', count: 1203 },
      { label: '장바구니', count: 987 },
      { label: '로그인', count: 756 }
    ];
    const mockTotalClicks = 5000;
    let clickSummary = '';
    if (mockTopClicks.length > 0 && mockTotalClicks > 0) {
      const topItem = mockTopClicks[0];
      const percentage = ((topItem.count / mockTotalClicks) * 100).toFixed(1);
      clickSummary = `오늘 가장 많이 클릭된 요소는 <strong>${topItem.label}</strong>로, 전체 클릭의 <strong>${percentage}%</strong>를 차지했습니다.`;
    }
    const kpiLine = generateKpiLine(metrics);
    const { comment } = generateInsightSummary(metrics);
    const arr = [clickSummary, kpiLine, comment].filter(Boolean);
    setSummaryArr(arr);
  }, [refreshKey]);

  function getChangeRate(today: number, yesterday: number): number {
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100 * 10) / 10;
  }

  function makeChangeWord(isIncrease: boolean, isDecrease: boolean) {
    const color = isIncrease ? '#e11d48' : isDecrease ? '#2563eb' : '#111';
    const fontWeight = 'bold';
    if (isIncrease) return `<strong style="color:${color};font-weight:${fontWeight};">증가</strong>`;
    if (isDecrease) return `<strong style="color:${color};font-weight:${fontWeight};">감소</strong>`;
    return '변화';
  }

  function generateKpiLine(metrics: Metric[]) {
    const kpiLabels = ['visitors', 'conversionRate', 'clicks'];
    const kpiMetrics = metrics.filter(m => kpiLabels.includes(m.label));
    const changes = kpiMetrics.map(m => getChangeRate(m.value, m.prevValue));
    const parts = kpiMetrics.map((m, i) => {
      const isIncrease = changes[i] > 0;
      const isDecrease = changes[i] < 0;
      const valueStr = `${m.value.toLocaleString()}${m.unit}`;
      const changeColor = isIncrease ? '#e11d48' : isDecrease ? '#2563eb' : '#111';
      const fontWeight = 'bold';
      const changeStr = `<strong style="color:${changeColor};font-weight:${fontWeight};">${Math.abs(changes[i])}%</strong>`;
      const changeWord = makeChangeWord(isIncrease, isDecrease);
      let verb = '';
      if (i === 0) {
        verb = isIncrease ? `${changeWord}했고,` : isDecrease ? `${changeWord}했고,` : '변화가 없었고,';
      } else if (i === 1) {
        verb = isIncrease ? `${changeWord}했으며,` : isDecrease ? `${changeWord}했으며,` : '변화가 없었으며,';
      } else {
        verb = isIncrease ? `${changeWord}했습니다.` : isDecrease ? `${changeWord}했습니다.` : '변화가 없었습니다.';
      }
      let labelStr = '';
      if (m.name === '전환율') {
        labelStr = '전환율이';
      } else if (m.name === '클릭 수') {
        labelStr = `${m.name}는`;
      } else {
        labelStr = `${m.name}가`;
      }
      return `<span style="color:#111;">${labelStr} ${valueStr}으로 ${changeStr} ${verb}</span>`;
    });
    return parts.join(' ');
  }

  function makeSummaryComment(metrics: Metric[], changes: number[]) {
    const visitor = metrics.find((m) => m.label === 'visitors');
    const conversion = metrics.find((m) => m.label === 'conversionRate');
    const visitorChange = changes[metrics.findIndex((m) => m.label === 'visitors')];
    const conversionChange = changes[metrics.findIndex((m) => m.label === 'conversionRate')];
    if (visitor && conversion) {
      if (visitorChange > 0 && conversionChange < 0) {
        return '방문자는 늘었지만 전환율이 하락해 품질 개선이 필요합니다.';
      }
      if (visitorChange > 0 && conversionChange > 0) {
        return '방문자와 전환율이 모두 증가해 긍정적인 신호입니다.';
      }
      if (visitorChange < 0 && conversionChange < 0) {
        return '방문자와 전환율이 모두 감소해 주의가 필요합니다.';
      }
    }
    return '';
  }

  function generateInsightSummary(metrics: Metric[]) {
    const changes = metrics.map((m) => getChangeRate(m.value, m.prevValue));
    const comment = makeSummaryComment(metrics, changes);
    return { comment };
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm leading-relaxed space-y-1" style={{ color: '#111' }}>
            {summaryArr.length > 0
              ? summaryArr.map((line, idx) => (
                  <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />
                ))
              : <div>오늘의 데이터를 분석 중입니다.</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}; 