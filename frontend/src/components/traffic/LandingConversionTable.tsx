import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useConversionEvent } from '../../context/ConversionEventContext';

interface LandingData {
  landing: string;
  source: string;
  medium: string;
  totalSessions: number;
  convertedSessions: number;
  conversionRate: number;
}

interface LandingConversionResponse {
  success: boolean;
  data: LandingData[];
}

const formatNumber = (num: number) => num.toLocaleString();

export const LandingConversionTable: React.FC = () => {
  const { currentEvent } = useConversionEvent();
  const [data, setData] = useState<LandingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchLandingConversionData = async () => {
    if (!currentEvent) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      
      const response = await fetch(`/api/overview/conversion-by-landing?to=/checkout/success&event=${currentEvent}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('첫 유입페이지 전환율 데이터를 불러올 수 없습니다.');
      }
      
      const result: LandingConversionResponse = await response.json();
      
      if (!result.success) {
        throw new Error('데이터 처리 중 오류가 발생했습니다.');
      }
      
      setData(result.data || []);
    } catch (err) {
      console.error('Landing Conversion API Error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingConversionData();
  }, [currentEvent]);

  const sortedData = [...data].sort((a, b) => {
    const primarySort = sortOrder === 'asc' ? a.conversionRate - b.conversionRate : b.conversionRate - a.conversionRate;
    
    if (primarySort === 0) {
      return b.totalSessions - a.totalSessions;
    }
    
    return primarySort;
  });

  const maxConversionRate = data.length > 0 ? Math.max(...data.map(landing => landing.conversionRate)) : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2">
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-1/2">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">첫 유입페이지 전환율 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

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
              <tr key={`${landing.landing}-${landing.source}-${landing.medium}`} className="border-b border-gray-100 hover:bg-gray-50" data-tooltip-id={`landing-tooltip-${idx}`}>
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