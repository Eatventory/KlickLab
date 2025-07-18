import React, { useEffect, useState, useMemo } from 'react';

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
  valueKeys,
  children,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // 초기 자동 선택
  useEffect(() => {
    if (autoSelectTopN && autoSelectBy && selectedKeys.length === 0) {
      const sorted = [...data]
        .sort((a, b) => (b.values[autoSelectBy] || 0) - (a.values[autoSelectBy] || 0))
        .slice(0, autoSelectTopN)
        .map(d => d.key);
      setSelectedKeys(sorted);
    }
  }, [autoSelectTopN, autoSelectBy, data]);

  const totals = useMemo(() => {
    const total: Record<string, number> = {};
    valueKeys.forEach(({ key }) => {
      total[key] = data.reduce((sum, row) => sum + (row.values[key] || 0), 0);
    });
    return total;
  }, [data, valueKeys]);

  const chartData = useMemo(() => {
    // row-wise merge into chart-friendly format
    const keySet = new Set<string>();
    data.forEach(row => {
      Object.keys(row.values).forEach(key => keySet.add(key));
    });

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

  return (
    <div className="space-y-6">
      {/* Chart */}
      {children(selectedKeys, chartData, lineDefs)}

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">선택</th>
              <th className="p-2 text-left">항목</th>
              {valueKeys.map(({ key, label }) => (
                <th key={key} className="p-2 text-right">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 합계 행 */}
            <tr className="bg-gray-100 font-semibold">
              <td className="p-2" />
              <td className="p-2">합계</td>
              {valueKeys.map(({ key }) => (
                <td key={key} className="p-2 text-right">{totals[key].toLocaleString()}</td>
              ))}
            </tr>

            {data.map(row => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(row.key)}
                    disabled={!selectedKeys.includes(row.key) && selectedKeys.length >= maxSelectable}
                    onChange={() => toggleSelect(row.key)}
                  />
                </td>
                <td className="p-2">{row.label}</td>
                {valueKeys.map(({ key, showPercent }) => {
                  const value = row.values[key] || 0;
                  const percent = totals[key] ? (value / totals[key]) * 100 : 0;
                  return (
                    <td key={key} className="p-2 text-right">
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
