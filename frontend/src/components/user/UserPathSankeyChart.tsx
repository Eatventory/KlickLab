import React, { useState } from 'react';

interface PathData {
  from: string;
  to: string;
  value: number;
}

const mockData: PathData[] = [
  { from: '메인페이지', to: '상품목록', value: 120 },
  { from: '메인페이지', to: '검색', value: 85 },
  { from: '메인페이지', to: '로그인', value: 45 },
  { from: '상품목록', to: '상품상세', value: 95 },
  { from: '상품목록', to: '장바구니', value: 25 },
  { from: '검색', to: '상품상세', value: 65 },
  { from: '검색', to: '상품목록', value: 20 },
  { from: '상품상세', to: '장바구니', value: 78 },
  { from: '상품상세', to: '결제', value: 32 },
  { from: '장바구니', to: '결제', value: 45 },
  { from: '로그인', to: '마이페이지', value: 38 },
  { from: '로그인', to: '상품목록', value: 7 }
];

function computeNodeDepths(paths: PathData[]): Map<string, number> {
  const nodeDepths = new Map<string, number>();
  const allFrom = new Set(paths.map(p => p.from));
  const allTo = new Set(paths.map(p => p.to));
  const roots = Array.from(allFrom).filter(f => !allTo.has(f));
  const queue: { name: string; depth: number }[] = roots.map(r => ({ name: r, depth: 0 }));
  while (queue.length > 0) {
    const { name, depth } = queue.shift()!;
    if (nodeDepths.has(name)) continue;
    nodeDepths.set(name, depth);
    paths.filter(p => p.from === name).forEach(p => {
      queue.push({ name: p.to, depth: depth + 1 });
    });
  }
  paths.forEach(p => {
    if (!nodeDepths.has(p.to)) nodeDepths.set(p.to, 0);
    if (!nodeDepths.has(p.from)) nodeDepths.set(p.from, 0);
  });
  return nodeDepths;
}

