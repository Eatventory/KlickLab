import React, { createContext, useContext, useState } from 'react';

export interface SegmentFilter {
  segment: string;
  [key: string]: any;
}

interface SegmentFilterContextType {
  filter: SegmentFilter;
  setFilter: (filter: SegmentFilter) => void;
}

const defaultFilter: SegmentFilter = { segment: '' };

const SegmentFilterContext = createContext<SegmentFilterContextType | undefined>(undefined);

export const useSegmentFilter = () => {
  const ctx = useContext(SegmentFilterContext);
  if (!ctx) throw new Error('useSegmentFilter must be used within SegmentFilterProvider');
  return ctx;
};

export const SegmentFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filter, setFilter] = useState<SegmentFilter>(defaultFilter);
  return (
    <SegmentFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </SegmentFilterContext.Provider>
  );
}; 