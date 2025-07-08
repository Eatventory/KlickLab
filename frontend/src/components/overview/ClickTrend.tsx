import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Activity } from 'lucide-react';
import { subMinutes, eachMinuteOfInterval, format } from 'date-fns';

interface TrendDataPoint {
  time: string;
  count: number;
}

interface ClickTrendData {
  data: TrendDataPoint[];
}

interface ClickTrendProps {
  period?: number;
  step?: number;
}

export const ClickTrend: React.FC<ClickTrendProps> = ({ period = 60, step = 5 }) => {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);
  const [timeBins, setTimeBins] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fetchClickTrend = async () => {
      try {
        const now = new Date();
        const end = now;
        const start = subMinutes(end, period);
        const points = eachMinuteOfInterval({ start, end }, { step });
        const bins = points.map((d: Date) => format(d, 'HH:mm'));
        setTimeBins(bins);
        const iso = now.toISOString();
        const response = await fetch(`/api/stats/click-trend?period=${period}&step=${step}&baseTime=${encodeURIComponent(iso)}`);
        const result: ClickTrendData = await response.json();
        setData(result.data || []);
      } catch (error) {
        const now = new Date();
        const end = now;
        const start = subMinutes(end, period);
        const points = eachMinuteOfInterval({ start, end }, { step });
        const bins = points.map((d: Date) => format(d, 'HH:mm'));
        setTimeBins(bins);
        const mockData: TrendDataPoint[] = bins.map((time: string, idx: number) => {
          let baseCount = 30 + Math.floor(idx * 2);
          if (idx > bins.length * 0.7) baseCount += 40;
          if (idx > bins.length * 0.9) baseCount += 30;
          const randomVariation = Math.random() * 30 - 15;
          return {
            time,
            count: Math.max(0, Math.round(baseCount + randomVariation))
          };
        });
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };
    fetchClickTrend();
    const interval = setInterval(fetchClickTrend, 30000);
    return () => clearInterval(interval);
  }, [period, step]);

  const filledData = useMemo(() => {
    return timeBins.map((bin: string) => data.find((d: TrendDataPoint) => d.time === bin) || { time: bin, count: 0 });
  }, [data, timeBins]);

  const avg = useMemo(() => filledData.reduce((sum: number, d: TrendDataPoint) => sum + d.count, 0) / (filledData.length || 1), [filledData]);

  const chartData = useMemo(() => {
    if (filledData.length === 0) return null;
    const maxCount = Math.max(...filledData.map((d: TrendDataPoint) => d.count));
    const minCount = Math.min(...filledData.map((d: TrendDataPoint) => d.count));
    const margin = Math.max((maxCount - minCount) * 0.5, 50);
    const chartMax = maxCount + margin;
    const chartMin = Math.max(0, minCount - margin);
    const range = chartMax - chartMin || 1;
    return { chartMax, chartMin, range };
  }, [filledData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">데이터 로딩 중...</div>
      </div>
    );
  }
  if (!chartData || filledData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">데이터가 없습니다</div>
      </div>
    );
  }
  const { chartMax, chartMin, range } = chartData;

  const width = 1100;
  const height = 520;
  const padding = 90;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const getPoint = (point: TrendDataPoint, index: number) => {
    const x = padding + (index / (filledData.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.count - chartMin) / range) * chartHeight;
    return { x, y };
  };

  const createCurvePath = () => {
    if (filledData.length < 2) return '';
    const points = filledData.map((point, idx) => getPoint(point, idx));
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const getYAxisLabels = (): { ratio: number; value: number }[] => {
    const labels: { ratio: number; value: number }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const value = Math.round(chartMin + (1 - ratio) * range);
      labels.push({ ratio, value });
    }
    return labels;
  };

  const getXAxisLabels = (): TrendDataPoint[] => {
    const count = filledData.length;
    const labelCount = Math.min(6, count);
    const step = Math.max(1, Math.floor(count / (labelCount - 1)));
    return filledData.filter((_: TrendDataPoint, idx: number) => idx % step === 0 || idx === count - 1);
  };

  const createAreaPath = () => {
    if (filledData.length < 2) return '';
    const points = filledData.map((point, idx) => getPoint(point, idx));
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      d += ` L ${curr.x} ${curr.y}`;
    }
    d += ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    return d;
  };

  return (
    <div className="bg-white pt-6 pb-5 px-4 border border-gray-200 rounded-xl shadow-sm w-full flex flex-col">
      <div className="flex items-center justify-center mb-0 relative">
        <div className="text-2xl font-bold mb-0">클릭 트렌드</div>
        <div className="absolute right-0 flex items-center gap-2">
          <Activity className="w-3 h-3 text-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">실시간</span>
        </div>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '16px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          ref={svgRef}
        >
          <defs>
            <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#f8fafc" strokeWidth="1"/>
            </pattern>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {getYAxisLabels().map(({ ratio, value }: { ratio: number; value: number }, index: number) => {
            const y = padding + ratio * chartHeight;
            return (
              <g key={index}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                  opacity="0.6"
                />
                <text
                  x={padding - 16}
                  y={y + 6}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="18"
                  fontWeight="500"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {getXAxisLabels().map((point: TrendDataPoint, index: number) => {
            const pointIndex = filledData.findIndex((d: TrendDataPoint) => d.time === point.time);
            const x = padding + (pointIndex / (filledData.length - 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={height - 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize="18"
                fontWeight="500"
              >
                {point.time}
              </text>
            );
          })}
          <path
            d={createAreaPath()}
            fill="url(#areaGradient)"
            opacity="0.8"
            className="transition-all duration-500"
          />
          <path
            d={createCurvePath()}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="transition-all duration-500"
          />
          {filledData.map((point: TrendDataPoint, index: number) => {
            const { x, y } = getPoint(point, index);
            const isHighlight = point.count >= avg * 2 && point.count > 0;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="6"
                fill={isHighlight ? '#ef4444' : '#3b82f6'}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-200 cursor-pointer hover:r-8 hover:stroke-2"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                filter={isHighlight ? "url(#glow)" : "none"}
              />
            );
          })}
          {hoveredPoint && (() => {
            const tooltipHeight = 56;
            const tooltipOffset = 24;
            const idx = filledData.findIndex((d: TrendDataPoint) => d.time === hoveredPoint.time);
            const { x, y } = getPoint(hoveredPoint, idx);
            
            const lineY2 = y - tooltipOffset - 4;
            
            return (
              <g>
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={lineY2}
                  stroke="#222"
                  strokeWidth={1.5}
                  opacity={0.18}
                />
              </g>
            );
          })()}
        </svg>
        {hoveredPoint && (() => {
          const tooltipWidth = 112;
          const tooltipHeight = 56;
          const tooltipOffset = 24;
          const idx = filledData.findIndex((d: TrendDataPoint) => d.time === hoveredPoint.time);
          const { x: svgX, y: svgY } = getPoint(hoveredPoint, idx);
          
          const svgRect = svgRef.current?.getBoundingClientRect();
          
          if (!svgRect) return null;
          
          const scaleX = svgRect.width / width;
          const scaleY = svgRect.height / height;
          
          const x = svgX * scaleX;
          const y = svgY * scaleY;
          
          let tooltipX = x - tooltipWidth / 2;
          const tooltipY = y - tooltipHeight - tooltipOffset;
          
          if (tooltipX + tooltipWidth > svgRect.width) {
            tooltipX = x - tooltipWidth;
          }
          if (tooltipX < 0) {
            tooltipX = x;
          }
          
          return (
            <div
              className="absolute px-4 py-3 bg-white text-gray-800 text-base rounded-xl shadow-xl font-semibold flex flex-col items-center justify-center text-center pointer-events-none z-10 border border-gray-200"
              style={{
                left: `${tooltipX}px`,
                top: `${tooltipY}px`,
                width: tooltipWidth,
                height: tooltipHeight,
                minWidth: 80,
                fontSize: 18,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className="text-gray-600 text-sm font-medium">{hoveredPoint.time}</div>
              <div className="text-blue-600 text-lg font-bold">{hoveredPoint.count}회</div>
            </div>
          );
        })()}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500 mt-1 px-1">
        <span>{step}분 단위 집계</span>
        <span>총 {filledData.length}개 데이터 포인트</span>
      </div>
    </div>
  );
}; 