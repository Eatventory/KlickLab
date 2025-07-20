import React from 'react';

interface Column {
  header: string;
  key: string;
}

interface TableSectionProps {
  title: string;
  data?: any[];
  columns: Column[];
}

const TableSection: React.FC<TableSectionProps> = ({ title, data, columns }) => {
  if (!data || data.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-2 font-medium text-gray-700">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
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
