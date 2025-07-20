import { useEffect, useState } from 'react';
import { fetchOverviewWidgets } from '../utils/overviewApi';

export function useOverviewWidgets() {
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const data = await fetchOverviewWidgets();
        if (mounted) setWidgets(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    // 필요시 setInterval로 자동 갱신 가능
    return () => { mounted = false; };
  }, []);

  return { loading, widgets };
} 