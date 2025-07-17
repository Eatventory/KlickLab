import React from 'react';
import clsx from 'clsx';

interface MetricTab {
  key: string;
  label: string;
  value: string; // 예: '30만'
}

interface ChartWrapperProps {
  metrics: MetricTab[];
  selectedKey: string;
  onSelect: (key: string) => void;
  children: React.ReactNode; // HorizontalLineChart
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  metrics,
  selectedKey,
  onSelect,
  children,
}) => {
  return (
    <div>
      {/* 상단 지표 탭 */}
      <div className="flex items-end gap-6 mb-4">
        {metrics.map(({ key, label, value }) => (
          <div
            key={key}
            onClick={() => onSelect(key)}
            className="cursor-pointer"
          >
            <div
              className={clsx(
                'text-sm font-medium',
                key === selectedKey ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              {label}
            </div>
            <div
              className={clsx(
                'text-2xl font-bold',
                key === selectedKey ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
};

export default ChartWrapper;
