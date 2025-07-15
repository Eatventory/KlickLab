import React, { useState } from 'react';
import { Filter, X, Save, Loader2 } from 'lucide-react';
import { useSegmentFilter } from '../../context/SegmentFilterContext';

export const GlobalFilterBar: React.FC = () => {
  const { filter, setFilter, savedFilters, saveFilter, loadFilter, deleteFilter } = useSegmentFilter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState('');

  // 필터가 활성화되어 있는지 확인
  const hasActiveFilter = filter.conditions && Object.keys(filter.conditions).length > 0;

  // 필터 조건을 뱃지로 표시
  const renderFilterBadges = () => {
    if (!hasActiveFilter) return null;

    const badges = [];
    const conditions = filter.conditions;

    if (conditions.segment) {
      badges.push(
        <span key="segment" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {conditions.segment === 'converted' ? '전환' : conditions.segment === 'abandoned_cart' ? '이탈' : conditions.segment}
        </span>
      );
    }

    if (conditions.device) {
      badges.push(
        <span key="device" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {conditions.device === 'mobile' ? '모바일' : conditions.device === 'desktop' ? '데스크탑' : conditions.device}
        </span>
      );
    }

    if (conditions.isNew) {
      badges.push(
        <span key="new" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          신규
        </span>
      );
    }

    if (conditions.isReturning) {
      badges.push(
        <span key="returning" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          재방문
        </span>
      );
    }

    return badges;
  };

  // 필터 저장
  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('필터 이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const filterToSave = {
        ...filter,
        name: filterName,
        id: filter.id || `filter_${Date.now()}`,
        createdAt: Date.now()
      };
      saveFilter(filterToSave);
      setFilterName('');
      alert('필터가 저장되었습니다!');
    } catch (error) {
      alert('필터 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 필터 불러오기
  const handleLoadFilter = (filterId: string) => {
    loadFilter(filterId);
  };

  // 필터 초기화
  const handleClearFilter = () => {
    setFilter({
      id: '',
      name: '',
      segment: '',
      conditions: {},
      createdAt: Date.now()
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 필터 상태 표시 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">전역 필터</span>
            </div>
            
            {hasActiveFilter ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">활성:</span>
                <div className="flex gap-1">
                  {renderFilterBadges()}
                </div>
                {filter.name && (
                  <span className="text-sm text-gray-500">({filter.name})</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-400">필터가 설정되지 않음</span>
            )}
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {hasActiveFilter && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isExpanded ? '접기' : '관리'}
                </button>
                <button
                  onClick={handleClearFilter}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  title="필터 초기화"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 확장된 관리 패널 */}
        {isExpanded && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 저장 섹션 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">현재 필터 저장</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="필터 이름 입력"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={handleSaveFilter}
                    disabled={isSaving || !filterName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    저장
                  </button>
                </div>
              </div>

              {/* 불러오기 섹션 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">저장된 필터 불러오기</h4>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => e.target.value && handleLoadFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    defaultValue=""
                  >
                    <option value="">필터 선택</option>
                    {savedFilters.map((savedFilter) => (
                      <option key={savedFilter.id} value={savedFilter.id}>
                        {savedFilter.name}
                      </option>
                    ))}
                  </select>
                  {savedFilters.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('모든 저장된 필터를 삭제하시겠습니까?')) {
                          savedFilters.forEach(f => deleteFilter(f.id));
                        }
                      }}
                      className="px-3 py-2 text-red-600 hover:text-red-700 text-sm"
                      title="모든 필터 삭제"
                    >
                      전체 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 저장된 필터 목록 */}
            {savedFilters.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">저장된 필터 목록</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {savedFilters.map((savedFilter) => (
                    <div
                      key={savedFilter.id}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <span className="text-sm text-gray-700 truncate">{savedFilter.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleLoadFilter(savedFilter.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          불러오기
                        </button>
                        <button
                          onClick={() => deleteFilter(savedFilter.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 