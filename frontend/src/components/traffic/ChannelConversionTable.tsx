import React, { useState } from 'react';
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

interface ChannelConversionTableProps {
  className?: string;
}

const mockChannelData: ChannelData[] = [
  {
    channel: "Google",
    source: "google",
    medium: "cpc",
    campaign: "summer_sale",
    totalSessions: 1250,
    convertedSessions: 89,
    conversionRate: 7.1
  },
  {
    channel: "Facebook",
    source: "facebook",
    medium: "social",
    campaign: "brand_awareness",
    totalSessions: 890,
    convertedSessions: 45,
    conversionRate: 5.1
  },
  {
    channel: "Instagram",
    source: "instagram",
    medium: "social",
    campaign: "influencer_marketing",
    totalSessions: 567,
    convertedSessions: 38,
    conversionRate: 6.7
  },
  {
    channel: "Direct",
    source: "direct",
    medium: "none",
    campaign: "direct_traffic",
    totalSessions: 2340,
    convertedSessions: 156,
    conversionRate: 6.7
  },
  {
    channel: "Organic Search",
    source: "google",
    medium: "organic",
    campaign: "seo_traffic",
    totalSessions: 1890,
    convertedSessions: 134,
    conversionRate: 7.1
  }
];

export const ChannelConversionTable: React.FC<ChannelConversionTableProps> = ({ className }) => {
  const { currentEvent } = useConversionEvent();
  // 추후 fetch 시 currentEvent를 쿼리파라미터 등으로 넘길 수 있도록 준비
  const [sortBy, setSortBy] = useState<'conversionRate' | 'totalSessions' | 'convertedSessions'>('conversionRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'conversionRate' | 'totalSessions' | 'convertedSessions') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...mockChannelData].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    const primarySort = sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    
    if (primarySort === 0) {
      return b.totalSessions - a.totalSessions;
    }
    
    return primarySort;
  });

  const maxConversionRate = Math.max(...mockChannelData.map(channel => channel.conversionRate));

  const formatNumber = (num: number) => num.toLocaleString();

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
              <tr key={channel.channel} className="border-b border-gray-100 hover:bg-gray-50" data-tooltip-id={`channel-tooltip-${index}`}>
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