import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import { mockSankeyPaths } from '../../data/mockData';

const MOCK_PATHS = [
  ["session_start", "page_view", "view_promotion", "view_item_list", "scroll", "select_item"],
  ["session_start", "page_view", "view_promotion", "view_item_list", "session_start", "page_view"],
  ["session_start", "page_view", "scroll", "leave"],
  ["session_start", "page_view", "add_to_cart", "purchase"],
  ["session_start", "page_view", "add_to_cart", "view_item_list", "purchase"],
  ["session_start", "page_view", "scroll", "add_to_cart", "purchase"],
  ["session_start", "page_view", "scroll", "leave"],
  ["session_start", "page_view", "add_to_cart", "scroll", "leave"],
  ["session_start", "page_view", "view_promotion", "view_item_list", "select_item", "purchase"],
];

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
  const linkArr = [];
  filtered.forEach((path, pathIdx) => {
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
  const nodes = [];
  const nodeOrder = [];
  for (let [depth, arr] of depthMap.entries()) {
    arr.sort((a, b) => b.count - a.count);
    let groupKey = `${depth}`;
    if (expandedGroups[groupKey]) {
      nodes.push(...arr);
      nodeOrder.push(...arr.map(n => n.id));
    } else {
      const topEtc = getTopNodesWithEtc(arr, TOP_N, depth);
      nodes.push(...topEtc);
      nodeOrder.push(...topEtc.map(n => n.id));
    }
  }
  // 4. '외 N개' 확장 시 children을 nodes에 추가
  Object.keys(expandedGroups).forEach(depthKey => {
    if (expandedGroups[depthKey]) {
      const depth = parseInt(depthKey, 10);
      const etcNode = nodes.find(n => n.id === `etc-${depth}`);
      if (etcNode && etcNode.children) {
        etcNode.children.forEach(child => {
          if (!nodes.some(n => n.id === child.id)) {
            nodes.push(child);
            nodeOrder.push(child.id);
          }
        });
      }
    }
  });
  // 5. 링크 생성 (source/target이 nodes에 반드시 존재)
  const nodeIdSet = new Set(nodeOrder);
  const links = [];
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

function createDrilldownSankeyData(paths, selectedPaths) {
  // 여러 트리 경로를 동시에 펼침
  const nodeMap = new Map();
  const links = [];
  selectedPaths.forEach(selectedPath => {
    const filtered = paths.filter(path => {
      let parentId = "root";
      for (let i = 0; i < selectedPath.length; i++) {
        const nodeId = `${i}-${parentId}-${path[i]}`;
        if (selectedPath[i] !== nodeId) return false;
        parentId = path[i];
      }
      return true;
    });
    const maxDepth = selectedPath.length + 1;
    filtered.forEach(path => {
      let parentId = "root";
      for (let i = 0; i < Math.min(path.length, maxDepth); i++) {
        const name = path[i];
        const nodeId = `${i}-${parentId}-${name}`;
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, { id: nodeId, name, depth: i, parentId, ancestorIds: selectedPath.slice(0, i) });
        }
        if (i > 0) {
          const prevId = `${i-1}-${i===1?"root":path[i-2]}-${path[i-1]}`;
          links.push({ source: prevId, target: nodeId, value: 1 });
        }
        parentId = name;
      }
    });
  });
  // 노드/링크 value 집계
  const nodes = Array.from(nodeMap.values());
  const linkMap = new Map();
  links.forEach(l => {
    const key = `${l.source}->${l.target}`;
    if (!linkMap.has(key)) linkMap.set(key, { ...l, value: 1 });
    else linkMap.get(key).value++;
  });
  return { nodes, links: Array.from(linkMap.values()) };
}

