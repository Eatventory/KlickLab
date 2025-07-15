// utils/segmentStorage.ts

// 타입 명시 (선택적으로 사용)
export interface SegmentFilter {
  segment: string;
  [key: string]: any; // 필터 조건 확장 가능
}

// 필터 저장
export function saveSegmentFilter(name: string, filter: SegmentFilter) {
  const raw = localStorage.getItem('segmentFilters');
  const filters: Record<string, SegmentFilter> = raw ? safeParse(raw) : {};
  filters[name] = filter;
  localStorage.setItem('segmentFilters', JSON.stringify(filters));
}

// 필터 전체 불러오기
export function loadSegmentFilters(): Record<string, SegmentFilter> {
  const raw = localStorage.getItem('segmentFilters');
  return raw ? safeParse(raw) : {};
}

// 필터 삭제
export function deleteSegmentFilter(name: string) {
  const raw = localStorage.getItem('segmentFilters');
  if (!raw) return;
  const filters: Record<string, SegmentFilter> = safeParse(raw);
  delete filters[name];
  localStorage.setItem('segmentFilters', JSON.stringify(filters));
}

// JSON parse 안전 처리 함수
function safeParse(json: string): any {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('[SegmentFilter] JSON 파싱 에러:', e);
    return {};
  }
}