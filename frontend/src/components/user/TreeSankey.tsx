import React from "react";

// 1. 경로 데이터를 트리로 변환
function buildTree(paths) {
  const root = { name: 'root', value: 0, children: [] };
  for (const path of paths) {
    let node = root;
    for (const step of path) {
      let child = node.children.find(c => c.name === step);
      if (!child) {
        child = { name: step, value: 0, children: [] };
        node.children.push(child);
      }
      child.value += 1;
      node = child;
    }
  }
  return root;
}

// 2. 트리형 Sankey 레이아웃 (재귀적 좌표 배치)
function layoutSankeyTree(node, xStep, y0, y1, depth = 0, nodeWidth = 20) {
  node.x0 = depth * xStep;
  node.x1 = node.x0 + nodeWidth;
  node.y0 = y0;
  node.y1 = y1;
  if (!node.children || node.children.length === 0) return;
  const total = node.children.reduce((sum, c) => sum + c.value, 0);
  let y = y0;
  for (const child of node.children) {
    const h = (child.value / total) * (y1 - y0);
    layoutSankeyTree(child, xStep, y, y + h, depth + 1, nodeWidth);
    y += h;
  }
}

// 3. 트리 플랫화 (SVG 렌더링용)
function flattenTree(node, nodes = [], links = [], parent = null) {
  if (node.name !== "root") nodes.push(node);
  if (parent && node.name !== "root") {
    links.push({
      source: parent,
      target: node,
      value: node.value,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, nodes, links, node);
    }
  }
  return { nodes, links };
}

// 4. 트리형 Sankey 컴포넌트
const xStep = 120;
const nodeWidth = 20;
const height = 600;
const steps = 9;

export default function TreeSankey({ paths }) {
  // 1. 트리 변환
  const tree = React.useMemo(() => buildTree(paths), [paths]);
  // 2. 좌표 배치
  React.useMemo(() => {
    layoutSankeyTree(tree, xStep, 0, height, 0, nodeWidth);
  }, [tree]);
  // 3. 플랫 노드/링크
  const { nodes, links } = React.useMemo(() => flattenTree(tree), [tree]);

  return (
    <svg width={xStep * steps} height={height} style={{ background: "#f8fafc" }}>
      {/* 단계 라벨 */}
      {Array.from({ length: steps }).map((_, i) => (
        <text
          key={i}
          x={i * xStep + nodeWidth / 2}
          y={20}
          textAnchor="middle"
          fontSize={14}
          fill="#888"
        >
          {i === 0 ? "시작점" : `${i}단계`}
        </text>
      ))}
      {/* 링크 */}
      {links.map((l, i) => (
        <path
          key={i}
          d={`
            M${l.source.x1},${(l.source.y0 + l.source.y1) / 2}
            C${l.source.x1 + 40},${(l.source.y0 + l.source.y1) / 2}
             ${l.target.x0 - 40},${(l.target.y0 + l.target.y1) / 2}
             ${l.target.x0},${(l.target.y0 + l.target.y1) / 2}
          `}
          stroke="#b0bec5"
          strokeWidth={Math.max(1, l.value)}
          fill="none"
          opacity={0.5}
        />
      ))}
      {/* 노드 */}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect
            x={n.x0}
            y={n.y0}
            width={nodeWidth}
            height={n.y1 - n.y0}
            fill="#666"
            rx={4}
          />
          <text
            x={n.x1 + 6}
            y={(n.y0 + n.y1) / 2}
            alignmentBaseline="middle"
            fontSize={12}
            fill="#222"
          >
            {n.name} ({n.value})
          </text>
        </g>
      ))}
    </svg>
  );
} 