import React from 'react';

interface ClickFlowData {
  nodes: { id: string; name: string; value: number }[];
  links: { source: string; target: string; value: number }[];
}

interface ClickFlowSankeyChartProps {
  data: ClickFlowData;
  refreshKey: number;
}

export const ClickFlowSankeyChart: React.FC<ClickFlowSankeyChartProps> = ({ refreshKey }) => {
  return (
    <div className="h-full w-full relative">
      <div className="grid grid-cols-4 gap-1 h-full items-center">
        {/* 1단계: 유입 소스 */}
        <div className="flex flex-col space-y-1">
          <div className="bg-blue-50 border border-blue-200 rounded p-1 text-center relative">
            <div className="text-xs font-medium text-blue-900">Google</div>
            <div className="text-xs font-bold text-blue-700">420</div>
            {/* 화살표 */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-blue-400 border-b-[6px] border-b-transparent"></div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-1 text-center relative">
            <div className="text-xs font-medium text-green-900">Naver</div>
            <div className="text-xs font-bold text-green-700">280</div>
            {/* 화살표 */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-green-400 border-b-[6px] border-b-transparent"></div>
            </div>
          </div>
        </div>

        {/* 2단계: 랜딩 페이지 */}
        <div className="flex items-center justify-center">
          <div className="bg-purple-50 border border-purple-200 rounded p-1 text-center w-full relative">
            <div className="text-xs font-medium text-purple-900">홈페이지</div>
            <div className="text-xs font-bold text-purple-700">700</div>
            {/* 화살표 */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[16px] border-l-purple-400 border-b-[8px] border-b-transparent"></div>
            </div>
          </div>
        </div>

        {/* 3단계: 상품 페이지 */}
        <div className="flex items-center justify-center">
          <div className="bg-orange-50 border border-orange-200 rounded p-1 text-center w-full relative">
            <div className="text-xs font-medium text-orange-900">상품페이지</div>
            <div className="text-xs font-bold text-orange-700">490</div>
            {/* 화살표 */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[12px] border-l-orange-400 border-b-[6px] border-b-transparent"></div>
            </div>
          </div>
        </div>

        {/* 4단계: 전환 */}
        <div className="flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded p-1 text-center w-full">
            <div className="text-xs font-medium text-red-900">장바구니</div>
            <div className="text-xs font-bold text-red-700">245</div>
          </div>
        </div>
      </div>

      {/* 연결선 표시 (배경) */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 via-orange-300 to-red-300 -z-10 opacity-30"></div>
    </div>
  );
}; 