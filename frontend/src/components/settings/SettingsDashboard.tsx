import React, { useState, useEffect } from 'react';
import { Settings, Code, Globe, Users, Bell, IdCard } from 'lucide-react';
import Toast from "../ui/Toast";
import { ConversionEventMapping } from './ConversionEventMapping';
import { EventRuleManager } from './EventRuleManager';
import SegmentFilterManager from './SegmentFilterManager';
import { SegmentFilterBuilder } from '../ui/SegmentFilterBuilder';
import {ButtonEventManager} from './ButtonEventManager'

// 타입 정의
interface DomainData {
  id: string;
  domain: string;
  status: 'active' | 'inactive' | 'pending';
  lastEvent: string;
  eventCount: number;
}

export const SettingsDashboard: React.FC = () => {
  const [keyData, setKeyData] = useState<string>('00000000-0000-0000-0000-000000000000');

  const getKey = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      const keyRes = await fetch(`/api/settings/get-key`, {headers: { Authorization: `Bearer ${token}` }});
      const yourKey = await keyRes.json();
      setKeyData(yourKey);
    } catch(error) {
      console.error('Failed to get SDK key:', error);
    }
  };

  useEffect(() => {
    getKey();
  }, []);

  const [domains, setDomains] = useState<DomainData[]>([
    {
      id: '1',
      domain: 'your-api-endpoint.com',
      status: 'active',
      lastEvent: '2024-07-09 15:37:24',
      eventCount: 1247
    }
  ]);

  const sdkCode = `
    <script type="module" src="https://klicklab-sdk.pages.dev/klicklab_sdk.js"
    data-sdk-key="${keyData}"></script>
  `;

  const [showToast, setShowToast] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowToast(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* 전역 필터 설정 */}
      <SegmentFilterBuilder />

      {/* 2분할 카드 wrapper에는 bg/padding/rounded 없음 */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2">
          <ConversionEventMapping />
        </div>
        <div className="w-full lg:w-1/2">
          <SegmentFilterManager />
        </div>
      </div>

      {/* 이벤트 생성 규칙 관리 */}
      <EventRuleManager />

      {/* 버튼에 이벤트 넣기 */}
      <ButtonEventManager />

      {/* SDK 설치 가이드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">SDK 설치 가이드</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            웹사이트에 아래 코드를 추가하여 이벤트 수집을 시작하세요.
          </p>
          <div className="relative">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              <code className="block text-left">{sdkCode}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(sdkCode)}
              className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              복사
            </button>
            {showToast && (
              <Toast message="클립보드에 복사되었습니다!" onClose={() => setShowToast(false)} />
            )}
          </div>
        </div>
      </div>

      {/* 사용자 SDK KEY */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">SDK 키 확인하기</h2>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              <code className="block text-left">{keyData}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(keyData)}
              className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              복사
            </button>
            {showToast && (
              <Toast message="클립보드에 복사되었습니다!" onClose={() => setShowToast(false)} />
            )}
          </div>
        </div>
      </div>

      {/* 도메인 연동 리스트 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">도메인 연동 리스트</h2>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            도메인 추가
          </button>
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
              {domains.map((domain) => (
                <tr key={domain.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700 font-medium">{domain.domain}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      domain.status === 'active' ? 'bg-green-100 text-green-800' :
                      domain.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {domain.status === 'active' ? '활성' : domain.status === 'inactive' ? '비활성' : '대기중'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{domain.lastEvent}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{domain.eventCount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">설정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 향후 구현 예정 컴포넌트들 */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">사용자 권한 관리</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">알림 설정</h3>
          </div>
          <div className="flex items-center justify-center h-32 text-gray-500">
            개발 중...
          </div>
        </div>
      </div> */}
    </div>
  );
}; 