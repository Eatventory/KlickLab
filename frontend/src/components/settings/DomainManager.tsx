import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import Toast from "../ui/Toast";

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

  const [showToast, setShowToast] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDomain, setEditedDomain] = useState(domainData.domain);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getDomain = async () => {
    try {
      const token =
        localStorage.getItem('klicklab_token') ||
        sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error('No token');
      const domainRes = await fetch('/api/settings/get-domain', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const yourDomain = await domainRes.json();
      setDomainData({
        domain: yourDomain.domain,
        status: yourDomain.status,
        lastEvent: !yourDomain.lastEvent.startsWith('1970-01-01') ? yourDomain.lastEvent : '-',
        eventCount: yourDomain.eventCount
      });
    } catch (error) {
      console.error('Failed to get domain:', error);
      setDomainData({
        domain: '-',
        status: 'inactive',
        lastEvent: '-',
        eventCount: 0,
      });
    }
  };

  useEffect(() => {
    getDomain();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setEditedDomain(domainData.domain);
    }
  }, [domainData.domain, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
    setErrorMsg('');
  };

  const handleConfirmClick = async () => {
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,}$/;

    if (!editedDomain.trim()) {
      setErrorMsg('도메인을 입력해주세요.');
      return;
    }

    if (!domainRegex.test(editedDomain.trim())) {
      setErrorMsg('올바른 도메인 형식이 아닙니다. 예: example.com');
      return;
    }

    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error('No token');

      const res = await fetch('/api/settings/update-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: editedDomain }),
      });
      if (!res.ok) throw new Error('Failed to update domain');

      await getDomain();
      setIsEditing(false);
      setShowToast(true);
      setToastMsg("도메인이 수정되었습니다.");
      setErrorMsg('');
    } catch (error) {
      // console.error('Failed to update domain:', error);
      setToastMsg(`도메인 수정에 실패했습니다: ${error}`);
    }
  };

  return (
    <div className="custom-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">도메인 연동 리스트</h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="text-left py-3 px-4 font-medium text-gray-900"
                style={{ width: '35%' }}
              >
                도메인
              </th>
              <th
                className="text-center py-3 px-4 font-medium text-gray-900"
                style={{ width: '10%' }}
              >
                상태
              </th>
              <th
                className="text-center py-3 px-4 font-medium text-gray-900"
                style={{ width: '20%' }}
              >
                마지막 이벤트
              </th>
              <th
                className="text-right py-3 px-4 font-medium text-gray-900"
                style={{ width: '20%' }}
              >
                이벤트 수
              </th>
              <th
                className="text-center py-3 px-4 font-medium text-gray-900"
                style={{ width: '15%' }}
              >
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-700 font-medium">
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      className="border border-gray-300 rounded px-2 py-1 w-full"
                      value={editedDomain}
                      onChange={(e) => setEditedDomain(e.target.value)}
                    />
                    {errorMsg && (
                      <div className="text-red-500 text-sm mt-1">{errorMsg}</div>
                    )}
                  </div>
                ) : (
                  domainData.domain
                )}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    domainData.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : domainData.status === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {domainData.status === 'active'
                    ? '활성'
                    : domainData.status === 'inactive'
                    ? '비활성'
                    : '대기중'}
                </span>
              </td>
              <td className="py-3 px-4 text-center text-gray-600">
                {domainData.lastEvent}
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                {domainData.eventCount}
              </td>
              <td className="py-3 px-4 text-center">
                {isEditing ? (
                  <>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                      onClick={handleConfirmClick}
                    >
                      확인
                    </button>
                    <button
                      className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                      onClick={() => setIsEditing(false)}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={handleEditClick}
                  >
                    설정
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        {showToast && (
          <Toast message={toastMsg} onClose={() => setShowToast(false)} />
        )}
      </div>
    </div>
  );
};