import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

// 타입 정의
interface EventRule {
  rule_id: string;
  new_event_name: string;
  source_event_name: string;
  condition_type: string;
  condition_parameter: string;
  condition_value: string;
  is_active: number;
  created_at: string;
}

export const EventRuleManager: React.FC = () => {
  const [rules, setRules] = useState<EventRule[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [sourceEvent, setSourceEvent] = useState('page_view');
  const [conditionType, setConditionType] = useState('url_contains');
  const [conditionValue, setConditionValue] = useState('');

  const handleSourceEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSourceEvent = e.target.value;
    setSourceEvent(newSourceEvent);
    if (newSourceEvent === 'page_view') {
      setConditionType('url_contains');
      setConditionValue('');
    } else if (newSourceEvent === 'form_submit') {
      setConditionType('form_id_equals');
      setConditionValue('');
    }
  };

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch('/api/rules', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch event rules:', error);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log("Sending conditionType:", conditionType);
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          new_event_name: newEventName,
          source_event_name: sourceEvent,
          condition_type: conditionType,
          condition_parameter: sourceEvent === 'page_view' ? 'page_path' : 'form_id',
          condition_value: conditionValue,
        }),
      });

      if (response.ok) {
        setNewEventName('');
        setConditionValue('');
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to create event rule:', error);
    }
  };

  const handleDeleteRule = async (rule_id: string) => {
    if (window.confirm("정말로 이 규칙을 삭제하시겠습니까?")) {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        const response = await fetch(`/api/rules/${rule_id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          fetchRules(); // 삭제 후 목록 새로고침
        }
      } catch (error) {
        console.error('Failed to delete event rule:', error);
      }
    }
  };

  return (
    <div className="custom-card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">이벤트 생성 규칙 관리</h2>

      {/* 규칙 생성 폼 */}
      <form onSubmit={handleCreateRule} className="mb-6 p-4 border rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">새 이벤트 이름</label>
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., purchase_complete"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">기반 이벤트</label>
            <select
              value={sourceEvent}
              onChange={handleSourceEventChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="page_view">페이지뷰 (page_view)</option>
              <option value="form_submit">폼 제출 (form_submit)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">실행 조건</label>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {sourceEvent === 'page_view' && (
                <>
                  <option value="url_contains">URL 포함</option>
                  <option value="url_equals">URL 같음</option>
                </>
              )}
              {sourceEvent === 'form_submit' && (
                <option value="form_id_equals">Form ID 같음</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">조건 값</label>
            <input
              type="text"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder={sourceEvent === 'page_view' ? "e.g., /order/success" : "e.g., contact-form-id"}
              required
            />
          </div>
        </div>
        <div className="mt-4 text-right">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            규칙 추가
          </button>
        </div>
      </form>

      {/* 규칙 목록 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">새 이벤트 이름</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">조건</th>
              {/* <th className="text-center py-3 px-4 font-medium text-gray-900">액션</th> */}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.rule_id} className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700 font-medium">{rule.new_event_name}</td>
                <td className="py-3 px-4 text-gray-600">
                  {rule.source_event_name === 'page_view' && (
                    rule.condition_type === 'url_contains'
                      ? `${rule.source_event_name} 이벤트의 ${rule.condition_parameter}에 '${rule.condition_value}'가 포함될 때`
                      : `${rule.source_event_name} 이벤트의 ${rule.condition_parameter}가 '${rule.condition_value}'와 같을 때`
                  )}
                  {rule.source_event_name === 'form_submit' &&
                    `폼 제출 이벤트의 Form ID가 '${rule.condition_value}'와(과) 같을 때`}
                </td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => handleDeleteRule(rule.rule_id)} className="text-red-600 hover:text-red-800 text-sm"> <Trash2 className="inline-block w-4 h-4" /> </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
