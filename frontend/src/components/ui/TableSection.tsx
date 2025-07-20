import React, { useState, useMemo } from 'react';
import { ArrowDown } from 'lucide-react';

interface Column {
  header: string;
  key: string;
}

interface TableSectionProps {
  title?: string;
  data?: any[];
  columns: Column[];
}

const TableSection: React.FC<TableSectionProps> = ({ title, data, columns }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'asc',
  });
  
  const sortedData = useMemo(() => {
    const safeData = data ?? [];
    if (!sortConfig) return safeData;
    const { key, direction } = sortConfig;
  
    return [...safeData].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
  
      if (aValue === bValue) return 0;
  
      const isNumber = typeof aValue === 'number' && typeof bValue === 'number';
  
      if (isNumber) {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        return direction === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  if (!data || data.length === 0) return null;

  return (
    <div>
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm text-left table-fixed">
          <colgroup>
            <col className="w-[140px]" />
            {columns.slice(1).map((_, idx) => (
              <col key={idx} />
            ))}
          </colgroup>
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-2 font-medium text-gray-700 cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 group">
                    <span>{col.header}</span>
                    <ArrowDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        sortConfig?.key === col.key ? '' : 'opacity-0 group-hover:opacity-25'
                      } ${sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2 text-gray-800">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSection;
