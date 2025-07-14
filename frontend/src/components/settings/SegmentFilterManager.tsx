import React, { useState, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { saveSegmentFilter, loadSegmentFilters, deleteSegmentFilter } from '../../utils/segmentStorage';
import { useSegmentFilter } from '../../context/SegmentFilterContext';

// 1. 조건에서 이름 자동 생성 함수
function generateFilterName(filter: any): string {
  const parts = [];
  if (filter.segment === 'converted') parts.push('전환');
  if (filter.segment === 'abandoned_cart') parts.push('이탈');
  if (filter.device === 'mobile') parts.push('모바일');
  if (filter.device === 'desktop') parts.push('데스크탑');
  if (filter.isNew) parts.push('신규');
  if (filter.isReturning) parts.push('재방문');
  return parts.join('_') || '기본세그먼트';
}

// 2. 조건 뱃지 렌더링 함수
function renderFilterBadges(filter: any) {
  const badges = [];
  if (filter.segment === 'converted') badges.push('전환');
  if (filter.segment === 'abandoned_cart') badges.push('이탈');
  if (filter.device === 'mobile') badges.push('모바일');
  if (filter.device === 'desktop') badges.push('데스크탑');
  if (filter.isNew) badges.push('신규');
  if (filter.isReturning) badges.push('재방문');
  if (badges.length === 0) badges.push('기본');
  return badges.map((b, i) => (
    <span key={i} className="bg-gray-100 text-sm rounded px-2 py-0.5 mr-1 border border-gray-200">{b}</span>
  ));
}

// 3. 저장 UI (자동 추천 + 수정 가능)
const SegmentFilterSaveUI: React.FC<{ currentFilter: any; onSave?: () => void }> = ({ currentFilter, onSave }) => {
  const [filterName, setFilterName] = useState(generateFilterName(currentFilter));

  // 조건이 바뀔 때마다 이름 자동 추천 (단, 사용자가 직접 수정한 경우는 유지)
  useEffect(() => {
    setFilterName(generateFilterName(currentFilter));
  }, [JSON.stringify(currentFilter)]);

  const handleSave = () => {
    if (!filterName) {
      alert('필터 이름을 입력하세요!');
      return;
    }
    saveSegmentFilter(filterName, currentFilter);
    setFilterName(generateFilterName(currentFilter));
    alert('필터가 저장되었습니다!');
    if (onSave) onSave();
  };
  return (
    <div className="flex gap-2 mb-2 items-center">
      <input
        type="text"
        placeholder="필터 이름"
        value={filterName}
        onChange={e => setFilterName(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      />
      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
      >
        저장
      </button>
      {/* 조건 뱃지 시각화 */}
      <div className="flex ml-2">{renderFilterBadges(currentFilter)}</div>
    </div>
  );
};

const SegmentFilterManager: React.FC = () => {
  const [filters, setFilters] = useState(loadSegmentFilters());
  const [selected, setSelected] = useState('');
  const { filter, setFilter } = useSegmentFilter();

  // 불러오기
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelected(name);
    const f = filters[name];
    if (f) setFilter(f); // context에 set
  };

  // 삭제
  const handleDelete = (name: string) => {
    deleteSegmentFilter(name);
    setFilters(loadSegmentFilters());
    if (selected === name) setSelected('');
  };

  const handleSaveAndReload = () => {
    setFilters(loadSegmentFilters());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">세그먼트 필터 설정</h2>
      </div>
      <SegmentFilterSaveUI currentFilter={filter} onSave={handleSaveAndReload} />
      <div className="flex gap-2 items-center mb-2">
        <select
          className="border px-2 py-1 rounded text-sm"
          value={selected}
          onChange={handleSelect}
        >
          <option value="">필터 불러오기</option>
          {Object.keys(filters).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {selected && (
          <button className="ml-2 text-red-500" onClick={() => handleDelete(selected)}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* 현재 필터 조건 뱃지로 시각화 */}
      <div className="flex items-center mt-2">{renderFilterBadges(filter)}</div>
    </div>
  );
};

export default SegmentFilterManager; 