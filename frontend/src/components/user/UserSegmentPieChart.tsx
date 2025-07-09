import React from 'react';

interface SegmentData {
  type: string;
  value: number;
}

interface Props {
  data: SegmentData[];
}

const COLORS = ['#4F46E5', '#F59E42'];

export const UserSegmentPieChart: React.FC<Props> = ({ data }) => {
  // 안전한 숫자 변환 및 유효성 검사
  const safeData = data.map(d => ({
    ...d,
    value: Number(d.value) || 0
  })).filter(d => d.value > 0);

  const total = safeData.reduce((sum, d) => sum + d.value, 0);

  // 파이차트는 SVG로 간단히 구현
  let startAngle = 0;
  const radius = 60;
  const center = 70;

  const getPath = (value: number, total: number, startAngle: number) => {
    if (total === 0) return '';
    
    const angle = (value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const startRadians = (Math.PI / 180) * startAngle;
    const endRadians = (Math.PI / 180) * endAngle;

    const x1 = center + radius * Math.cos(startRadians);
    const y1 = center + radius * Math.sin(startRadians);
    const x2 = center + radius * Math.cos(endRadians);
    const y2 = center + radius * Math.sin(endRadians);

    return [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
  };

  return (
    <div className="flex flex-col items-center" style={{ minHeight: 220, paddingTop: 16 }}>
      <svg width={140} height={160}>
        {safeData.length === 0 ? (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#ccc">
            없음
          </text>
        ) : (
          safeData.map((d, i) => {
            const path = getPath(d.value, total, startAngle);
            const color = COLORS[i % COLORS.length];
            const angle = total > 0 ? (d.value / total) * 360 : 0;
            const midAngle = startAngle + angle / 2;
            const labelX = center + (radius + 18) * Math.cos((Math.PI / 180) * midAngle);
            const labelY = center + (radius + 18) * Math.sin((Math.PI / 180) * midAngle) + 10;
            const percent = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
            startAngle += angle;
            return (
              <g key={d.type}>
                <path d={path} fill={color} stroke="#fff" strokeWidth={2} />
                <text x={labelX} y={labelY} fontSize={12} textAnchor="middle" fill="#333">
                  {percent}%
                </text>
              </g>
            );
          })
        )}
      </svg>
      {/* 범례 */}
      <div className="flex gap-4 mt-4">
        {safeData.map((d, i) => (
          <div
            key={d.type}
            className={"flex items-center gap-1 px-2 py-1 rounded text-sm border bg-gray-100 border-blue-500"}
          >
            <span style={{ width: 12, height: 12, background: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 6 }} />
            {d.type}
          </div>
        ))}
      </div>
    </div>
  );
}; 