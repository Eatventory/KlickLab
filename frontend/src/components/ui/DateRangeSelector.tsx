import React, { useRef } from 'react';
import { DateRangePicker, createStaticRanges } from 'react-date-range';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const customStaticRanges = createStaticRanges([
  { label: '오늘', range: () => ({ startDate: new Date(), endDate: new Date() }) },
  { label: '어제', range: () => {
      const yesterday = addDays(new Date(), -1);
      return { startDate: yesterday, endDate: yesterday };
  }},
  { label: '이번 주', range: () => {
      const today = new Date();
      return {
        startDate: startOfWeek(today, { weekStartsOn: 0 }),
        endDate: endOfWeek(today, { weekStartsOn: 0 }),
      };
  }},
  { label: '지난 주', range: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 0 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 0 }),
      };
  }},
  { label: '이번 달', range: () => {
      const today = new Date();
      return {
        startDate: startOfMonth(today),
        endDate: endOfMonth(today),
      };
  }},
  { label: '지난 달', range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
  }},
]);

interface DateRangeSelectorProps {
  dateRange: { startDate: Date; endDate: Date }[];
  tempRange: { startDate: Date; endDate: Date }[];
  showPicker: boolean;
  setDateRange: (range: { startDate: Date; endDate: Date }[]) => void;
  setTempRange: (range: { startDate: Date; endDate: Date }[]) => void;
  setShowPicker: (val: boolean) => void;
  onApply: (start: Date, end: Date) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  tempRange,
  showPicker,
  setDateRange,
  setTempRange,
  setShowPicker,
  onApply
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <button
        className="m-2 mr-6 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
        onClick={() => {
          if (showPicker) {
            setTempRange(dateRange);
            setShowPicker(false);
          } else {
            setShowPicker(true);
          }
        }}
      >
        {dateRange[0].startDate.toISOString().slice(0, 10)} ~ {dateRange[0].endDate.toISOString().slice(0, 10)}
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTempRange(dateRange);
              setShowPicker(false);
            }}
          />
          <div ref={pickerRef} className="absolute right-6 z-50 mt-2 border border-gray-200 rounded-xl shadow-lg bg-white p-4">
            <DateRangePicker
              onChange={(item) => setTempRange([item.selection])}
              ranges={tempRange}
              months={1}
              direction="horizontal"
              rangeColors={['#2563eb']}
              staticRanges={customStaticRanges}
              inputRanges={[]}
              locale={ko}
              showSelectionPreview
              moveRangeOnFirstSelection={false}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => {
                  setTempRange(dateRange);
                  setShowPicker(false);
                }}
              >
                취소
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => {
                  setDateRange(tempRange);
                  setShowPicker(false);
                  const { startDate, endDate } = tempRange[0];
                  if (startDate && endDate) onApply(startDate, endDate);
                }}
              >
                적용
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangeSelector;
