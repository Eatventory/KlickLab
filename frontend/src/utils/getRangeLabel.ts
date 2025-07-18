import dayjs from 'dayjs';

export const getRangeLabel = (startDate: Date, endDate: Date): string => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const today = dayjs();

  const diffDays = end.diff(start, 'day');

  const isToday = start.isSame(today, 'day') && end.isSame(today, 'day');
  const isYesterday = start.isSame(today.subtract(1, 'day'), 'day') && end.isSame(start, 'day');

  const startOfThisWeek = today.startOf('week');
  const endOfThisWeek = today.endOf('week');

  const startOfLastWeek = today.subtract(1, 'week').startOf('week');
  const endOfLastWeek = today.subtract(1, 'week').endOf('week');

  const startOfThisMonth = today.startOf('month');
  const endOfThisMonth = today.endOf('month');

  const startOfLastMonth = today.subtract(1, 'month').startOf('month');
  const endOfLastMonth = today.subtract(1, 'month').endOf('month');

  if (isToday) return '오늘';
  if (isYesterday) return '어제';
  if (start.isSame(startOfThisWeek, 'day') && end.isSame(endOfThisWeek, 'day')) return '이번 주';
  if (start.isSame(startOfLastWeek, 'day') && end.isSame(endOfLastWeek, 'day')) return '지난 주';
  if (start.isSame(startOfThisMonth, 'day') && end.isSame(endOfThisMonth, 'day')) return '이번 달';
  if (start.isSame(startOfLastMonth, 'day') && end.isSame(endOfLastMonth, 'day')) return '지난 달';
  if (diffDays >= 1) return `지난 ${diffDays + 1}일간`;

  return `${start.format('YYYY.MM.DD')} ~ ${end.format('YYYY.MM.DD')}`;
};
