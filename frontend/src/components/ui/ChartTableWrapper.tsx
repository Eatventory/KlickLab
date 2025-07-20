import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowDown, Search } from "lucide-react";

export interface ChartTableRow {
  key: string;
  label: string;
  values: Record<string, number>;
}

export interface ChartTableWrapperProps {
  data: ChartTableRow[];
  maxSelectable?: number;
  autoSelectTopN?: number;
  autoSelectBy?: string;
  title?: string;
  valueKeys: { key: string; label: string; showPercent?: boolean }[];
  children: (
    selectedKeys: string[],

    chartData: Record<string, any>[] ,
    lineDefs: { key: string; name: string }[],
    unit: 'daily' | 'weekly' | 'monthly'
  ) => React.ReactNode;
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;
}

const ChartTableWrapper: React.FC<ChartTableWrapperProps> = ({
  data,
  maxSelectable = 5,
  autoSelectTopN = maxSelectable,
  autoSelectBy,
  title,
  valueKeys,
  children,

  onSortChange
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['SUM']);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [unit, setUnit] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (autoSelectBy) setSortKey(autoSelectBy);
  }, [autoSelectBy]);

  useEffect(() => {
    if (!isManualSelection) {
      setSelectedKeys((prev) => {
        const hasSum = prev.includes('SUM');
        const topN = [...data]
          .sort((a, b) => (b.values[autoSelectBy!] || 0) - (a.values[autoSelectBy!] || 0))
          .slice(0, autoSelectTopN)
          .map(d => d.key);
        return [...(hasSum ? ['SUM'] : ['SUM']), ...topN];
      });
    }
  }, [autoSelectTopN, autoSelectBy, data, isManualSelection]);

  const filteredData = useMemo(() => {
    const filtered = data.filter(row =>
      row.label.toLowerCase().includes(searchText.toLowerCase())
    );

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = sortKey === 'label' ? a.label : a.values[sortKey] || 0;
      const bVal = sortKey === 'label' ? b.label : b.values[sortKey] || 0;

      return sortOrder === 'asc' ? aVal < bVal ? -1 : aVal > bVal ? 1 : 0 : aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [data, searchText, sortKey, sortOrder]);

  const [itemsPerPage, setItemsPerPage] = useState(5);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);


  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const totals = useMemo(() => {
    const total: Record<string, number> = {};
    valueKeys.forEach(({ key }) => {
      total[key] = data.reduce((sum, row) => sum + (row.values[key] || 0), 0);
    });
    return total;
  }, [data, valueKeys]);

  const chartData = useMemo(() => {
    return data.map(row => {
      const base: Record<string, any> = { label: row.label };
      selectedKeys.forEach(sel => {
        if (row.key === sel) {
          valueKeys.forEach(({ key }) => {
            base[sel] = row.values[key];
          });
        }
      });
      return base;
    });
  }, [data, selectedKeys, valueKeys]);


  const lineDefs = useMemo(() => (
    selectedKeys
      .filter(k => k !== 'SUM')
      .map(key => ({ key, name: key }))
  ), [selectedKeys]);

  const toggleSelect = (key: string) => {
    setIsManualSelection(true);
    setSelectedKeys(prev => {
      const isSelected = prev.includes(key);
      if (key === 'SUM') {
        return isSelected ? prev.filter(k => k !== key) : [...prev, key];
      }
      const selectedWithoutSum = prev.filter(k => k !== 'SUM');
      if (!isSelected && selectedWithoutSum.length >= maxSelectable) return prev;
      return isSelected ? prev.filter(k => k !== key) : [...prev, key];
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {

      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
      onSortChange?.(key, newOrder);
    } else {
      setSortKey(key);
      setSortOrder('desc');
      onSortChange?.(key, 'desc');
    }
  };

  const toggleAll = () => {
    setIsManualSelection(true);
    const topKeys = filteredData.slice(0, maxSelectable).map(row => row.key);
    setSelectedKeys(prev => {
      const hasSum = prev.includes('SUM');
      const isAllSelected = topKeys.every(k => prev.includes(k));
      return isAllSelected ? (hasSum ? ['SUM'] : []) : [...(hasSum ? ['SUM'] : []), ...topKeys];
    });
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          value={unit}
          onChange={(e) => setUnit(e.target.value as 'daily' | 'weekly' | 'monthly')}
        >
          <option value="daily">일</option>
          <option value="weekly">주</option>
          <option value="monthly">월</option>
        </select>
      </div>
      {children(selectedKeys, chartData, lineDefs, unit)}
      <div className="w-full border-t flex justify-between mt-6">
        <div className='mx-1 py-1 w-1/2 flex hover:bg-gray-100 hover:rounded-sm'>
          <Search className='m-2 text-gray-500'/>
          <input
            type="text"
            placeholder="검색"
            value={searchText}
            onChange={e => {

              setIsManualSelection(true);
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm placeholder-gray-500 w-full bg-transparent"
          />
        </div>

        <div className="p-2 flex justify-end items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">페이지당 행 수:</span>
            <select
              className="px-2 py-1"
              value={itemsPerPage}
              onChange={e => {
                setCurrentPage(1);
                setItemsPerPage(parseInt(e.target.value, 5));

              }}>
              {[5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-600">이동:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = Math.max(1, Math.min(Number(e.target.value), totalPages));
                setCurrentPage(page);
              }}
              className="w-12 px-2 py-1 rounded text-center"
            />
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-gray-200 rounded-full"
            >
              <ChevronLeft />
            </button>
            <span>

              {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}~
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
              &nbsp;/&nbsp;{filteredData.length}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-gray-200 rounded-full"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[40px]" />
            <col className="w-[40px]" />
            <col className="w-[200px]" />
            {valueKeys.map((_, idx) => (
              <col key={idx} className="w-[140px]" />
            ))}
          </colgroup>
          <thead className="bg-gray-50 border-t">
            <tr>
              <th className="p-2 text-left">
                <input
                  id="masterCheckbox"
                  type="checkbox"
                  checked={filteredData.slice(0, maxSelectable).every(row => selectedKeys.includes(row.key))}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-2 text-left" />
              <th className="p-2 text-left">
                <span>{title ? title : '항목'}</span>
              </th>
              {valueKeys.map(({ key, label }) => (
              <th
                key={key}
                className="p-2 text-right cursor-pointer"
                onClick={() => handleSort(key)}
              >

                <div className="flex items-center justify-end gap-1 group">
                  <ArrowDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      sortKey === key ? '' : 'opacity-0 group-hover:opacity-25'
                    } ${sortOrder === 'desc' ? 'rotate-0' : 'rotate-180'}`}
                  />
                  <span>{label}</span>
                </div>
              </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-100 font-semibold border-t">

              <td className="p-2">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes('SUM')}
                  onChange={() => toggleSelect('SUM')}
                />
              </td>
              <td className="p-2" />
              <td className="p-2">합계</td>
              {valueKeys.map(({ key }) => (
                <td key={key} className="p-2 text-right">{totals[key].toLocaleString()}</td>
              ))}
            </tr>
            {pagedData.map((row, index) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="p-2 border-t">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(row.key)}

                    disabled={!selectedKeys.includes(row.key) && selectedKeys.filter(k => k !== 'SUM').length >= maxSelectable}
                    onChange={() => toggleSelect(row.key)}
                  />
                </td>
                <td className="p-2 border-t text-center">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td className="p-2 border-t">{row.label}</td>
                {valueKeys.map(({ key, showPercent }) => {
                  const value = row.values[key] || 0;
                  const percent = totals[key] ? (value / totals[key]) * 100 : 0;
                  return (
                    <td key={key} className="p-2 text-right border-t">
                      {value.toLocaleString()}
                      {showPercent && <span className="text-xs text-gray-400"> ({percent.toFixed(1)}%)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChartTableWrapper;
