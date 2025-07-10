import React, { useState, useEffect } from 'react'; // React에서 컴포넌트 생성 및 상태/라이프사이클 훅 불러오기
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'; // lucide-react 아이콘들 불러오기
import clsx from 'clsx'; // 조건부 클래스 이름을 쉽게 관리하는 유틸

// API 응답 데이터 구조 정의
interface ConversionSummaryData {
  conversionRate: number;         // 전환률 (예: 38.4%)
  convertedSessions: number;      // 전환된 세션 수 (예: 384)
  totalSessions: number;          // 총 세션 수 (예: 1000)
  deltaRate: number;              // 전환률 변화폭 (예: +2.3%)
  trend: 'up' | 'down' | 'flat';  // 트렌드 방향
}

// 카드 컴포넌트 정의 (함수형 컴포넌트)
export const ConversionSummaryCard: React.FC = () => {
  const [data, setData] = useState<ConversionSummaryData | null>(null); // 데이터 상태 선언
  const [loading, setLoading] = useState(true);                         // 로딩 상태 선언
  const [error, setError] = useState<string | null>(null);              // 에러 상태 선언
  const [isHovered, setIsHovered] = useState(false);                    // 호버 상태 선언

  // 데이터를 API에서 불러오는 비동기 함수
  const fetchConversionSummary = async () => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    try {
      setLoading(true); // 로딩 상태 설정
      setError(null);   // 에러 상태 초기화
      if (!token) throw new Error("No token");
      const response = await fetch(`/api/overview/conversion-summary`, {headers: { Authorization: `Bearer ${token}` }}); // API 엔드포인트에서 데이터 가져오기
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // 응답이 성공하지 않으면 에러 발생
      }
      
      const result: ConversionSummaryData = await response.json(); // 응답 데이터를 파싱하여 저장(JSON)
      setData(result); // 데이터 상태 업데이트
    } catch (error) {
      console.error('Failed to fetch conversion summary:', error); // 에러 로깅
      setError('데이터를 불러오는데 실패했습니다.'); // 에러 메시지 설정
      
      // 실패했을 경우 대체 데이터를 세팅(Mock Data)
      setData({
        conversionRate: 38.4,
        convertedSessions: 384,
        totalSessions: 1000,
        deltaRate: 2.3,
        trend: 'up'
      });
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 컴포넌트 마운트 시 한 번만 fetch 실행
  useEffect(() => {
    fetchConversionSummary();
  }, []); // 의존성 배열에 빈 배열 전달하여 컴포넌트 마운트 시 한 번만 실행

  // 트렌드 방향에 따라 아이콘 반환
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  // 트렌드 방향에 따라 색상 반환 (글씨씨)
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  // 트렌드 방향에 따라 배경색 반환
  const getTrendBgColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-100';
      case 'down':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  // 로딩 중일 때 보여줄 UI
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  // 에러 발생 시 보여줄 UI
  if (error && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  // 데이터가 없을 경우 아무 것도 렌더링하지 않음
  if (!data) {
    return null;
  }

  // 정상 상태 UI
  return (
    <div 
      className="relative p-3 rounded-xl border border-gray-200 shadow-sm bg-white aspect-square flex flex-col justify-center cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-center">
        {/* 중앙 상단 아이콘 */}
        <div className="p-2 rounded-lg shadow-sm mx-auto mb-2 w-fit bg-purple-50">
          <div className="text-purple-600">
            <Target className="w-6 h-6" />
          </div>
        </div>
        {/* 제목 */}
        <h3 className="text-sm font-medium text-gray-600 mb-2">전환률</h3>

        {/* 전환률 숫자 */}
        <p className="text-2xl font-bold text-gray-900 mb-2">
          {data.conversionRate.toFixed(1)}%
        </p>
        
        {/* 변화량 및 트렌드 아이콘 */}
        <div className="flex items-center justify-center gap-1">
          <div className={clsx(
            'p-1 rounded-full transition-all duration-300',
            getTrendBgColor(data.trend)
          )}>
            {getTrendIcon(data.trend)}
          </div>
          <span className={clsx('text-sm font-semibold',getTrendColor(data.trend))}>
            {data.deltaRate > 0 ? '+' : ''}{data.deltaRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 마우스를 올렸을 때 나타나는 툴팁 */}
      {isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap border border-gray-200 backdrop-blur-sm">
          <div className="font-semibold text-gray-900">전환 요약</div>
          <div className="text-purple-600 font-bold">{data.conversionRate.toFixed(1)}%</div>
          <div className="text-gray-500 text-xs">
            {data.convertedSessions.toLocaleString()} / {data.totalSessions.toLocaleString()} 세션
          </div>
          <div className="text-gray-500 text-xs">
            최근 7일 기준
          </div>
        </div>
      )}
    </div>
  );
}; 