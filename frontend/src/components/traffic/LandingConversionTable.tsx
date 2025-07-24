import React, { useState, useEffect } from 'react';
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
      
      const response = await fetch(`/api/acquisition/landing-conversion-rate?to=/checkout/success&event=${currentEvent}`, {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col min-h-0 overflow-hidden p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">첫 유입 페이지 전환율</h3>
        <button className="text-xs text-gray-500" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          전환율 {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <div className="text-xs text-gray-500 mb-2 flex w-full">
        <div className="flex-1 pl-1">랜딩 페이지</div>
        <div className="w-12 text-right pr-1">전환율</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedData.map((landing, idx) => (
          <div key={`${landing.landing}-${landing.source}-${landing.medium}`} className="mb-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 text-sm">{landing.landing}</span>
              <span className="font-bold text-sm text-gray-900">{landing.conversionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded mt-2" style={{ height: '6px' }}>
              <div className="bg-blue-500 rounded" style={{ width: `${landing.conversionRate}%`, height: '6px' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full px-6 pb-4 text-xs text-gray-500">
        * 전환율은 해당 랜딩 페이지로 유입된 세션 대비 전환 완료 세션의 비율입니다.
      </div>
    </div>
  );
}; 