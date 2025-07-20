import { useEffect, useState } from 'react';
import { fetchRealtimeSummary, fetchRealtimeTrend, fetchRealtimeSources } from '../utils/overviewApi';

export function useRealtimeOverview() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true);
      try {
        const [summary, trend, sources] = await Promise.all([
          fetchRealtimeSummary(),
          fetchRealtimeTrend(),
          fetchRealtimeSources(),
        ]);
        if (mounted) {
          setSummary(summary);
          setTrend(trend);
          setSources(sources);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setSummary(null);
          setTrend([]);
          setSources([]);
          setLoading(false);
        }
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 60000); // 1분마다 갱신
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { loading, summary, trend, sources };
} 