import React, { useState, useEffect } from 'react';
import DateRangeSelector from '../ui/DateRangeSelector';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { FileText, Download, Share2, Calendar } from 'lucide-react';
import TableSection from '../ui/TableSection';

interface KpiReportData {
  dailyMetrics: Array<{ date: string; visitors: number; new_visitors: number; existing_visitors: number; avg_session_seconds: number }>;
  clickSummary: Array<{ date: string; segment_type: string; segment_value: string; total_clicks: number; total_users: number; avg_clicks_per_user: number }>;
  eventSummary: Array<{ date: string; event_name: string; event_count: number; unique_users: number }>;
}

export const ReportDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState([{ startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  const [reportData, setReportData] = useState<KpiReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchReport = async (start: Date, end: Date) => {
    try {
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      const startStr = dayjs(start).format('YYYY-MM-DD');
      const endStr   = dayjs(end).format('YYYY-MM-DD');
      const res = await fetch(`/api/report/kpi-report?startDate=${startStr}&endDate=${endStr}`, { headers: { Authorization: `Bearer ${token}` } });
      const data: KpiReportData = await res.json();
      setReportData(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { startDate, endDate } = dateRange[0];
    fetchReport(startDate, endDate);
  }, [dateRange]);

  const handleExport = async () => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (!token) throw new Error("No token");
    const { startDate, endDate } = dateRange[0];
    const startStr = dayjs(startDate).format('YYYY-MM-DD');
    const endStr   = dayjs(endDate).format('YYYY-MM-DD');
    // window.location.href = `/api/report/kpi-report/csv?startDate=${startStr}&endDate=${endStr}`;
    try {
      const res = await fetch(`/api/report/kpi-report/csv?startDate=${startStr}&endDate=${endStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `kpi-report_${startStr}_to_${endStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
    } catch (err) {
      setError(true);
      console.error(err || "CSV 다운로드 실패");
    }
  };

  // const handleShare = () => {
  //   console.log('Sharing report...');
  //   // 실제로는 링크 생성 및 공유
  // };

  return (
    <div>
      <div className='w-full flex justify-end border-b-2 border-dashed'>
        <DateRangeSelector
          dateRange={dateRange}
          tempRange={tempRange}
          showPicker={showPicker}
          setDateRange={setDateRange}
          setTempRange={setTempRange}
          setShowPicker={setShowPicker}
          onApply={(start, end) => {
            setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
            fetchReport(start, end);
          }}
        />
      </div>

      <div className='p-6 space-y-6'>
        {/* KPI 테이블 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className='flex justify-between'>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">KPI 요약 리포트</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
              {/* <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                공유
              </button> */}
            </div>
          </div>

          <div className="overflow-x-auto flex flex-col gap-4">
            {/* 일별 지표 테이블 */}
            <TableSection title="일별 지표" data={reportData?.dailyMetrics} columns={[
              { header: '날짜', key: 'date' },
              { header: '방문자', key: 'visitors' },
              { header: '신규', key: 'new_visitors' },
              { header: '기존', key: 'existing_visitors' },
              { header: '평균 세션(초)', key: 'avg_session_seconds' },
            ]}/>

            {/* 클릭 요약 테이블 */}
            <TableSection title="클릭 요약" data={reportData?.clickSummary} columns={[
              { header: '날짜', key: 'date' },
              { header: '세그먼트', key: 'segment_type' },
              { header: '값', key: 'segment_value' },
              { header: '클릭 수', key: 'total_clicks' },
              { header: '사용자 수', key: 'total_users' },
              { header: '클릭/사용자', key: 'avg_clicks_per_user' },
            ]}/>

            {/* 이벤트 집계 테이블 */}
            <TableSection title="이벤트 집계" data={reportData?.eventSummary} columns={[
              { header: '날짜', key: 'date' },
              { header: '이벤트명', key: 'event_name' },
              { header: '발생 수', key: 'event_count' },
              { header: '사용자 수', key: 'unique_users' },
            ]}/>
          </div>
        </div>
      </div>
    </div>
  );
}; 