export const UserPathSankeyChart: React.FC = () => {
  const [hoverLinkIdx, setHoverLinkIdx] = useState<number | null>(null);
  const nodeDepths = computeNodeDepths(mockData);
  const nodeMap = new Map<string, { name: string; depth: number; totalIn: number; totalOut: number }>();
  mockData.forEach(path => {
    if (!nodeMap.has(path.from)) nodeMap.set(path.from, { name: path.from, depth: nodeDepths.get(path.from)!, totalIn: 0, totalOut: 0 });
    if (!nodeMap.has(path.to)) nodeMap.set(path.to, { name: path.to, depth: nodeDepths.get(path.to)!, totalIn: 0, totalOut: 0 });
    nodeMap.get(path.from)!.totalOut += path.value;
    nodeMap.get(path.to)!.totalIn += path.value;
  });
  const depthGroups: { [depth: number]: string[] } = {};
  nodeMap.forEach(node => {
    if (!depthGroups[node.depth]) depthGroups[node.depth] = [];
    depthGroups[node.depth].push(node.name);
  });
  const depths = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);
  const chartWidth = 780;
  const chartHeight = 338;
  const nodeWidth = 143;
  const nodeHeight = 65;
  const nodeGapY = 23;
  const nodeGapX = (chartWidth - nodeWidth) / (depths.length - 1 || 1);
  const nodePositions = new Map<string, { x: number; y: number }>();
  depths.forEach((depth, dIdx) => {
    const group = depthGroups[depth];
    const totalHeight = group.length * nodeHeight + (group.length - 1) * nodeGapY;
    const startY = (chartHeight - totalHeight) / 2;
    group.forEach((name, nIdx) => {
      nodePositions.set(name, {
        x: dIdx * nodeGapX,
        y: startY + nIdx * (nodeHeight + nodeGapY)
      });
    });
  });
  const maxValue = Math.max(...mockData.map(d => d.value));
  const totalValue = mockData.reduce((sum, d) => sum + d.value, 0);

  let tooltip: null | {
    x: number;
    y: number;
    from: string;
    to: string;
    value: number;
    percent: string;
  } = null;
  if (hoverLinkIdx !== null) {
    const path = mockData[hoverLinkIdx];
    const from = nodePositions.get(path.from)!;
    const to = nodePositions.get(path.to)!;
    const x1 = from.x + nodeWidth;
    const y1 = from.y + nodeHeight / 2;
    const x2 = to.x;
    const y2 = to.y + nodeHeight / 2;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    tooltip = {
      x: mx,
      y: my,
      from: path.from,
      to: path.to,
      value: path.value,
      percent: ((path.value / totalValue) * 100).toFixed(1) + '%'
    };
  }

  return (
    <div className="flex justify-center">
      <svg width={chartWidth} height={chartHeight} style={{ position: 'relative', zIndex: 0 }}>
        <defs>
          <linearGradient id="nodeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0edff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#2563eb22" />
          </filter>
        </defs>
        {mockData.map((path, idx) => {
          const from = nodePositions.get(path.from);
          const to = nodePositions.get(path.to);
          if (!from || !to) return null;
          const strokeWidth = (path.value / maxValue) * 32 + 4.5;
          const opacity = hoverLinkIdx === null
            ? (path.value / maxValue) * 0.5 + 0.3
            : (hoverLinkIdx === idx ? 0.95 : 0.15);
          const color = hoverLinkIdx === idx ? '#2563eb' : '#bdbdbd';
          
          const x1 = from.x + nodeWidth - 5;
          const y1 = from.y + nodeHeight / 2;
          const x2 = to.x + 5;
          const y2 = to.y + nodeHeight / 2;
          const mx = (x1 + x2) / 2;
          
          return (
            <path
              key={idx}
              d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
              stroke={color}
              strokeWidth={hoverLinkIdx === idx ? strokeWidth + 7.8 : strokeWidth}
              strokeLinecap="round"
              fill="none"
              opacity={opacity}
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={() => setHoverLinkIdx(idx)}
              onMouseLeave={() => setHoverLinkIdx(null)}
            />
          );
        })}
        {Array.from(nodeMap.values()).map((node) => {
          const pos = nodePositions.get(node.name)!;
          const isStart = node.depth === 0;
          const isEnd = node.totalOut === 0;
          const isActive = hoverLinkIdx !== null && (mockData[hoverLinkIdx].from === node.name || mockData[hoverLinkIdx].to === node.name);
          return (
            <g key={node.name} transform={`translate(${pos.x},${pos.y})`} style={{ zIndex: isActive ? 2 : 1 }}>
              <rect
                width={nodeWidth}
                height={nodeHeight}
                rx={nodeHeight / 2}
                fill={isActive ? '#e0edff' : '#f3f4f6'}
                stroke={isActive ? '#2563eb' : '#d1d5db'}
                strokeWidth={isActive ? 3.5 : 1.5}
                filter="url(#nodeShadow)"
                style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              />
              <circle
                cx={23.4}
                cy={nodeHeight / 2}
                r={9.1}
                fill={isStart ? '#3b82f6' : isEnd ? '#22c55e' : '#bdbdbd'}
              />
              <text x={46.8} y={nodeHeight / 2 - 2} fontSize={15} fontWeight="bold" fill={isActive ? '#2563eb' : '#222'} style={{ letterSpacing: 0.5 }}>
                {node.name}
              </text>
              <text x={46.8} y={nodeHeight / 2 + 18} fontSize={12} fontWeight="light" fill={isActive ? '#2563eb' : '#222'}>
                {isStart ? node.totalOut : node.totalIn}명
              </text>
            </g>
          );
        })}
        {tooltip && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tooltip.x - 78}
              y={tooltip.y - 85}
              width={170}
              height={65}
              rx={12}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={1}
              filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
            />
            <text x={tooltip.x} y={tooltip.y - 65} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#1f2937">
              {tooltip.from} → {tooltip.to}
            </text>
            <text x={tooltip.x} y={tooltip.y - 45} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#2563eb">
              {tooltip.value}명
            </text>
            <text x={tooltip.x} y={tooltip.y - 25} textAnchor="middle" fontSize={12} fill="#6b7280">
              전체의 {tooltip.percent}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}; 