import React from 'react';

interface TableData {
  label: string;
  value: number;
}

interface Props {
  data: TableData[];
  legendType: 'os' | 'browser';
  activeLegends: string[];
}

export const OsBrowserTable: React.FC<Props> = ({ data, legendType, activeLegends }) => {
  const filteredData = data.filter(d => activeLegends.includes(d.label));
  const total = filteredData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-[220px] w-full text-sm text-left border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 font-semibold text-gray-700">{legendType === 'os' ? '운영체제' : '브라우저'}</th>
            <th className="px-4 py-2 font-semibold text-gray-700">사용자수</th>
            <th className="px-4 py-2 font-semibold text-gray-700">비율</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((d) => (
            <tr key={d.label} className="border-t border-gray-100">
              <td className="px-4 py-2">{d.label}</td>
              <td className="px-4 py-2">{d.value.toLocaleString()}</td>
              <td className="px-4 py-2">{total > 0 ? ((d.value / total) * 100).toFixed(1) + '%' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 