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
    chartData: Record<string, any>[],
    lineDefs: { key: string; name: string }[]
  ) => React.ReactNode;
}

const ChartTableWrapper: React.FC<ChartTableWrapperProps> = ({
  data,
  maxSelectable = 5,
  autoSelectTopN = maxSelectable,
  autoSelectBy,
  title,
  valueKeys,
  children,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  useEffect(() => {
    if (autoSelectBy) {
      setSortKey(autoSelectBy);
    }
  }, [autoSelectBy]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (autoSelectTopN && autoSelectBy && selectedKeys.length === 0) {
      const sorted = [...data]
        .sort((a, b) => (b.values[autoSelectBy] || 0) - (a.values[autoSelectBy] || 0))
        .slice(0, autoSelectTopN)
        .map(d => d.key);
      setSelectedKeys(sorted);
    }
  }, [autoSelectTopN, autoSelectBy, data]);

  const filteredData = useMemo(() => {
    const filtered = data.filter(row =>
      row.label.toLowerCase().includes(searchText.toLowerCase())
    );

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = sortKey === 'label' ? a.label : a.values[sortKey] || 0;
      const bVal = sortKey === 'label' ? b.label : b.values[sortKey] || 0;

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [data, searchText, sortKey, sortOrder]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const lineDefs = useMemo(() => [
    ...selectedKeys.map(key => ({ key, name: key })),
  ], [selectedKeys]);

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length < maxSelectable
          ? [...prev, key]
          : prev
    );
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div>
      {/* Chart */}
      {children(selectedKeys, chartData, lineDefs)}

      <div className='w-full border-t flex justify-between mt-6'>
        {/* 검색창 */}
        <div className='m-2 w-1/2 flex'>
          <Search className='m-2 text-gray-500'/>
          <input
            type="text"
            placeholder="검색"
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm placeholder-gray-500 w-full"
          />
        </div>

        {/* 페이지네이션 */}
        <div className="p-2 flex justify-end items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">페이지당 행 수:</span>
            <select
              className="px-2 py-1"
              value={itemsPerPage}
              onChange={e => {
                setCurrentPage(1);
                setItemsPerPage(parseInt(e.target.value, 10));
              }}
            >
              {[10, 20, 50, 100].map(n => (
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
              {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}
              ~
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
              &nbsp;/&nbsp;
              {filteredData.length}
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

      {/* Table */}
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
              <th className="p-2" />
              <th className="p-2 text-left"></th>
              <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('label')}>
                <div className="flex items-center gap-1">
                  <ArrowDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      sortKey === 'label' ? "" : "opacity-0 hover:opacity-25"
                    } ${
                      sortOrder === 'desc' ? 'rotate-0' : 'rotate-180'
                    }`}
                  />
                  <span>{title ? title : '항목'}</span>
                </div>
              </th>
              {valueKeys.map(({ key, label }) => (
                <th
                key={key}
                className="p-2 text-right cursor-pointer"
                onClick={() => handleSort(key)}
              >
                <div className="flex items-center justify-end gap-1">
                  <ArrowDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      sortKey === key ? "" : "opacity-0 hover:opacity-25"
                    } ${
                      sortOrder === 'desc' ? 'rotate-0' : 'rotate-180'
                    }`}
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
                checked={selectedKeys.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    const top5 = filteredData
                      .slice(0, maxSelectable)
                      .map((row) => row.key);
                    setSelectedKeys(top5);
                  } else {
                    // 전체 해제
                    setSelectedKeys([]);
                  }
                }}
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
                    disabled={!selectedKeys.includes(row.key) && selectedKeys.length >= maxSelectable}
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
