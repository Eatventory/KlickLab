import React from 'react';
import { BarChart3, Info, Trophy } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

interface LandingData {
  landing: string;
  source: string;
  medium: string;
  totalSessions: number;
  convertedSessions: number;
  conversionRate: number;
}

const mockLandingData: LandingData[] = [
  {
    landing: '/summer-sale',
    source: 'google',
    medium: 'cpc',
    totalSessions: 980,
    convertedSessions: 72,
    conversionRate: 7.3
  },
  {
    landing: '/main',
    source: 'direct',
    medium: 'none',
    totalSessions: 2100,
    convertedSessions: 145,
    conversionRate: 6.9
  },
  {
    landing: '/product/123',
    source: 'instagram',
    medium: 'social',
    totalSessions: 650,
    convertedSessions: 38,
    conversionRate: 5.8
  },
  {
    landing: '/brand-story',
    source: 'naver',
    medium: 'organic',
    totalSessions: 430,
    convertedSessions: 21,
    conversionRate: 4.9
  },
  {
    landing: '/event/2024',
    source: 'facebook',
    medium: 'social',
    totalSessions: 320,
    convertedSessions: 15,
    conversionRate: 4.7
  }
];

const formatNumber = (num: number) => num.toLocaleString();

export const LandingConversionTable: React.FC = () => {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const sortedData = [...mockLandingData].sort((a, b) => {
    const primarySort = sortOrder === 'asc' ? a.conversionRate - b.conversionRate : b.conversionRate - a.conversionRate;
    
    if (primarySort === 0) {
      return b.totalSessions - a.totalSessions;
    }
    
    return primarySort;
  });

  const maxConversionRate = Math.max(...mockLandingData.map(landing => landing.conversionRate));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">첫 유입 페이지 전환율</h3>
        </div>
        <div className="text-xs text-gray-500">전환율 기준 정렬</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-center py-2 px-3 font-medium text-gray-700 text-sm">랜딩 페이지</th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 text-sm cursor-pointer" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                전환율
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((landing, idx) => (
              <tr key={landing.landing} className="border-b border-gray-100 hover:bg-gray-50" data-tooltip-id={`landing-tooltip-${idx}`}>
                <td className="py-2 px-3 align-top text-center"> 
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      {landing.conversionRate === maxConversionRate && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {landing.landing}
                    </span>
                  </div>
                  <Tooltip id={`landing-tooltip-${idx}`} place="top" effect="solid">
                    <div><b>유입 소스:</b> {landing.source}</div>
                    <div><b>총 세션:</b> {formatNumber(landing.totalSessions)}</div>
                    <div><b>전환 세션:</b> {formatNumber(landing.convertedSessions)}</div>
                    <div><b>매체:</b> {landing.medium}</div>
                  </Tooltip>
                </td>
                <td className="text-center py-2 px-3 align-top">
                  <span className={`font-bold text-sm ${
                    landing.conversionRate >= 7 ? 'text-green-600' : 
                    landing.conversionRate >= 5 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {landing.conversionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        * 전환율은 해당 랜딩 페이지로 유입된 세션 대비 전환 완료 세션의 비율입니다.
      </div>
    </div>
  );
}; 