import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import Toast from '../ui/Toast';
import { useConversionEvent } from '../../context/ConversionEventContext';

const mockEventList = [
  'is_payment',
  'is_signup',
  'add_to_cart',
  'contact_submit',
];

export const ConversionEventMapping: React.FC = () => {
  const conversionEventCtx = useConversionEvent() as any;
  const currentEvent = conversionEventCtx?.currentEvent;
  const updateEvent = conversionEventCtx?.updateEvent;
  const [eventList] = useState<string[]>(mockEventList);
  const [selectedEvent, setSelectedEvent] = useState<string>(mockEventList[0]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (currentEvent) setSelectedEvent(currentEvent);
  }, [currentEvent]);

  const saveConversionEvent = () => {
    if (updateEvent) updateEvent(selectedEvent);
    setShowToast(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 pt-6 pr-6 pl-6 pb-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">전환 이벤트 설정</h2>
      </div>
      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-2 mb-2 justify-center">
          <span className="text-base font-semibold text-gray-700">현재 설정:</span>
          <span className="text-lg font-bold text-blue-700">{currentEvent}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 justify-center">
          <select
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value)}
            className="h-10 w-48 px-3 border border-gray-300 rounded-md text-sm"
          >
            {eventList.map(event => (
              <option key={event} value={event}>{event}</option>
            ))}
          </select>
          <button
            onClick={saveConversionEvent}
            className="h-10 px-5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm ml-0 sm:ml-3"
          >
            변경
          </button>
        </div>
        {showToast && (
          <Toast message="전환 이벤트가 성공적으로 저장되었습니다!" onClose={() => setShowToast(false)} />
        )}
      </div>
    </div>
  );
}; 