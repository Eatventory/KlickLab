import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface DomainData {
  domain: string;
  status: 'active' | 'inactive' | 'pending';
  lastEvent: string;
  eventCount: number;
}

// const formatDate = (date: Date) => {
//   const pad = (n: number) => String(n).padStart(2, '0');
//   const year = date.getFullYear();
//   const month = pad(date.getMonth() + 1);
//   const day = pad(date.getDate());
//   const hour = pad(date.getHours());
//   const minute = pad(date.getMinutes());
//   const second = pad(date.getSeconds());
//   return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
// };

export const DomainManager: React.FC = () => {
  const [domainData, setDomainData] = useState<DomainData>({
    domain: '-',
    status: 'pending',
    lastEvent: '-',
    eventCount: 0
  });

  // const [domainData, setDomainData] = useState<DomainData>({
  //   domain: 'jgshop.com',
  //   status: 'active',
  //   lastEvent: formatDate(new Date()),
  //   eventCount: 1247
  // });

  const getDomain = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      const domainRes = await fetch('/api/settings/get-domain', {headers: { Authorization: `Bearer ${token}` }});
      const yourDomain = await domainRes.json();
      setDomainData(yourDomain);
    } catch(error) {
      console.error('Failed to get domain:', error);
      setDomainData({
        domain: '-',
        status: 'inactive',
        lastEvent: '-',
        eventCount: 0
      });
    }
  }

  useEffect(() => {
    getDomain();
  }, []);

  return (
    <div className="custom-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">도메인 연동 리스트</h2>
        </div>
        {/* <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        도메인 추가
        </button> */}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-900">도메인</th>
            <th className="text-center py-3 px-4 font-medium text-gray-900">상태</th>
            <th className="text-center py-3 px-4 font-medium text-gray-900">마지막 이벤트</th>
            <th className="text-right py-3 px-4 font-medium text-gray-900">이벤트 수</th>
            <th className="text-center py-3 px-4 font-medium text-gray-900">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
            <td className="py-3 px-4 text-gray-700 font-medium">{domainData.domain}</td>
            <td className="py-3 px-4 text-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
              domainData.status === 'active' ? 'bg-green-100 text-green-800' :
              domainData.status === 'inactive' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
              }`}>
              {domainData.status === 'active' ? '활성' : domainData.status === 'inactive' ? '비활성' : '대기중'}
              </span>
            </td>
            <td className="py-3 px-4 text-center text-gray-600">{domainData.lastEvent}</td>
            <td className="py-3 px-4 text-right text-gray-700">{domainData.eventCount}</td>
            <td className="py-3 px-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm">설정</button>
            </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};