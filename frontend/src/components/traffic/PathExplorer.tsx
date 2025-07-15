/* PathExplorer.tsx  ─  대시보드 > 방문경로 탐색 */
import { useEffect, useMemo, useState } from 'react';
import { Sankey, Tooltip } from 'recharts';

type StartPage = { page_path: string; sessions: number };
type NextLink = { target: string; sessions: number };
type StepData = {
    step: number;
    page: string;
    links: NextLink[];
};

interface SankeyNode { name: string }
interface SankeyLink { source: number; target: number; value: number }
import CustomNode from '../sankey/CustomNode';
import CustomLink from '../sankey/CustomLink';

/** YYYY-MM-DD 헬퍼 (오늘) */
const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------ 컴포넌트 ------------------------------ */
export default function PathExplorer() {
    /* ▸ 상태 */
    const [startPages, setStartPages] = useState<StartPage[]>([]);
    const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
    const [stepsData, setStepsData] = useState<StepData[]>([]);
    const [from] = useState('2025-07-01');   // 임시: 날짜 범위 하드코딩
    const [to] = useState(today());        // ─┘

    /* ▸ Start URL 목록 불러오기 (마운트 시 1회) */
    useEffect(() => {
        const fetchStartPages = async () => {
            const token =
                localStorage.getItem('klicklab_token') ??
                sessionStorage.getItem('klicklab_token');

            const res = await fetch(
                `/api/funnel/start-pages?from=${from}&to=${to}&limit=50`,
                {
                    credentials: 'include',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStartPages(Array.isArray(data) ? data : []);
        };

        fetchStartPages().catch(console.error);
    }, [from, to]);

    /* ▸ 단계별 다음 경로 조회 */
    useEffect(() => {
        if (selectedSteps.length === 0) {
            setStepsData([]);
            return;
        }

        const fetchNextSteps = async () => {
            const token =
                localStorage.getItem('klicklab_token') ??
                sessionStorage.getItem('klicklab_token');

            const res = await fetch('/api/funnel/path/multi-step', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    steps: selectedSteps,
                    from,
                    to,
                    limit: 10
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const links: NextLink[] = await res.json();

            // 새로운 단계 데이터 추가
            setStepsData(prev => [
                ...prev.slice(0, selectedSteps.length - 1),
                {
                    step: selectedSteps.length,
                    page: selectedSteps[selectedSteps.length - 1],
                    links: links.filter(l => l.sessions > 0)
                }
            ]);
        };

        fetchNextSteps().catch(console.error);
    }, [selectedSteps, from, to]);

    /* ▸ 단계 선택 핸들러 */
    const handleStepSelection = (step: number, page: string) => {
        setSelectedSteps(prev => [...prev.slice(0, step), page]);
    };

    /* ▸ Recharts 데이터 변환 (다단계 지원) */
    const { nodes, sankeyLinks } = useMemo(() => {
        if (stepsData.length === 0) return { nodes: [], sankeyLinks: [] };

        const nodeMap = new Map<string, number>();
        const links: SankeyLink[] = [];

        // 모든 단계의 노드와 링크 수집
        stepsData.forEach((stepData, stepIndex) => {
            // 현재 단계의 소스 노드 추가
            if (!nodeMap.has(stepData.page)) {
                nodeMap.set(stepData.page, nodeMap.size);
            }

            // 타겟 노드들 추가 및 링크 생성
            stepData.links.forEach(link => {
                if (!nodeMap.has(link.target)) {
                    nodeMap.set(link.target, nodeMap.size);
                }

                links.push({
                    source: nodeMap.get(stepData.page)!,
                    target: nodeMap.get(link.target)!,
                    value: Number(link.sessions)
                });
            });
        });

        const nodeArr: SankeyNode[] = [...nodeMap.keys()].map(name => ({ name }));

        return { nodes: nodeArr, sankeyLinks: links };
    }, [stepsData]);

    /* ------------------------------ 렌더 ------------------------------ */
    return (
        <div className="flex flex-col gap-4">
            {/* 1단계: 시작 페이지 선택 */}
            <div className="flex items-center gap-2">
                <span className="font-medium">1단계:</span>
                <select
                    className="p-2 rounded border w-64"
                    value={selectedSteps[0] || ''}
                    onChange={e => handleStepSelection(0, e.target.value)}
                >
                    <option value="">— Start URL 선택 —</option>
                    {startPages.map(p => (
                        <option key={p.page_path} value={p.page_path}>
                            {p.page_path}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2단계 이상: 동적으로 생성되는 드롭다운 */}
            {stepsData.map((stepData, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="font-medium">{index + 2}단계:</span>
                    <select
                        className="p-2 rounded border w-64"
                        value={selectedSteps[index + 1] || ''}
                        onChange={e => handleStepSelection(index + 1, e.target.value)}
                    >
                        <option value="">— 다음 경로 선택 —</option>
                        {stepData.links.map(link => (
                            <option key={link.target} value={link.target}>
                                {link.target} ({link.sessions} 세션)
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {/* 선택된 경로 표시 */}
            {selectedSteps.length > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                    <strong>선택된 경로:</strong> {selectedSteps.join(' → ')}
                </div>
            )}

            {/* Sankey 차트 */}
            {nodes.length > 0 && (
                <Sankey
                    width={760}
                    height={400 + (stepsData.length * 100)} // 단계가 많아질수록 높이 증가
                    data={{ nodes, links: sankeyLinks }}
                    nodePadding={30}
                    iterations={32}
                    node={<CustomNode />}
                    link={<CustomLink />}
                >
                    <Tooltip
                        content={({ active, payload }: any) => {
                            if (!active || !payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            if (data.source && data.target) {
                                return (
                                    <div className="bg-white p-2 border rounded shadow text-sm">
                                        {data.source.name} → {data.target.name}: {data.value} 세션
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </Sankey>
            )}
        </div>
    );
}
