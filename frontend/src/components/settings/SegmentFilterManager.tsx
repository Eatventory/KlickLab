import React, { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { saveSegmentFilter, loadSegmentFilters, deleteSegmentFilter } from '../../utils/segmentStorage';

const SegmentFilterManager: React.FC = () => {
  const [filterName, setFilterName] = useState('');
  const [filters, setFilters] = useState(loadSegmentFilters());
  const [selected, setSelected] = useState('');

  // 예시: 현재 세그먼트 필터 상태 (실제 context 등과 연동 필요)
  const [currentFilter, setCurrentFilter] = useState<any>({ segment: 'converted' });

  // 저장
  const handleSave = () => {
    if (!filterName) return alert('이름을 입력하세요');
    saveSegmentFilter(filterName, currentFilter);
    setFilters(loadSegmentFilters());
    setFilterName('');
    alert('저장 완료!');
  };

  // 불러오기
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelected(name);
    const filter = filters[name];
    if (filter) setCurrentFilter(filter); // 실제로는 context에 set
  };

  // 삭제
  const handleDelete = (name: string) => {
    deleteSegmentFilter(name);
    setFilters(loadSegmentFilters());
    if (selected === name) setSelected('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">세그먼트 필터 설정</h2>
      </div>
      <div className="flex gap-2 mb-2">
        <input
          className="border px-2 py-1 rounded text-sm"
          placeholder="필터 이름"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={handleSave}>
          저장
        </button>
      </div>
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
      <div className="text-gray-500 text-sm">(예시) 현재 필터: {JSON.stringify(currentFilter)}</div>
    </div>
  );
};

export default SegmentFilterManager; 