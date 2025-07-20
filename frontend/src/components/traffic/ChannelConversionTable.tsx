import React, { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import mockData from '../../../../backend/data/channelConversionMockData.json';

interface ChannelData {
  channel: string;
  source: string;
  medium: string;
  campaign: string;
  totalSessions: number;
  convertedSessions: number;
  conversionRate: number;
}

interface ChannelConversionResponse {
  success: boolean;
  data: ChannelData[];
}

interface ChannelConversionTableProps {
  className?: string;
}

export const ChannelConversionTable: React.FC<ChannelConversionTableProps> = ({ className }) => {
  const [data, setData] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'conversionRate' | 'totalSessions' | 'convertedSessions'>('conversionRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // const fetchChannelConversionData = async () => {
  //   if (!currentEvent) return;
    
  //   try {
  //     setLoading(true);
  //     setError(null);
      
  //     const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
  //     if (!token) throw new Error("No token");
      
  //     const response = await fetch(`/api/overview/conversion-by-channel?to=/checkout/success&event=${currentEvent}`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
      
  //     if (!response.ok) {
  //       throw new Error('채널별 전환율 데이터를 불러올 수 없습니다.');
  //     }
      
  //     const result: ChannelConversionResponse = await response.json();
      
  //     if (!result.success) {
  //       throw new Error('데이터 처리 중 오류가 발생했습니다.');
  //     }
      
  //     setData(result.data || []);
  //   } catch (err) {
  //     console.error('Channel Conversion API Error:', err);
  //     setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
  //     // 목업 데이터로 대체
  //     setData(mockData as ChannelData[]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  useEffect(() => {
    setData(mockData as ChannelData[]);
    setLoading(false);
    setError(null);
  }, []);

  const handleSort = (field: 'conversionRate' | 'totalSessions' | 'convertedSessions') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    const primarySort = sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    
    if (primarySort === 0) {
      return b.totalSessions - a.totalSessions;
    }
    
    return primarySort;
  });

  const maxConversionRate = data.length > 0 ? Math.max(...data.map(channel => channel.conversionRate)) : 0;

  const formatNumber = (num: number) => num.toLocaleString();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">채널별 전환율 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col p-6 relative ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">채널별 전환율</h3>
        <button className="text-xs text-gray-500" onClick={() => handleSort('conversionRate')}>
          전환율 {sortBy === 'conversionRate' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>
      <div className="text-xs text-gray-500 mb-2 flex w-full">
        <div className="flex-1 pl-1">채널</div>
        <div className="w-12 text-right pr-1">전환율</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedData.map((channel, index) => (
          <div key={`${channel.source || 'unknown'}-${channel.medium || 'unknown'}-${channel.campaign || channel.channel || 'unknown'}-${index}`} className="mb-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 text-sm">{channel.channel}</span>
              <span className="font-bold text-sm text-gray-900">{channel.conversionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded mt-2" style={{ height: '6px' }}>
              <div className="bg-blue-500 rounded" style={{ width: `${channel.conversionRate}%`, height: '6px' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full px-6 pb-4 text-xs text-gray-500">
        * 전환율은 총 세션 대비 전환 완료 세션의 비율입니다.
      </div>
    </div>
  );
};