import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Monitor, Smartphone, Globe } from 'lucide-react';

interface DeviceBrowserData {
  name: string;
  value: number;
  percentage: number;
  type: 'device' | 'browser';
}

interface DeviceBrowserDonutChartProps {
  deviceData: DeviceBrowserData[];
  browserData: DeviceBrowserData[];
  refreshKey: number;
}

export const DeviceBrowserDonutChart: React.FC<DeviceBrowserDonutChartProps> = ({ 
  deviceData, 
  browserData, 
  refreshKey 
}) => {
  const deviceColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const browserColors = ['#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-blue-600">
            사용자: {data.value.toLocaleString()}명
          </p>
          <p className="text-gray-600">
            비율: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* 디바이스 차트 */}
        <div className="h-full">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">디바이스</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`device-cell-${index}`} fill={deviceColors[index % deviceColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 브라우저 차트 */}
        <div className="h-full">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">브라우저</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={browserData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {browserData.map((entry, index) => (
                    <Cell key={`browser-cell-${index}`} fill={browserColors[index % browserColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}; 