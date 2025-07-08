import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

interface PieData {
  label: string;
  value: number;
}

interface Props {
  data: PieData[];
  legendType: 'os' | 'browser';
}

const COLORS = ['#4F46E5', '#F59E42', '#10B981', '#6366F1', '#F43F5E', '#FACC15', '#A3A3A3'];

// 커스텀 라벨 렌더러: 퍼센티지 텍스트를 파이차트 바깥쪽에 표시
const renderCustomLabel = (props: PieLabelRenderProps) => {
  const RADIAN = Math.PI / 180;
  const radius = props.outerRadius as number;
  const cx = props.cx as number;
  const cy = props.cy as number;
  const midAngle = props.midAngle as number;
  const percent = props.percent ? (props.percent * 100).toFixed(1) : '0.0';
  // 바깥쪽(원 반지름 + 24) 위치
  const labelRadius = radius + 24;
  const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#333" fontSize={14} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {percent}%
    </text>
  );
};

export const OsBrowserPieChart: React.FC<Props> = ({ data, legendType }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <ResponsiveContainer width={400} height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label={renderCustomLabel}
            isAnimationActive={true}
            animationDuration={900}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => value.toLocaleString()} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}; 