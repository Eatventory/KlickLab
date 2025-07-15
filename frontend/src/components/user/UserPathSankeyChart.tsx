import React, { useState, useEffect } from 'react';

interface PathData {
  from: string;
  to: string;
  value: number;
}

interface Props {
  data?: PathData[];
}

function computeNodeDepths(paths?: PathData[]): Map<string, number> {
  const safePaths = Array.isArray(paths) ? paths : [];
  const nodeDepths = new Map<string, number>();
  const allFrom = new Set(safePaths.map(p => p.from));
  const allTo = new Set(safePaths.map(p => p.to));
  // const roots = Array.from(allFrom).filter(f => !allTo.has(f));
  let roots = Array.from(allFrom).filter(f => !allTo.has(f));
  if (roots.length === 0 && allFrom.size > 0) {
    // fallback: 가장 많이 등장한 from을 루트로 설정
    const freqMap = new Map<string, number>();
    for (const p of safePaths) {
      freqMap.set(p.from, (freqMap.get(p.from) || 0) + p.value);
    }
    const [mostCommonFrom] = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1])[0] || [];
    if (mostCommonFrom) roots = [mostCommonFrom];
  }
  const queue: { name: string; depth: number }[] = roots.map(r => ({ name: r, depth: 0 }));
  while (queue.length > 0) {
    const { name, depth } = queue.shift()!;
    if (nodeDepths.has(name)) continue;
    nodeDepths.set(name, depth);
    safePaths.filter(p => p.from === name).forEach(p => {
      queue.push({ name: p.to, depth: depth + 1 });
    });
  }
  safePaths.forEach(p => {
    if (!nodeDepths.has(p.to)) nodeDepths.set(p.to, 0);
    if (!nodeDepths.has(p.from)) nodeDepths.set(p.from, 0);
  });
  return nodeDepths;
}

interface UserPathSankeyChartProps {
  data?: any[];
  refreshKey?: number;
  loading?: boolean;
}

export const UserPathSankeyChart: React.FC<UserPathSankeyChartProps> = ({ data: propData, refreshKey, loading }) => {
  const [data, setData] = useState<any[]>(propData || []);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // propData가 변경되면 내부 상태도 업데이트
  useEffect(() => {
    if (propData) {
      setData(propData);
    }
  }, [propData]);

  // propData가 없고 refreshKey가 있을 때만 자체 API 호출
  useEffect(() => {
    if (!propData && refreshKey !== undefined) {
      const fetchUserPath = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
          if (!token) throw new Error("No token");
          
          const url = selectedSegment 
            ? `/api/stats/userpath-summary?segment=${selectedSegment}`
            : '/api/stats/userpath-summary';
            
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error('데이터를 불러올 수 없습니다.');
          }
          
          const result = await response.json();
          setData(result.data || []);
        } catch (error) {
          console.error('Sankey API Error:', error);
          setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
          setData([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserPath();
    }
  }, [refreshKey, propData, selectedSegment]);

  const handleSegmentChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSegment = event.target.value;
    setSelectedSegment(newSegment);
    await fetchUserPath(newSegment);
  };
  
  const fetchUserPath = async (segment: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
  
      const url = segment
        ? `/api/stats/userpath-summary?segment=${segment}`
        : '/api/stats/userpath-summary';
  
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');
  
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Sankey API Error:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSegmentTitle = () => {
    switch (selectedSegment) {
      case 'converted':
        return '전환 완료 사용자 경로';
      case 'abandoned_cart':
        return '장바구니 이탈 사용자 경로';
      default:
        return '전체 사용자 경로';
    }
  };

  const [topPercent, setTopPercent] = useState<number>(90); // 기본값: 상위 90%
  const safeData = Array.isArray(data) ? data : [];
  const sortedData = [...safeData].sort((a, b) => b.value - a.value);
  const total = sortedData.reduce((sum, d) => sum + d.value, 0);
  let running = 0;
  const filteredData = sortedData.filter((d) => {
    running += d.value;
    return running <= total * (topPercent / 100);
  });
  const [hoverLinkIdx, setHoverLinkIdx] = useState<number | null>(null);
  const nodeDepths = computeNodeDepths(filteredData);
  const nodeMap = new Map<string, { name: string; depth: number; totalIn: number; totalOut: number }>();
  filteredData.forEach(path => {
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
  const maxValue = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.value)) : 0;
  const totalValue = filteredData.reduce((sum, d) => sum + d.value, 0);

  let tooltip: null | {
    x: number;
    y: number;
    from: string;
    to: string;
    value: number;
    percent: string;
  } = null;
  if (hoverLinkIdx !== null && filteredData[hoverLinkIdx]) {
    const path = filteredData[hoverLinkIdx];
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
    <div className="w-full">
      {/* 세그먼트 선택 UI */}
      <div className="flex justify-end items-center mb-4 gap-2">
        <select
          value={topPercent}
          onChange={(e) => setTopPercent(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={100}>전체</option>
          <option value={95}>상위 95%</option>
          <option value={90}>상위 90%</option>
          <option value={80}>상위 80%</option>
          <option value={70}>상위 70%</option>
        </select>
        <select
          value={selectedSegment}
          onChange={handleSegmentChange}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">전체 사용자</option>
          <option value="converted">전환 완료 사용자</option>
          <option value="abandoned_cart">장바구니 이탈 사용자</option>
        </select>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-center">
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* 데이터 없음 상태 */}
      {!isLoading && !error && filteredData.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 text-center">
            <div className="text-sm">표시할 경로 데이터가 없습니다.</div>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredData.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 text-center text-sm">
            상위 {topPercent}% 안에 포함되는 경로가 없습니다.
          </div>
        </div>
      )}

      {/* Sankey 차트 */}
      {!isLoading && !error && filteredData.length > 0 && (
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
            {filteredData.map((path, idx) => {
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
              const isActive = hoverLinkIdx !== null && filteredData[hoverLinkIdx] && (filteredData[hoverLinkIdx].from === node.name || filteredData[hoverLinkIdx].to === node.name);
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
      )}
    </div>
  );
}; 