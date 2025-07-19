import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, BarChart } from 'lucide-react';
import Toast from '../ui/Toast';

interface ConversionEvent {
  event_name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const ConversionEventMapping: React.FC = () => {
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 전환 이벤트 목록 조회
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch('/api/conversion-events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversion events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 전환 이벤트 추가
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch('/api/conversion-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          event_name: newEventName,
          description: newEventDescription
        })
      });
      
      if (response.ok) {
        setToastMessage('전환 이벤트가 추가되었습니다.');
        setShowToast(true);
        setNewEventName('');
        setNewEventDescription('');
        setShowAddForm(false);
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to add conversion event:', error);
      setToastMessage('전환 이벤트 추가에 실패했습니다.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // 전환 이벤트 토글 (활성/비활성)
  const handleToggleEvent = async (event_name: string, is_active: number) => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch(`/api/conversion-events/${event_name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: is_active ? 0 : 1
        })
      });
      
      if (response.ok) {
        fetchEvents();
        setToastMessage(`${event_name} 이벤트가 ${is_active ? '비활성화' : '활성화'}되었습니다.`);
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to toggle conversion event:', error);
    }
  };

  // 전환 이벤트 삭제
  const handleDeleteEvent = async (event_name: string) => {
    if (!window.confirm(`'${event_name}' 이벤트를 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch(`/api/conversion-events/${event_name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchEvents();
        setToastMessage('전환 이벤트가 삭제되었습니다.');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to delete conversion event:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">전환 이벤트 관리</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          이벤트 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <form onSubmit={handleAddEvent} className="mb-6 p-4 border rounded-md bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">이벤트 이름</label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="예: purchase_complete"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">설명</label>
              <input
                type="text"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="예: 구매 완료"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      {/* 이벤트 목록 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">이벤트 이름</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">설명</th>
              <th className="text-center py-3 px-4 font-medium text-gray-900">상태</th>
              <th className="text-center py-3 px-4 font-medium text-gray-900">액션</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  등록된 전환 이벤트가 없습니다.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.event_name} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-700 font-medium">
                    {event.event_name}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {event.description || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleEvent(event.event_name, event.is_active)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        event.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {event.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => window.location.href = `/analytics?event=${event.event_name}`}
                        className="text-blue-600 hover:text-blue-800"
                        title="통계 보기"
                      >
                        <BarChart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.event_name)}
                        className="text-red-600 hover:text-red-800"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-800">
          💡 전환 이벤트로 등록된 이벤트들은 전환율 계산 및 퍼널 분석에 사용됩니다.
          Dictionary는 5-6분마다 자동 갱신되므로, 변경사항이 반영되기까지 약간의 시간이 걸릴 수 있습니다.
        </p>
      </div>

      {showToast && (
        <Toast 
          message={toastMessage} 
          onClose={() => setShowToast(false)} 
        />
      )}
    </div>
  );
};