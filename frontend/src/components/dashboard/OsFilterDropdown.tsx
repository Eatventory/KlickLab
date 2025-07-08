import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface OsFilterOptions {
  mainCategory: 'all' | 'mobile' | 'desktop';
}

interface OsFilterDropdownProps {
  filters: OsFilterOptions;
  onFilterChange: (key: keyof OsFilterOptions, value: string) => void;
}

export const OsFilterDropdown: React.FC<OsFilterDropdownProps> = ({ filters, onFilterChange }) => {
  const [isMainOpen, setIsMainOpen] = useState(false);

  const mainCategories = [
    { value: 'all', label: '전체' },
    { value: 'mobile', label: '모바일' },
    { value: 'desktop', label: '데스크탑' }
  ];

  const selectedMainCategory = mainCategories.find(cat => cat.value === filters.mainCategory);

  const handleMainCategoryChange = (value: string) => {
    onFilterChange('mainCategory', value);
    setIsMainOpen(false);
  };

  return (
    <div className="flex gap-2">
      {/* 대분류 드롭다운만 */}
      <div className="relative">
        <button
          onClick={() => setIsMainOpen(!isMainOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none min-w-[110px]"
        >
          <span className="text-sm font-medium text-gray-900">
            {selectedMainCategory?.label || '분류 선택'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isMainOpen ? 'rotate-180' : ''}`} />
        </button>
        {isMainOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {mainCategories.map((category) => (
              <button
                key={category.value}
                onClick={() => handleMainCategoryChange(category.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  filters.mainCategory === category.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 드롭다운 외부 클릭 시 닫기 */}
      {isMainOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsMainOpen(false)}
        />
      )}
    </div>
  );
}; 