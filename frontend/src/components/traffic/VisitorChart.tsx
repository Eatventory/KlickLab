import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 타입 정의를 직접 포함
interface VisitorData {
  date: string;
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
}

interface VisitorChartProps {
  data: VisitorData[];
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// y축 숫자 단위 한글 변환 함수
function formatKoreanNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  value = Math.round(value); // 정수로 변환
  if (value >= 100000000) return `${Math.round(value / 10000000) / 10}억`;
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만`;
  return value.toLocaleString();
}

export const VisitorChart: React.FC<VisitorChartProps> = ({ data, period = 'daily' }) => {
  // 집계 단위별 라벨 포맷 함수
  const formatDate = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    if (period === 'hourly') {
      // YYYY-MM-DD HH -> MM월 DD일 HH시 (KST 변환 불필요)
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2})/);
      if (match) {
        const [, year, month, day, hour] = match;
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hour));
        return `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${dateObj.getHours()}시`;
      }
      return '-';
    } else if (period === 'weekly' || period === 'monthly') {
      // DB에서 받은 key를 그대로 사용
      return dateString;
    } else {
      // YYYY-MM-DD -> 6월 10일
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      }
      return dateString;
    }
  };

  // 안내문구를 period에 따라 동적으로 생성
  const getPeriodDescription = () => {
    switch (period) {
      case 'hourly':
        return '최근 24시간의 방문자 변화';
      case 'weekly':
        return '최근 6주간의 방문자 변화';
      case 'monthly':
        return '최근 12개월간의 방문자 변화';
      default:
        return '최근 7일간의 방문자 변화';
    }
  };

  // x축 범례 텍스트를 period에 따라 동적으로 생성
  const getXAxisLabel = () => {
    switch (period) {
      case 'hourly':
        return '시간';
      case 'weekly':
        return '주차';
      case 'monthly':
        return '월';
      default:
        return '날짜';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatKoreanNumber(entry.value)}명
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // date가 있는 데이터만 필터링 후 정렬
  let displayData = data.filter(d => d.date != null && d.date !== '');
  displayData = displayData.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  
  // 데이터 검증 및 보정: 총 방문자 수가 신규+재방문자와 일치하도록
  displayData = displayData.map(item => {
    let newVisitors = Number(item.newVisitors) || 0;
    let returningVisitors = Number(item.returningVisitors) || 0;
    let visitors = Number(item.visitors) || 0;
    // 음수, NaN, Infinity 방지
    newVisitors = newVisitors >= 0 && isFinite(newVisitors) ? newVisitors : 0;
    returningVisitors = returningVisitors >= 0 && isFinite(returningVisitors) ? returningVisitors : 0;
    visitors = visitors >= 0 && isFinite(visitors) ? visitors : 0;
    const calculatedTotal = newVisitors + returningVisitors;
    if (visitors !== calculatedTotal) {
      visitors = calculatedTotal;
    }
    return { ...item, visitors, newVisitors, returningVisitors };
  });
  // 시간별: 현재 시간 기준으로 최근 24시간 추출
  if (period === 'hourly') {
    const now = new Date();
    const hours: string[] = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(now.getHours() - i);
      const year = time.getFullYear();
      const month = String(time.getMonth() + 1).padStart(2, '0');
      const day = String(time.getDate()).padStart(2, '0');
      const hour = String(time.getHours()).padStart(2, '0');
      hours.push(`${year}-${month}-${day} ${hour}`);
    }
    displayData = hours.map(dateStr => {
      const found = data.find(d => d.date === dateStr);
      return found || { date: dateStr, visitors: 0, newVisitors: 0, returningVisitors: 0 };
    });
  } else if (period === 'daily') {
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push(dateStr);
    }
    displayData = days.map(dateStr => {
      const found = data.find(d => d.date === dateStr);
      return found || { date: dateStr, visitors: 0, newVisitors: 0, returningVisitors: 0 };
    });
  } else { // 주별/월별은 DB에서 받은 순서대로 그대로 사용 (보정/매칭 X)
    displayData = data;
  }

  return (
    <div className="card p-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">방문자 추이</h3>
        <p className="text-sm text-gray-600">최근 7일간의 방문자 변화</p>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 5, right: 0, left: 0, bottom: 10 }} className='p-1'>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatKoreanNumber}
              allowDecimals={false}
              domain={[0, 'dataMax']}
              // tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="visitors" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="총 방문자"
            />
            <Line 
              type="monotone" 
              dataKey="newVisitors" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              name="신규 방문자"
            />
            <Line 
              type="monotone" 
              dataKey="returningVisitors" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              name="재방문자"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 