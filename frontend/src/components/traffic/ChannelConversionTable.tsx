import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useConversionEvent } from '../../context/ConversionEventContext';

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
  const { currentEvent } = useConversionEvent();
  const [data, setData] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'conversionRate' | 'totalSessions' | 'convertedSessions'>('conversionRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchChannelConversionData = async () => {
    if (!currentEvent) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      
      const response = await fetch(`/api/overview/conversion-by-channel?to=/checkout/success&event=${currentEvent}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('채널별 전환율 데이터를 불러올 수 없습니다.');
      }
      
      const result: ChannelConversionResponse = await response.json();
      
      if (!result.success) {
        throw new Error('데이터 처리 중 오류가 발생했습니다.');
      }
      
      setData(result.data || []);
    } catch (err) {
      console.error('Channel Conversion API Error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelConversionData();
  }, [currentEvent]);

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
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2 ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2 ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2 ${className || ''}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">채널별 전환율 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">채널별 전환율</h3>
        </div>
        <div className="text-xs text-gray-500">
          전환율 기준 정렬
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-center py-2 px-3 font-medium text-gray-700 text-sm">채널</th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 text-sm cursor-pointer" onClick={() => handleSort('conversionRate')}>
                전환율
                {sortBy === 'conversionRate' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((channel, index) => (
              <tr key={`${channel.source}-${channel.medium}-${channel.campaign}`} className="border-b border-gray-100 hover:bg-gray-50" data-tooltip-id={`channel-tooltip-${index}`}>
                <td className="py-2 px-3 align-top"> 
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      {channel.conversionRate === maxConversionRate && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {channel.channel}
                    </span>
                  </div>
                  <Tooltip id={`channel-tooltip-${index}`} place="top" effect="solid">
                    <div><b>캠페인명:</b> {channel.campaign !== 'direct_traffic' ? channel.campaign : '직접 방문'}</div>
                    <div><b>총 세션:</b> {formatNumber(channel.totalSessions)}</div>
                    <div><b>전환 세션:</b> {formatNumber(channel.convertedSessions)}</div>
                    <div><b>매체:</b> {channel.medium}</div>
                  </Tooltip>
                </td>
                <td className="text-center py-2 px-3 align-top">
                  <span className={`font-bold text-sm ${
                    channel.conversionRate >= 7 ? 'text-green-600' : 
                    channel.conversionRate >= 5 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {channel.conversionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        * 전환율은 총 세션 대비 전환 완료 세션의 비율입니다.
      </div>
    </div>
  );
};