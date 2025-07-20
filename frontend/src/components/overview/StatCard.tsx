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
  value: number | string;
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
        return 'bg-blue-50';
      case 'green':
        return 'bg-green-50';
      case 'purple':
        return 'bg-purple-50';
      case 'red':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-500';
      case 'green':
        return 'text-green-500';
      case 'purple':
        return 'text-purple-500';
      case 'red':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={clsx(
      'p-2 rounded-xl border border-gray-200 shadow-sm bg-white flex flex-col justify-center',
      getGradientBg(data.color)
    )} style={{ minHeight: 90 }}>
      <div className="text-center">
        <div className={clsx(
          'p-1 rounded-lg shadow-sm mx-auto mb-1 w-fit',
          getIconBg(data.color)
        )}>
          <div className={getIconColor(data.color)}>
            {getIcon(data.icon)}
          </div>
        </div>
        <h3 className="text-xs font-medium text-gray-600 mb-1">{data.title}</h3>
        <p className="text-xl font-bold text-gray-900 mb-1">
          {typeof data.value === 'number'
            ? (data.title.includes('방문자') ? `${data.value.toLocaleString()}명` : `${data.value.toLocaleString()}회`)
            : data.value}
        </p>
        
        <div className="flex items-center justify-center gap-1">
          <div className={clsx(
            'p-0.5 rounded-full',
            data.changeType === 'increase' ? 'bg-green-100' : 
            data.changeType === 'decrease' ? 'bg-red-100' : 'bg-gray-100'
          )}>
            {getChangeIcon(data.changeType)}
          </div>
          <span className={clsx(
            'text-xs font-semibold',
            getChangeColor(data.changeType)
          )}>
            {data.change > 0 ? '+' : ''}{data.change}%
          </span>
        </div>
      </div>
    </div>
  );
}; 