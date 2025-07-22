// 파일명: ButtonEventManager.tsx
// 설명: CSS 선택자 기반의 버튼 클릭 이벤트 규칙을 관리하는 UI 컴포넌트입니다.

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

// 타입 정의: 버튼 이벤트 규칙
interface ButtonEventRule {
  config_id: string;
  event_name: string;
  css_selector: string;
  description: string;
  created_at: string;
}

export const ButtonEventManager: React.FC = () => {
  const [rules, setRules] = useState<ButtonEventRule[]>([]);
  const [eventName, setEventName] = useState('');
  const [cssSelector, setCssSelector] = useState('');
  const [description, setDescription] = useState('');

  // 규칙 목록을 서버에서 불러오는 함수
  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      // 변경된 API 경로로 요청
      const response = await fetch('/api/buttonConfigs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch button event rules:', error);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // 새 규칙을 생성하는 함수
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      // 변경된 API 경로로 요청
      const response = await fetch('/api/buttonConfigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_name: eventName, css_selector: cssSelector, description }),
      });

      if (response.ok) {
        setEventName('');
        setCssSelector('');
        setDescription('');
        fetchRules(); // 목록 새로고침
      }
    } catch (error) {
      console.error('Failed to create button event rule:', error);
    }
  };

  // 규칙을 삭제하는 함수
  const handleDeleteRule = async (config_id: string) => {
    if (window.confirm("정말로 이 규칙을 삭제하시겠습니까?")) {
      try {
        const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
        // 변경된 API 경로로 요청
        await fetch(`/api/buttonConfigs/${config_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchRules(); // 목록 새로고침
      } catch (error) {
        console.error('Failed to delete button event rule:', error);
      }
    }
  };

  return (
    <div className="custom-card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">버튼 클릭 이벤트 설정</h2>
      
      <form onSubmit={handleCreateRule} className="mb-6 p-4 border rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">이벤트 이름</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., add_to_cart" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CSS 선택자</label>
            <input type="text" value={cssSelector} onChange={(e) => setCssSelector(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., #add-to-cart-btn" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">설명 (선택)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., 장바구니 담기 버튼" />
          </div>
        </div>
        <div className="mt-4 text-right">
          <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            버튼 규칙 추가
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium">이벤트 이름</th>
              <th className="text-left py-3 px-4 font-medium">CSS 선택자</th>
              <th className="text-left py-3 px-4 font-medium">설명</th>
              <th className="text-center py-3 px-4 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.config_id} className="border-b">
                <td className="py-3 px-4 font-medium">{rule.event_name}</td>
                <td className="py-3 px-4 text-gray-600 font-mono">{rule.css_selector}</td>
                <td className="py-3 px-4 text-gray-500">{rule.description}</td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => handleDeleteRule(rule.config_id)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="inline-block w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
