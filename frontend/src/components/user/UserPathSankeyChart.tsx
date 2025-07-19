import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
// TreeSankey import 제거

const TOP_N = 7;

function getTopNodesWithEtc(nodes, N, depth) {
  if (nodes.length <= N) return nodes;
  const top = nodes.slice(0, N);
  const etc = {
    id: `etc-${depth}`,
    name: `외 ${nodes.length - N}개`,
    isEtc: true,
    count: nodes.slice(N).reduce((sum, n) => sum + n.count, 0),
    children: nodes.slice(N),
    depth,
  };
  return [...top, etc];
}

function createGASankeyDataWithEtc(paths, selectedPath, expandedGroups) {
  // 1. 경로 필터링 (드릴다운)
  const filtered = paths.filter(path => {
    for (let i = 0; i < selectedPath.length; i++) {
      if (path[i] !== selectedPath[i]) return false;
    }
    return true;
  });
  // 2. 단계별 노드 집계 (id: depth-parentId-name)
  const nodeMap = new Map(); // key: nodeId, value: node
  const linkArr: { source: string; target: string; value: number }[] = [];
  filtered.forEach((path: string[], pathIdx: number) => {
    let parentId = "root";
    for (let i = 0; i < path.length; i++) {
      const name = path[i];
      const nodeId = `${i}-${parentId}-${name}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, { id: nodeId, name, count: 0, depth: i, parentId });
      }
      nodeMap.get(nodeId).count++;
      if (i > 0) {
        linkArr.push({ source: `${i-1}-${i===1?"root":path[i-2]}-${path[i-1]}`, target: nodeId, value: 1 });
      }
      parentId = name;
    }
  });
  // 3. 단계별 상위 N개 + 외 N개 처리
  const depthMap = new Map();
  for (const node of nodeMap.values()) {
    if (!depthMap.has(node.depth)) depthMap.set(node.depth, []);
    depthMap.get(node.depth).push(node);
  }
  const nodes: any[] = [];
  const nodeOrder = [];
  for (let [depth, arr] of depthMap.entries()) {
    arr.sort((a: any, b: any) => b.count - a.count);
    let groupKey = `${depth}`;
    if (expandedGroups[groupKey]) {
      nodes.push(...arr);
      nodeOrder.push(...arr.map((n: any) => n.id));
    } else {
      const topEtc = getTopNodesWithEtc(arr, TOP_N, depth);
      nodes.push(...topEtc);
      nodeOrder.push(...topEtc.map((n: any) => n.id));
    }
  }
  // 4. '외 N개' 확장 시 children을 nodes에 추가
  Object.keys(expandedGroups).forEach(depthKey => {
    if (expandedGroups[depthKey]) {
      const depth = parseInt(depthKey, 10);
      const etcNode = nodes.find(n => n.id === `etc-${depth}`);
      if (etcNode && etcNode.children) {
        etcNode.children.forEach((child: any) => {
          if (!nodes.some((n: any) => n.id === child.id)) {
            nodes.push(child);
            nodeOrder.push(child.id);
          }
        });
      }
    }
  });
  // 5. 링크 생성 (source/target이 nodes에 반드시 존재)
  const nodeIdSet = new Set(nodeOrder);
  let links: { source: string; target: string; value: number }[] = [];
  for (const l of linkArr) {
    if (nodeIdSet.has(l.source) && nodeIdSet.has(l.target)) {
      let link = links.find(x => x.source === l.source && x.target === l.target);
      if (!link) {
        links.push({ source: l.source, target: l.target, value: 1 });
      } else {
        link.value++;
      }
    }
  }
  return { nodes, links };
}

function getAncestorNodeIds(node: any, nodeMap: Map<string, any>): Set<string> {
  const ids = new Set<string>();
  let current = node;
  while (current) {
    ids.add(current.id);
    current = nodeMap.get(current.parentId);
  }
  return ids;
}
function getAncestorLinkIds(node: any, nodeMap: Map<string, any>, linkMap: Map<string, any>): Set<string> {
  const ids = new Set<string>();
  let current = node;
  while (current && current.parentId) {
    const linkId = current.parentId + '-' + current.id;
    ids.add(linkId);
    current = nodeMap.get(current.parentId);
  }
  return ids;
}

interface UserPathSankeyChartProps {
  data: { paths: string[][] };
}
const UserPathSankeyChart = ({ data }: UserPathSankeyChartProps) => {
  const svgRef = useRef();
  
  // data가 없거나, paths가 없거나, paths가 2차원 배열이 아니면 mockSankeyPaths 강제 사용
  let rawPaths = (data && Array.isArray(data.paths) && Array.isArray(data.paths[0])) ? data.paths : [];
  let filteredPaths = rawPaths.filter(path => path[0] === "session_start");
  
  // 빈 데이터일 때 최소 2단계 dummy 경로 추가
  if (filteredPaths.length === 0) {
    filteredPaths = [["session_start", "page_view"]];
  }

  // 개별 노드 드릴다운 상태 관리 - 초기에 3단계까지 확장
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  // 분기 애니메이션 상태
  const [animateSplit, setAnimateSplit] = useState(false);
  const [showNodes, setShowNodes] = useState(true); // 노드 등장 제어
  const [splitSourceId, setSplitSourceId] = useState(null); // 분기 애니메이션 트리거 노드 id
  const [hoverNode, setHoverNode] = useState(null);

  // 초기 상태에서 1단계까지만 확장된 노드들 설정 - 한 번만 실행
  React.useEffect(() => {
    const initialExpandedNodes = new Set();
    filteredPaths.forEach(path => {
      for (let i = 0; i < Math.min(1, path.length - 1); i++) {
        if (path[i] && path[i].trim() !== '') {
          // 노드 ID에 경로 정보를 포함하여 독립적인 분기 보장 (간단한 방식)
          const pathPrefix = i === 0 ? '' : path.slice(0, i).join('-');
          const nodeId = i === 0 ? `${i}-${path[i]}` : `${i}-${pathPrefix}-${path[i]}`;
          initialExpandedNodes.add(nodeId);
        }
      }
    });
    setExpandedNodeIds(initialExpandedNodes);
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 개별 노드 드릴다운 Sankey 데이터 생성 함수 - 경로 집계 처리
  const createIndividualDrilldownSankeyData = (paths, expandedNodeIds) => {

    
    const nodeMap = new Map();
    const linkMap = new Map();
    const pathCountMap = new Map(); // 경로별 카운트 집계
    
    // 1. 먼저 동일한 경로들을 집계
    paths.forEach(path => {
      const pathKey = path.join('->');
      pathCountMap.set(pathKey, (pathCountMap.get(pathKey) || 0) + 1);
    });
    
    
    
    // 2. 집계된 경로들을 처리 - 클릭한 노드까지만 표시
    pathCountMap.forEach((count, pathKey) => {
      const path = pathKey.split('->');
      
      // 각 경로에서 표시할 최대 단계 결정
      let maxDisplayDepth = 0; // 기본적으로 시작점만 표시
      
      // 확장된 노드들을 확인하여 각 경로별 최대 표시 단계 결정
      for (let i = 0; i < path.length; i++) {
        const name = path[i];
        if (!name || name.trim() === '') continue;
        
        const pathPrefix = i === 0 ? '' : path.slice(0, i).join('-');
        const nodeId = i === 0 ? `${i}-${name}` : `${i}-${pathPrefix}-${name}`;
        
        // 시작점은 항상 표시
        if (i === 0) {
          maxDisplayDepth = i;
          continue;
        }
        
        // 부모 노드가 확장된 경우에만 다음 단계 표시
        const parentPathPrefix = i > 1 ? path.slice(0, i-1).join('-') : '';
        const parentId = i === 1 ? `${i-1}-${path[i-1]}` : `${i-1}-${parentPathPrefix}-${path[i-1]}`;
        
        if (expandedNodeIds.has(parentId)) {
          maxDisplayDepth = i;
        } else {
          // 부모 노드가 확장되지 않았으면 여기서 중단
          break;
        }
      }
      
      // 결정된 최대 단계까지만 노드와 링크 생성
      for (let i = 0; i <= maxDisplayDepth && i < path.length; i++) {
        const name = path[i];
        if (!name || name.trim() === '') continue;
        
        // 노드 ID에 경로 정보를 포함하여 독립적인 분기 보장
        const pathPrefix = i === 0 ? '' : path.slice(0, i).join('-');
        const nodeId = i === 0 ? `${i}-${name}` : `${i}-${pathPrefix}-${name}`;
        const parentPathPrefix = i > 1 ? path.slice(0, i-1).join('-') : '';
        const parentId = i > 0 ? (i === 1 ? `${i-1}-${path[i-1]}` : `${i-1}-${parentPathPrefix}-${path[i-1]}`) : null;
        
        // 노드 생성
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            id: nodeId,
            name,
            depth: i,
            parentId,
            hasChildren: i < path.length - 1 && path[i + 1] && path[i + 1].trim() !== '',
            isExpanded: expandedNodeIds.has(nodeId),
            count: 0
          });
        }
        
        // 노드 카운트 증가
        nodeMap.get(nodeId).count += count;
        
        // 링크 생성 - 부모 노드가 확장된 경우에만
        if (i > 0 && parentId && expandedNodeIds.has(parentId)) {
          const linkKey = `${parentId}->${nodeId}`;
          
          if (!linkMap.has(linkKey)) {
            linkMap.set(linkKey, {
              source: parentId,
              target: nodeId,
              value: count
            });
          } else {
            linkMap.get(linkKey).value += count;
          }
        }
      }
    });
    
    const result = {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values())
    };
    

    
    return result;
  };

  // Sankey 데이터 생성
  const sankeyData = React.useMemo(() => {
    return createIndividualDrilldownSankeyData(filteredPaths, expandedNodeIds);
  }, [filteredPaths, expandedNodeIds]);

  // 고정 height/nodePadding 사용
  const fixedHeight = 600;
  const fixedNodePadding = 20;

  // 디버깅 로그 제거 (무한 루프 방지)


  // 개별 노드 클릭 핸들러
  const handleNodeClick = (node) => {
    let changed = false;
    if (node.hasChildren) {
      setExpandedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        changed = true;
        return newSet;
      });
    }
    setSelectedNode(node);
    setAnimateSplit(true); // 분기 애니메이션 활성화
    setShowNodes(false);  // 노드 숨김 (경로 먼저)
    setSplitSourceId(node.id); // 클릭한 노드 id 저장
  };

  // 안전하게 maxDepth 계산
  const maxDepth = sankeyData.nodes.length > 0
    ? Math.max(...sankeyData.nodes.map(n => n.depth))
    : 0;

  // depths, stepWidth를 useRef로 외부에서 접근 가능하게 저장
  const depthsRef = useRef([]);
  const stepWidthRef = useRef(160);
  useEffect(() => {
    // 실제 데이터에 존재하는 depth만 추출
    const depths = Array.from(new Set(sankeyData.nodes.map(n => n.depth))).sort((a, b) => a - b);
    const stepCount = depths.length;
    const minStepWidth = 120;
    const stepWidth = Math.max(minStepWidth, 160); // 최소 120, 기본 160
    const dynamicWidth = stepWidth * (stepCount - 1) + 20 + 80; // 20은 노드 패딩, 80은 레이블 너비

    // 각 노드의 x0, x1을 depths 배열 기준으로 강제 배치 (헤더와 정렬)
    sankeyData.nodes.forEach(n => {
      const depthIdx = depths.indexOf(n.depth);
      n.x0 = stepWidth * depthIdx;
      n.x1 = n.x0 + 20; // 노드 너비 20
    });
    // width 적용
    d3.select(svgRef.current).attr("width", dynamicWidth);

    

    // 노드/링크 맵 생성
    const nodeMap = new Map(sankeyData.nodes.map(n => [n.id, n]));
    const linkMap = new Map(sankeyData.links.map(l => [l.source.id + '-' + l.target.id, l]));
    // 경로 강조용 id 집합
    const ancestorNodeIds = hoverNode ? getAncestorNodeIds(hoverNode, nodeMap) : new Set();
    const ancestorLinkIds = hoverNode ? getAncestorLinkIds(hoverNode, nodeMap, linkMap) : new Set();

    // Draw links
    d3.select(svgRef.current)
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(sankeyData.links, d => d.source.id + '-' + d.target.id)
      .join(
        enter => {
          const path = enter.append("path")
            .attr("d", sankeyLinkHorizontal())
            .attr("stroke", d =>
              hoverNode
                ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                  ? "#90caf9"
                  : "#b0bec5"
                : "#b0bec5"
            )
            .attr("stroke-opacity", d =>
              hoverNode
                ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                  ? 0.7
                  : 0.15
                : 0.4
            )
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("opacity", 1);
          // 분기 애니메이션: source가 splitSourceId인 경우에만 dasharray 애니메이션
          path.each(function(d) {
            if (splitSourceId && d.source.id === splitSourceId && animateSplit) {
              const len = this.getTotalLength();
              d3.select(this)
                .attr("stroke-dasharray", len)
                .attr("stroke-dashoffset", len)
                .transition()
                .duration(700)
                .attr("stroke-dashoffset", 0)
                .on("end", function() {
                  d3.select(this)
                    .attr("stroke-dasharray", null)
                    .attr("stroke-dashoffset", null);
                });
            }
          });
          return path;
        },
        update => update
          .attr("d", sankeyLinkHorizontal())
          .attr("stroke", d =>
            hoverNode
              ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                ? "#90caf9"
                : "#b0bec5"
              : "#b0bec5"
          )
          .attr("stroke-opacity", d =>
            hoverNode
              ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                ? 0.7
                : 0.15
              : 0.4
          )
          .attr("stroke-width", d => Math.max(1, d.width))
          .attr("opacity", 1),
        exit => exit.remove()
      );
    // Draw nodes
    d3.select(svgRef.current)
      .append("g")
      .selectAll("rect")
      .data(sankeyData.nodes, d => d.id)
      .join(
        enter => {
          const rect = enter.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d =>
              hoverNode
                ? ancestorNodeIds.has(d.id)
                  ? "#1976d2"
                  : "#bbb"
                : "#666"
            )
            .attr("opacity", d =>
              splitSourceId && d.parentId === splitSourceId && animateSplit ? 0 : (
                hoverNode
                  ? ancestorNodeIds.has(d.id)
                    ? 1
                    : 0.2
                  : 1
              )
            );
          // 분기 애니메이션: parentId가 splitSourceId인 경우에만 fade-in
          rect.filter(d => splitSourceId && d.parentId === splitSourceId && animateSplit)
            .transition()
            .duration(400)
            .attr("opacity", 1);
          return rect;
        },
        update => update
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("height", d => d.y1 - d.y0)
          .attr("width", d => d.x1 - d.x0)
          .attr("fill", d =>
            hoverNode
              ? ancestorNodeIds.has(d.id)
                ? "#1976d2"
                : "#bbb"
              : "#666"
          )
          .attr("opacity", d =>
            hoverNode
              ? ancestorNodeIds.has(d.id)
                ? 1
                : 0.2
              : 1
          ),
        exit => exit.remove()
      );
    // 이벤트 바인딩
    d3.select(svgRef.current).selectAll("rect")
      .on("mouseover", function (e, d) {
        setHoverNode(d);
        // 툴팁 위치 계산
        const tooltipWidth = 150;
        const tooltipHeight = 40;
        const padding = 10;
        let tooltipX = e.pageX + padding;
        let tooltipY = e.pageY + padding;
        if (tooltipX + tooltipWidth > window.innerWidth) {
          tooltipX = e.pageX - tooltipWidth - padding;
        }
        if (tooltipY + tooltipHeight > window.innerHeight) {
          tooltipY = e.pageY - tooltipHeight - padding;
        }
        setTooltip({ x: tooltipX, y: tooltipY, text: `${d.name} (${d.count || d.value || 0}명)` });
      })
      .on("mouseout", function (e, d) {
        setHoverNode(null);
        setTooltip(null);
      })
      .on("click", function (e, d) {
        if (onNodeClick) {
          onNodeClick(d);
        }
      })
      .style("cursor", "pointer");
    if (animateSplit) setTimeout(() => setAnimateSplit(false), 800);

    // Add labels with values (GA 스타일) - 모든 노드 텍스트를 오른쪽(x1+8, text-anchor:start)에 표시
    d3.select(svgRef.current)
      .append("g")
      .selectAll("g")
      .data(sankeyData.nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x1 + 8}, ${(d.y0 + d.y1) / 2})`)
      .style("transition", "all 0.5s ease-in-out")
      .each(function(d) {
        const g = d3.select(this);
        g.append("text")
          .attr("dy", "-0.3em")
          .attr("text-anchor", "start")
          .attr("font-size", "12px")
          .attr("font-weight", "500")
          .attr("fill", "#333")
          .text(d.name);
        g.append("text")
          .attr("dy", "0.8em")
          .attr("text-anchor", "start")
          .attr("font-size", "11px")
          .attr("fill", "#666")
          .text((d.count || d.value || Math.round((d.y1 - d.y0) * 100)).toLocaleString());
      });

    // 단계 헤더 동적 렌더링
    const headerGroup = d3.select(svgRef.current).append("g")
      .attr("transform", `translate(0, ${fixedHeight - 40})`); // 노드 그룹 아래에 헤더 배치
    headerGroup.selectAll("rect")
      .data(depths)
      .enter()
      .append("rect")
      .attr("x", (d, i) => stepWidth * i)
      .attr("y", 0)
      .attr("height", 40)
      .attr("width", stepWidth)
      .attr("fill", "#f5f5f5")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 1);
    headerGroup.selectAll("text")
      .data(depths)
      .enter()
      .append("text")
      .attr("x", (d, i) => stepWidth * i + stepWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(d => (d === 0 ? "시작점" : `+${d}단계`));

    depthsRef.current = depths;
    stepWidthRef.current = stepWidth;
  }, [sankeyData, animateSplit, showNodes, setShowNodes, splitSourceId, hoverNode]);
              
              return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sankey-container" style={{height: '100%', minHeight: 600, maxHeight: '90vh'}}>
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontWeight: 700, fontSize: 20 }}>사용자 경로(사키) 다이어그램</h2>
      </div>
      
      <div style={{ display: "flex", flexDirection: "row", marginBottom: 8 }}>
        {depthsRef.current.map((d, i) => (
          <div key={d} style={{ width: stepWidthRef.current, textAlign: "center", fontWeight: 600, color: "#888" }}>
            {i === 0 ? "시작점" : `+${i}단계`}
          </div>
        ))}
        </div>
      
      {(!sankeyData.nodes.length || !sankeyData.links.length)
        ? <div style={{ color: '#888', padding: 24 }}>경로 데이터가 없습니다.</div>
        : <SankeyChart data={sankeyData} width={800} height={fixedHeight} nodePadding={fixedNodePadding} onNodeClick={handleNodeClick} animateSplit={animateSplit} setAnimateSplit={setAnimateSplit} showNodes={showNodes} setShowNodes={setShowNodes} splitSourceId={splitSourceId} />
      }
      {/* 트리형 커스텀 Sankey 시각화 (비교용) 삭제 */}
      {selectedNode && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <strong>선택된 노드:</strong> {selectedNode.name}
          {selectedNode.hasChildren && (
            <span className="ml-2 text-blue-600">
              (클릭하여 {expandedNodeIds.has(selectedNode.id) ? '축소' : '확장'})
            </span>
          )}
        </div>
      )}
          </div>
  );
};