const UserPathSankeyChart = ({ data }) => {
  console.log('UserPathSankeyChart data:', data);
  console.log('UserPathSankeyChart data.paths:', data?.paths);
  // data가 없거나, paths가 없거나, paths가 2차원 배열이 아니면 mockSankeyPaths 강제 사용
  let rawPaths = (data && Array.isArray(data.paths) && Array.isArray(data.paths[0])) ? data.paths : mockSankeyPaths;
  let filteredPaths = rawPaths.filter(path => path[0] === "session_start");
  // 빈 데이터일 때 최소 2단계 dummy 경로 추가
  if (filteredPaths.length === 0) {
    filteredPaths = [["session_start", "page_view"]];
  }
  // 1단계 노드 id 추출 함수 (mockSankeyPaths에도 대응)
  const getInitialSelectedPaths = React.useCallback(() => {
    const ids = [];
    filteredPaths.forEach(path => {
      if (path.length > 1) {
        let parentId = "root";
        const nodeId = `1-${parentId}-${path[1]}`;
        if (!ids.some(arr => arr[0] === nodeId)) ids.push([nodeId]);
      }
    });
    // 만약 ids가 비어있으면 전체 경로를 다 보여주도록 [[]]가 아니라 모든 경로의 id를 추가
    if (!ids.length && filteredPaths.length > 0) {
      return filteredPaths.map(path => {
        let parentId = "root";
        return path.slice(1).map((name, i) => {
          const nodeId = `${i+1}-${parentId}-${name}`;
          parentId = name;
          return nodeId;
        });
      });
    }
    return ids.length ? ids : [[]];
  }, [filteredPaths]);
  // selectedPaths 상태
  const [selectedPaths, setSelectedPaths] = useState(getInitialSelectedPaths);
  // selectedPaths가 비거나, nodes/links가 없으면 전체 경로를 다 보여주도록 예외처리
  const sankeyData = React.useMemo(() => {
    let data = createDrilldownSankeyData(filteredPaths, selectedPaths);
    if ((!data.nodes.length || !data.links.length)) {
      // 전체 경로를 다 보여주도록 selectedPaths를 모든 경로로 강제
      const allPaths = filteredPaths.map(path => {
        let parentId = "root";
        return path.slice(1).map((name, i) => {
          const nodeId = `${i+1}-${parentId}-${name}`;
          parentId = name;
          return nodeId;
        });
      });
      data = createDrilldownSankeyData(filteredPaths, allPaths);
    }
    return data;
  }, [filteredPaths, selectedPaths, getInitialSelectedPaths]);

  // 노드 클릭 시 해당 노드까지의 경로를 selectedPaths에 추가(중복 방지)
  const handleNodeClick = (node) => {
    const path = [...(node.ancestorIds || []), node.id];
    if (!selectedPaths.some(p => JSON.stringify(p) === JSON.stringify(path))) {
      setSelectedPaths([...selectedPaths, path]);
    }
  };
  // 이전 단계로 돌아가기(모든 트리 pop)
  const handleBack = () => {
    if (selectedPaths.length > 1) setSelectedPaths(selectedPaths.slice(0, -1));
  };

  // 안전하게 maxDepth 계산
  const maxDepth = sankeyData.nodes.length > 0
    ? Math.max(...sankeyData.nodes.map(n => n.depth))
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>사용자 경로(사키) 다이어그램</h2>
      <div style={{ display: "flex", flexDirection: "row", marginBottom: 8 }}>
        {Array.from({ length: maxDepth + 1 }).map((_, i) => (
          <div key={i} style={{ width: 120, textAlign: "center", fontWeight: 600, color: "#888" }}>
            {i === 0 ? "시작점" : `${i}단계`}
          </div>
        ))}
        </div>
      {selectedPaths.length > 1 && (
        <button onClick={handleBack} style={{ marginBottom: 12, fontSize: 14 }}>◀ 이전 단계로</button>
      )}
      {(!sankeyData.nodes.length || !sankeyData.links.length)
        ? <div style={{ color: '#888', padding: 24 }}>경로 데이터가 없습니다.</div>
        : <SankeyChart data={sankeyData} onNodeClick={handleNodeClick} />
      }
          </div>
  );
};

const SankeyChart = ({ data, width = 800, height = 500, onNodeClick }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [highlightPath, setHighlightPath] = useState([]);

  useEffect(() => {
    if (!data) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const sankeyGenerator = d3Sankey()
      .nodeId(d => d.id)
      .nodeWidth(20)
      .nodePadding(10)
      .extent([
        [0, 0],
        [width, height],  
      ]);
    const { nodes, links } = sankeyGenerator(data);
    // ancestor path 강조 계산
    let pathLinks = [];
    if (hoverNode) {
      let current = hoverNode;
      while (current && current.targetLinks && current.targetLinks.length > 0) {
        const parentLink = current.targetLinks[0];
        pathLinks.unshift(parentLink);
        current = parentLink.source;
      }
    }
    setHighlightPath(pathLinks);
    // Draw links
    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d =>
        highlightPath.includes(d) ? "#90caf9" : "#b0bec5"
      )
      .attr("stroke-opacity", d =>
        highlightPath.includes(d) ? 0.7 : 0.4
      )
      .attr("stroke-width", d => Math.max(1, d.width))
      .style("pointer-events", "none");
    // Draw nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d =>
        hoverNode
          ? d === hoverNode
            ? "#1976d2"
            : highlightPath.some(l => l.source === d || l.target === d)
              ? "#90caf9"
              : "#666"
          : "#666"
      )
      .on("mouseover", function (e, d) {
        setHoverNode(d);
        setTooltip({ x: e.pageX, y: e.pageY, text: `${d.name}` });
      })
      .on("mouseout", function () {
        setHoverNode(null);
        setTooltip(null);
      })
      .on("click", function (e, d) {
        if (onNodeClick) onNodeClick(d);
      });
    // Add labels (항상 오른쪽)
    svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", d => d.x1 + 8)
      .attr("y", d => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .text(d => d.name)
      .attr("fill", "#000");
  }, [data, onNodeClick, hoverNode]);
              
              return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height} />
            {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 10,
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