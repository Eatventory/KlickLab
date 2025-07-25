import React from 'react';
import HorizontalBarChart from '../../components/HorizontalBarChart';

interface LandingPageData {
  page: string;
  sessions: number;
  users: number;
  engagement_rate: number;
  conversion_rate: number;
  bounce_rate: number;
}

interface TopLandingPagesProps {
  data: LandingPageData[];
  refreshKey?: number;
}

const TopLandingPages: React.FC<TopLandingPagesProps> = ({ data, refreshKey }) => {
  // 페이지 URL을 짧게 표시하는 함수
  const formatPageLabel = (page: string) => {
    if (page === '/') return '홈페이지';
    return page;
  };

  return (
    <HorizontalBarChart
      data={data.slice(0, 5).map((d: any, index: number) => ({
        label: formatPageLabel(d.page),
        value: d.sessions,
        key: `${d.page}-${index}`
      }))}
      valueFormatter={(v) => v.toLocaleString() + '명'}
    />
  );
};

export { TopLandingPages }; 