// SankeyChart 컴포넌트에서 nodePadding prop을 받아서 사용하도록 수정
const SankeyChart = ({ data, width = 800, height = 600, nodePadding = 20, onNodeClick, animateSplit, setAnimateSplit, showNodes, setShowNodes, splitSourceId }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [hoverNode, setHoverNode] = useState(null); // hover만 담당

  useEffect(() => {
    if (!data) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    // 노드/링크 계산을 먼저 해서 width를 동적으로 결정
    let nodes, links;
    const nodeWidth = 20;
    const height = 600;
    // d3-sankey로 기본 레이아웃 생성
    const sankeyGenerator = d3Sankey()
      .nodeId(d => d.id)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [0, 0],
        [2000, height], // 넉넉하게 임시 extent, 아래서 강제 배치
      ])
      .nodeAlign(d => d.depth)
      .nodeSort((a, b) => {
        if (a.parentId !== b.parentId) return a.parentId.localeCompare(b.parentId);
        return (b.value || 0) - (a.value || 0);
      });
    ({ nodes, links } = sankeyGenerator(data));

    // 실제 데이터에 존재하는 depth만 추출
    const depths = Array.from(new Set(nodes.map(n => n.depth))).sort((a, b) => a - b);
    const stepCount = depths.length;
    const minStepWidth = 120;
    const stepWidth = Math.max(minStepWidth, 160); // 최소 120, 기본 160
    const dynamicWidth = stepWidth * (stepCount - 1) + nodeWidth + 80;

    // 각 노드의 x0, x1을 depths 배열 기준으로 강제 배치 (헤더와 정렬)
    nodes.forEach(n => {
      const depthIdx = depths.indexOf(n.depth);
      n.x0 = stepWidth * depthIdx;
      n.x1 = n.x0 + nodeWidth;
    });
    // width 적용
    d3.select(svgRef.current).attr("width", dynamicWidth);

    // 모든 노드의 y1 중 가장 큰 값 + margin 만큼 height로 지정
    const allY1 = nodes.map(n => n.y1);
    const dynamicHeight = Math.max(...allY1) + 80; // 80은 여유 margin
    d3.select(svgRef.current).attr("height", dynamicHeight);

    // 노드/링크 맵 생성
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const linkMap = new Map(links.map(l => [l.source.id + '-' + l.target.id, l]));
    // 경로 강조용 id 집합
    const ancestorNodeIds = hoverNode ? getAncestorNodeIds(hoverNode, nodeMap) : new Set();
    const ancestorLinkIds = hoverNode ? getAncestorLinkIds(hoverNode, nodeMap, linkMap) : new Set();

    // Draw links
    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(links, d => d.source.id + '-' + d.target.id)
      .join(
        enter => {
          const path = enter.append("path")
            .attr("d", sankeyLinkHorizontal())
            .attr("stroke", d =>
              hoverNode
                ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                  ? "#90caf9"
                  : "#b0bec5"
                : "#b0bec5"
            )
            .attr("stroke-opacity", d =>
              hoverNode
                ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                  ? 0.7
                  : 0.15
                : 0.4
            )
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("opacity", 1);
          // 분기 애니메이션: source가 splitSourceId인 경우에만 dasharray 애니메이션
          path.each(function(d) {
            if (splitSourceId && d.source.id === splitSourceId && animateSplit) {
              const len = this.getTotalLength();
              d3.select(this)
                .attr("stroke-dasharray", len)
                .attr("stroke-dashoffset", len)
                .transition()
                .duration(700)
                .attr("stroke-dashoffset", 0)
                .on("end", function() {
                  d3.select(this)
                    .attr("stroke-dasharray", null)
                    .attr("stroke-dashoffset", null);
                });
            }
          });
          return path;
        },
        update => update
          .attr("d", sankeyLinkHorizontal())
          .attr("stroke", d =>
            hoverNode
              ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                ? "#90caf9"
                : "#b0bec5"
              : "#b0bec5"
          )
          .attr("stroke-opacity", d =>
            hoverNode
              ? ancestorLinkIds.has(d.source.id + '-' + d.target.id)
                ? 0.7
                : 0.15
              : 0.4
          )
          .attr("stroke-width", d => Math.max(1, d.width))
          .attr("opacity", 1),
        exit => exit.remove()
      );
    // Draw nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(nodes, d => d.id)
      .join(
        enter => {
          const rect = enter.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d =>
              hoverNode
                ? ancestorNodeIds.has(d.id)
                  ? "#1976d2"
                  : "#bbb"
                : "#666"
            )
            .attr("opacity", d =>
              splitSourceId && d.parentId === splitSourceId && animateSplit ? 0 : (
                hoverNode
                  ? ancestorNodeIds.has(d.id)
                    ? 1
                    : 0.2
                  : 1
              )
            );
          // 분기 애니메이션: parentId가 splitSourceId인 경우에만 fade-in
          rect.filter(d => splitSourceId && d.parentId === splitSourceId && animateSplit)
            .transition()
            .duration(400)
            .attr("opacity", 1);
          return rect;
        },
        update => update
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("height", d => d.y1 - d.y0)
          .attr("width", d => d.x1 - d.x0)
          .attr("fill", d =>
            hoverNode
              ? ancestorNodeIds.has(d.id)
                ? "#1976d2"
                : "#bbb"
              : "#666"
          )
          .attr("opacity", d =>
            hoverNode
              ? ancestorNodeIds.has(d.id)
                ? 1
                : 0.2
              : 1
          ),
        exit => exit.remove()
      );
    // 이벤트 바인딩
    svg.selectAll("rect")
      .on("mouseover", function (e, d) {
        setHoverNode(d);
        // 툴팁 위치 계산
        const tooltipWidth = 150;
        const tooltipHeight = 40;
        const padding = 10;
        let tooltipX = e.pageX + padding;
        let tooltipY = e.pageY + padding;
        if (tooltipX + tooltipWidth > window.innerWidth) {
          tooltipX = e.pageX - tooltipWidth - padding;
        }
        if (tooltipY + tooltipHeight > window.innerHeight) {
          tooltipY = e.pageY - tooltipHeight - padding;
        }
        setTooltip({ x: tooltipX, y: tooltipY, text: `${d.name} (${d.count || d.value || 0}명)` });
      })
      .on("mouseout", function (e, d) {
        setHoverNode(null);
        setTooltip(null);
      })
      .on("click", function (e, d) {
        if (onNodeClick) {
          onNodeClick(d);
        }
      })
      .style("cursor", "pointer");
    if (animateSplit) setTimeout(() => setAnimateSplit(false), 800);

    // Add labels with values (GA 스타일) - 모든 노드 텍스트를 오른쪽(x1+8, text-anchor:start)에 표시
    svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => {
        // 맨 위 노드는 y좌표를 최소 20 이상으로 보정
        const y = Math.max((d.y0 + d.y1) / 2, 20);
        return `translate(${d.x1 + 8}, ${y})`;
      })
      .style("transition", "all 0.5s ease-in-out")
      .each(function(d) {
        const g = d3.select(this);
        g.append("text")
          .attr("dy", "-0.3em")
          .attr("text-anchor", "start")
          .attr("font-size", "12px")
          .attr("font-weight", "500")
          .attr("fill", "#333")
          .text(d.name);
        g.append("text")
          .attr("dy", "0.8em")
          .attr("text-anchor", "start")
          .attr("font-size", "11px")
          .attr("fill", "#666")
          .text((d.count || d.value || Math.round((d.y1 - d.y0) * 100)).toLocaleString());
      });
  }, [data, animateSplit, showNodes, setShowNodes, splitSourceId, hoverNode]);
              
              return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg 
        ref={svgRef} 
        style={{ 
          display: 'block',
          cursor: 'default',
          width: '100%'
        }}
      />
            {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            background: "rgba(0,0,0,0.9)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
            maxWidth: "200px",
            wordWrap: "break-word"
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}; 

export default UserPathSankeyChart;
export { UserPathSankeyChart }; 