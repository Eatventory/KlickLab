import React from 'react';
import { 
  Users, 
  MousePointer,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import clsx from 'clsx';

// 타입 정의
interface StatCardData {
  title: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
}

interface StatCardProps {
  data: StatCardData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-6 h-6" />;
      case 'MousePointer':
        return <MousePointer className="w-6 h-6" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getGradientBg = (color: string) => {
    return 'bg-white';
  };

  const getIconBg = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-gradient-to-br from-blue-100 to-blue-200';
      case 'green':
        return 'bg-gradient-to-br from-green-100 to-green-200';
      case 'purple':
        return 'bg-gradient-to-br from-purple-100 to-purple-200';
      case 'red':
        return 'bg-gradient-to-br from-red-100 to-red-200';
      default:
        return 'bg-gradient-to-br from-gray-100 to-gray-200';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'purple':
        return 'text-purple-600';
      case 'red':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={clsx(
      'p-6 rounded-xl border border-gray-200 shadow-sm bg-white',
      getGradientBg(data.color)
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx(
            'p-3 rounded-xl shadow-md',
            getIconBg(data.color)
          )}>
            <div className={getIconColor(data.color)}>
              {getIcon(data.icon)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{data.title}</h3>
            <p className="text-3xl font-bold text-gray-900">
              {data.title.includes('방문자') ? `${data.value.toLocaleString()}명` : `${data.value.toLocaleString()}회`}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-5 flex items-center gap-2">
        <div className={clsx(
          'p-1 rounded-full',
          data.changeType === 'increase' ? 'bg-green-100' : 
          data.changeType === 'decrease' ? 'bg-red-100' : 'bg-gray-100'
        )}>
          {getChangeIcon(data.changeType)}
        </div>
        <span className={clsx(
          'text-sm font-semibold',
          getChangeColor(data.changeType)
        )}>
          {data.change > 0 ? '+' : ''}{data.change}%
        </span>
        <span className="text-sm text-gray-500">전일 대비</span>
      </div>
    </div>
  );
}; 