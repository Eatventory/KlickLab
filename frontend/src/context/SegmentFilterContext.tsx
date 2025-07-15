import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SegmentFilter {
  id: string;
  name: string;
  segment: string;
  conditions: Record<string, any>;
  createdAt: number;
  [key: string]: any;
}

interface SegmentFilterContextType {
  filter: SegmentFilter;
  setFilter: (filter: SegmentFilter) => void;
  savedFilters: SegmentFilter[];
  saveFilter: (filter: SegmentFilter) => void;
  loadFilter: (filterId: string) => void;
  deleteFilter: (filterId: string) => void;
  generateFilterName: (conditions: Record<string, any>) => string;
}

const defaultFilter: SegmentFilter = { 
  id: '',
  name: '',
  segment: '',
  conditions: {},
  createdAt: Date.now()
};

const STORAGE_KEY = 'segmentFilters';

const SegmentFilterContext = createContext<SegmentFilterContextType | undefined>(undefined);

export const useSegmentFilter = () => {
  const ctx = useContext(SegmentFilterContext);
  if (!ctx) throw new Error('useSegmentFilter must be used within SegmentFilterProvider');
  return ctx;
};

// localStorage 유틸리티 함수들
const loadFiltersFromStorage = (): SegmentFilter[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load filters from localStorage:', error);
    return [];
  }
};

const saveFiltersToStorage = (filters: SegmentFilter[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save filters to localStorage:', error);
  }
};

// 필터 이름 자동 생성 함수
const generateFilterName = (conditions: Record<string, any>): string => {
  const conditionKeys = Object.keys(conditions);
  if (conditionKeys.length === 0) return '기본 필터';
  
  const conditionNames = conditionKeys.map(key => {
    const value = conditions[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `${key}: ${value}`;
    if (Array.isArray(value)) return `${key}: ${value.length}개`;
    return key;
  });
  
  return conditionNames.slice(0, 3).join(', ') + (conditionNames.length > 3 ? '...' : '');
};

export const SegmentFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filter, setFilter] = useState<SegmentFilter>(defaultFilter);
  const [savedFilters, setSavedFilters] = useState<SegmentFilter[]>([]);

  // 초기 로드
  useEffect(() => {
    const filters = loadFiltersFromStorage();
    setSavedFilters(filters);
  }, []);

  const saveFilter = (newFilter: SegmentFilter) => {
    const filterToSave = {
      ...newFilter,
      id: newFilter.id || `filter_${Date.now()}`,
      name: newFilter.name || generateFilterName(newFilter.conditions),
      createdAt: newFilter.createdAt || Date.now()
    };

    const updatedFilters = savedFilters.filter(f => f.id !== filterToSave.id);
    updatedFilters.push(filterToSave);
    
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  };

  const loadFilter = (filterId: string) => {
    const filterToLoad = savedFilters.find(f => f.id === filterId);
    if (filterToLoad) {
      setFilter(filterToLoad);
    }
  };

  const deleteFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  };

  return (
    <SegmentFilterContext.Provider value={{ 
      filter, 
      setFilter, 
      savedFilters, 
      saveFilter, 
      loadFilter, 
      deleteFilter,
      generateFilterName
    }}>
      {children}
    </SegmentFilterContext.Provider>
  );
}; 