import React, { useState, useEffect } from 'react';
import DateRangeSelector from '../ui/DateRangeSelector';
import { addDays } from 'date-fns';
import dayjs from 'dayjs';
import { FileText, Download } from 'lucide-react';
import TableSection from '../ui/TableSection';
import Collapse from '../ui/Collapse';

interface KpiSection {
  category: string;
  data: Record<string, any>[];
}

type KpiReportResponse = {
  [section: string]: KpiSection;
};

export const ReportDashboard: React.FC = () => {
  const [reportData, setReportData] = useState<KpiReportResponse | null>(null);
  const [openCollapse, setOpenCollapse] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<string>('csv');

  const [dateRange, setDateRange] = useState([{ startDate: addDays(new Date(), -29), endDate: new Date(), key: 'selection' }]);
  const [tempRange, setTempRange] = useState(dateRange);
  const [showPicker, setShowPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchReport = async (start: Date, end: Date) => {
    try {
      setLoading(true);
      setError(false);
      const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
      if (!token) throw new Error("No token");
      const startStr = dayjs(start).format('YYYY-MM-DD');
      const endStr = dayjs(end).format('YYYY-MM-DD');
      const res = await fetch(`/api/report/kpi-report?startDate=${startStr}&endDate=${endStr}`, { headers: { Authorization: `Bearer ${token}` }});
      const data: KpiReportResponse = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err || "KPI 리포트 생성 중 오류가 발생했습니다.");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportData) {
      const initialCategories = Object.values(reportData).map((section) => section.category);
      setOpenCollapse(initialCategories);
    }
  }, [reportData]);

  useEffect(() => {
    const { startDate, endDate } = dateRange[0];
    fetchReport(startDate, endDate);
  }, [dateRange]);

  const handleExportCSV = async () => {
    try {
      const blobResponse = await fetch('/api/report/kpi-report/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const blob = await blobResponse.blob();
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = blobResponse.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `kpi-report-export.csv`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(true);
      console.error('[CSV 다운로드 실패]', err);
    }
  };

  const handleExportTxt = async () => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (!token) throw new Error("No token");
  
    const { startDate, endDate } = dateRange[0];
    const startStr = dayjs(startDate).format('YYYY-MM-DD');
    const endStr = dayjs(endDate).format('YYYY-MM-DD');
  
    try {
      const res = await fetch(`/api/report/kpi-report/txt?startDate=${startStr}&endDate=${endStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const text = await res.text();
  
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `kpi-report_${startStr}_to_${endStr}.txt`;
  
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(true);
      console.error("TXT 다운로드 실패", err);
    }
  };

  const handleExportMD = async () => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (!token) {
      console.error('Token missing');
      return;
    }
  
    const { startDate, endDate } = dateRange[0];
    const startStr = dayjs(startDate).format('YYYY-MM-DD');
    const endStr = dayjs(endDate).format('YYYY-MM-DD');
  
    try {
      const res = await fetch(`/api/report/kpi-report/md?startDate=${startStr}&endDate=${endStr}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      if (!res.ok) throw new Error('응답 실패');
  
      const markdown = await res.text();
  
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `kpi-report_${startStr}_to_${endStr}.md`;
  
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(true);
      console.error('Markdown 다운로드 실패:', err);
    }
  };

  const handleExportHTML = async () => {
    const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
    if (!token) return;
  
    const { startDate, endDate } = dateRange[0];
    const startStr = dayjs(startDate).format('YYYY-MM-DD');
    const endStr = dayjs(endDate).format('YYYY-MM-DD');
  
    try {
      const res = await fetch(`/api/report/kpi-report/html?startDate=${startStr}&endDate=${endStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const html = await res.text();
  
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `kpi-report_${startStr}_to_${endStr}.html`;
  
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(true);
      console.error("HTML 다운로드 실패", err);
    }
  };

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
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">KPI 요약 리포트</h2>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="csv">CSV 파일</option>
                <option value="txt">TXT 파일</option>
                <option value="md">Markdown 파일</option>
                <option value="html">HTML 파일</option>
              </select>
              <button
                onClick={() =>
                  exportFormat === 'csv' ? handleExportCSV() : 
                  exportFormat === 'txt' ? handleExportTxt() : 
                  exportFormat === 'md' ? handleExportMD() : 
                  handleExportHTML()
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex flex-col">
            {reportData &&
              Object.entries(reportData).map(([key, section]) => {
                return (
                  <Collapse
                    key={key}
                    title={section.category}
                    isOpen={openCollapse.includes(section.category)}
                    isCard={true}
                    onToggle={() =>
                      setOpenCollapse((prev) =>
                        prev.includes(section.category)
                          ? prev.filter((item) => item !== section.category)
                          : [...prev, section.category]
                      )
                    }
                  >
                    <TableSection
                      data={section.data}
                      defaultSort={
                        key === 'clicks'
                          ? { key: 'total_clicks', direction: 'desc' }
                          : key === 'events'
                          ? { key: 'total_events', direction: 'desc' }
                          : key === 'pages'
                          ? { key: 'page_views', direction: 'desc' }
                          : key === 'bounce'
                          ? { key: 'bounce_rate', direction: 'desc' }
                          : { key: 'date', direction: 'asc' }
                      }
                      columns={Object.keys(section.data?.[0] || {}).map((k) => ({
                        header: k,
                        key: k,
                      }))}
                    />
                  </Collapse>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}; 