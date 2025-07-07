import React from 'react';
import clsx from 'clsx';

// 타입 정의를 직접 포함
interface FilterOptions {
  period: '5min' | '1hour' | '1day' | '1week';
  gender: 'all' | 'male' | 'female';
  ageGroup: 'all' | '10s' | '20s' | '30s' | '40s' | '50s+';
}

interface FilterTabsProps {
  filters: FilterOptions;
  onFilterChange: (key: keyof FilterOptions, value: string) => void;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ filters, onFilterChange }) => {
  const periodOptions = [
    { value: 'today', label: '오늘' },
    { value: 'week', label: '이번 주' },
    { value: 'month', label: '이번 달' },
    { value: 'year', label: '올해' }
  ];

  const genderOptions = [
    { value: 'all', label: '전체' },
    { value: 'male', label: '남성' },
    { value: 'female', label: '여성' }
  ];

  const ageOptions = [
    { value: 'all', label: '전체' },
    { value: '10s', label: '10대' },
    { value: '20s', label: '20대' },
    { value: '30s', label: '30대' },
    { value: '40s', label: '40대' },
    { value: '50s+', label: '50대+' }
  ];

  const FilterGroup = ({ 
    title, 
    options, 
    value, 
    onChange 
  }: { 
    title: string; 
    options: { value: string; label: string }[]; 
    value: string; 
    onChange: (value: string) => void; 
  }) => (
    <div className="flex flex-col gap-3 items-center">
      <h4 className="text-sm font-medium text-gray-700 text-center">{title}</h4>
      <div className="flex gap-1 flex-wrap justify-center">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 whitespace-nowrap',
              value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">실시간 필터</h3>
        <p className="text-sm text-gray-600">데이터를 원하는 조건으로 필터링하세요</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
        <FilterGroup
          title="시간 범위"
          options={periodOptions}
          value={filters.period}
          onChange={(value) => onFilterChange('period', value)}
        />
        
        <FilterGroup
          title="성별"
          options={genderOptions}
          value={filters.gender}
          onChange={(value) => onFilterChange('gender', value)}
        />
        
        <FilterGroup
          title="연령대"
          options={ageOptions}
          value={filters.ageGroup}
          onChange={(value) => onFilterChange('ageGroup', value)}
        />
      </div>
    </div>
  );
}; 