import React, { createContext, useContext, useState, useEffect } from 'react';

// 전환 이벤트 전역 상태 Context 생성
const ConversionEventContext = createContext(null);

// Context를 쉽게 쓰기 위한 커스텀 훅
export const useConversionEvent = () => useContext(ConversionEventContext);

// Provider 컴포넌트
export const ConversionEventProvider = ({ children }) => {
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);

  // 앱 시작 시 서버에서 현재 전환 이벤트 불러오기
  const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
  if (!token) throw new Error("No token");
  useEffect(() => {
    fetch('/api/settings/current-conversion-event', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCurrentEvent(data.currentEvent));
  }, []);

  // 전환 이벤트 변경 및 서버 저장
  const updateEvent = (event: string) => {
    fetch('/api/settings/conversion-event', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    }).then(() => setCurrentEvent(event));
  };

  return (
    <ConversionEventContext.Provider value={{ currentEvent, updateEvent }}>
      {children}
    </ConversionEventContext.Provider>
  );
}; 