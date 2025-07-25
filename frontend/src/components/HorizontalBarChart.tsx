import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface BarChartItem {
  label: string;
  value: number; // 퍼센트 등 그래프 기준
  raw?: any;     // 툴팁 등에 활용할 원본 값
}

interface HorizontalBarChartProps {
  data: BarChartItem[];
  tooltipRenderer?: (item: BarChartItem) => React.ReactNode;
  isLoading?: boolean;
  valueFormatter?: (value: number, raw?: any) => string;
  useAbsolutePercentage?: boolean; // 절대적인 퍼센트 사용 여부 (이탈률 등)
}

const AnimatedBar: React.FC<{ percentage: number }> = ({ percentage }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setWidth(percentage), 10);
    return () => clearTimeout(timeout);
  }, [percentage]);

  return (
    <div className="relative w-full h-1 bg-gray-200 mt-1 overflow-hidden">
      <div
        className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, tooltipRenderer, isLoading, valueFormatter, useAbsolutePercentage = false }) => {
  const [hoveredItem, setHoveredItem] = useState<BarChartItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const { width, height } = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width, height });
    }
  }, [hoveredItem]);

  const adjustedX = tooltipPosition.x + tooltipSize.width + 12 > window.innerWidth
    ? tooltipPosition.x - tooltipSize.width - 12
    : tooltipPosition.x + 12;
  const adjustedY = tooltipPosition.y + tooltipSize.height + 12 > window.innerHeight
    ? tooltipPosition.y - tooltipSize.height - 12
    : tooltipPosition.y + 12;

  const maxValue = Math.max(...data.map(d => d.value));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 mt-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1 px-1">
            <div className="flex justify-between items-center text-sm">
              <div className="bg-gray-200 rounded w-1/3 h-4" />
              <div className="bg-gray-200 rounded w-10 h-4" />
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {data.map((item) => {
        const percentage = useAbsolutePercentage 
          ? Math.min(item.value, 100) // 절대적 퍼센트 사용 (최대 100%)
          : maxValue > 0 ? (item.value / maxValue) * 100 : 0; // 상대적 퍼센트 사용

        return (
          <div
            key={item.label}
            className="relative group px-1 py-1.5"
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
            onMouseMove={(e) => {
              setTooltipPosition({ x: e.clientX + 12, y: e.clientY + 12 });
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden hover:bg-gray-100 p-1">
                <div className="flex justify-between items-center text-sm text-gray-800">
                  <span className="truncate">{item.label}</span>
                  <span className="ml-2 font-semibold">
                    {valueFormatter ? valueFormatter(item.value, item.raw) : `${item.value.toFixed(1)}%`}
                  </span>
                </div>
                <AnimatedBar percentage={percentage} />
              </div>
            </div>

            {hoveredItem?.label === item.label && tooltipRenderer && (
              <div
                ref={tooltipRef}
                className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg text-sm text-gray-800 px-3 py-2 whitespace-nowrap"
                style={{
                  top: adjustedY,
                  left: adjustedX,
                  pointerEvents: 'none',
                }}
              >
                {tooltipRenderer(item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HorizontalBarChart;
