import React, { useState, useEffect } from 'react';
import { Code, IdCard } from 'lucide-react';
import Toast from "../ui/Toast";
import { ConversionEventMapping } from './ConversionEventMapping';
import { EventRuleManager } from './EventRuleManager';
import { ButtonEventManager } from './ButtonEventManager';
import { DomainManager } from './DomainManager';

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

  const sdkCode = `<script type="module" src="https://klicklab-sdk.pages.dev/klicklab_sdk.js" data-sdk-key="${keyData}"></script>`;

  const [showToast, setShowToast] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowToast(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* SDK 설치 가이드 */}
      <div className="custom-card">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">SDK 설치 가이드</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            웹사이트에 아래 코드를 추가하여 이벤트 수집을 시작하세요.
          </p>
          <div className="relative">
            <pre className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
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

      {/* SDK 키 확인하기와 도메인 연동 리스트 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 custom-card">
          <div className="flex items-center gap-2 mb-4">
            <IdCard className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">SDK 키 확인하기</h2>
          </div>
          <div className="space-y-6 flex justify-center">
            <div className="relative">
              <pre className="bg-gray-50 hover:bg-gray-100 p-4 pr-16 rounded-lg text-sm overflow-x-auto min-w-[280px]">
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

        <div className="col-span-2">
          <DomainManager />
        </div>
      </div>

      {/* 전환 이벤트 관리 */}
      <ConversionEventMapping />

      {/* 이벤트 생성 규칙 관리와 버튼 이벤트 관리 */}
      <div className="grid grid-cols-2 gap-4">
        <EventRuleManager />
        <ButtonEventManager />
      </div>
    </div>
  );
}; 