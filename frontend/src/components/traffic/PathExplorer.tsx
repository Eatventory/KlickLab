/* PathExplorer.tsx  ─  대시보드 > 방문경로 탐색 */
import { useEffect, useMemo, useState } from 'react';
import { Sankey, Tooltip } from 'recharts';

type StartPage = { page_path: string; sessions: number };
type NextLink = { target: string; sessions: number };

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
    const [selected, setSelected] = useState<string | null>(null);
    const [links, setLinks] = useState<NextLink[]>([]);
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

    /* ▸ 선택된 URL 이 바뀌면 다음 링크 Top N 호출 */
    useEffect(() => {
        if (!selected) return;

        const token =
            localStorage.getItem('klicklab_token') ??
            sessionStorage.getItem('klicklab_token');
        fetch(
            `/api/funnel/path/next?page=${encodeURIComponent(selected)}&from=${from}&to=${to}&limit=10`,
            {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
        )
            .then(async r => {

                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: NextLink[]) =>
                data.
                    filter(l => l.sessions > 0) // 0세션 제거
                    .map(l => ({ ...l, sessions: Number(l.sessions) })) // 문자열→숫자
            )
            .then(setLinks)
            .catch(console.error);
    }, [selected, from, to]);

    /* ▸ Recharts 데이터 변환 */
    const { nodes, sankeyLinks } = useMemo(() => {
        if (!selected) return { nodes: [], sankeyLinks: [] };

        const map = new Map<string, number>();
        const add = (name: string) => {
            if (!map.has(name)) map.set(name, map.size);
            return map.get(name)!;
        };

        add(selected);                       // source 노드 인덱스 0
        links.forEach(l => add(l.target));   // target 노드 인덱스들

        const nodeArr: SankeyNode[] = [...map.keys()].map(name => ({ name }));
        const linkArr: SankeyLink[] = links.map(l => ({
            source: map.get(selected)!,
            target: map.get(l.target)!,
            value: Number(l.sessions),   // ← 문자열 → 숫자 변환
        }));

        return { nodes: nodeArr, sankeyLinks: linkArr };
    }, [selected, links]);

    /* ------------------------------ 렌더 ------------------------------ */
    return (
        <div className="flex flex-col gap-4">
            {/* 드롭다운 */}
            <select
                className="p-2 rounded border w-64"
                value={selected ?? ''}
                onChange={e => setSelected(e.target.value || null)}
            >
                <option value="">— Start URL 선택 —</option>
                {startPages.map(p => (
                    <option key={p.page_path} value={p.page_path}>
                        {p.page_path}
                    </option>
                ))}
            </select>

            {/* Sankey 차트 */}
            {selected && links.length > 0 ? (
                <Sankey
                    width={760}
                    height={360}
                    data={{ nodes, links: sankeyLinks }}
                    nodePadding={30}
                    iterations={32}
                    node={<CustomNode />}  // 커스텀 노드 추가
                    link={<CustomLink />}  // 커스텀 링크 추가
                >
                    <Tooltip
                        content={({ active, payload }: any) => {
                            if (!active || !payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            if (data.source && data.target) {
                                // 링크 툴팁
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
            ) : selected ? (
                /* 선택했는데 링크가 하나도 없을 때 */
                <div className="text-sm text-gray-500 px-4 py-8 border rounded">
                    {selected} 페이지에서 이어지는 세션이 없습니다.
                </div>
            ) : null}
        </div>
    );
}
