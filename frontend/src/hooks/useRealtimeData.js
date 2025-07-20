import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../utils/api';

export const useRealtimeData = (sdkKey) => {
  const [data, setData] = useState({
    activeUsers: null,
    trend: null,
    sources: null
  });
  
  const [loading, setLoading] = useState({
    activeUsers: false,
    trend: false,
    sources: false
  });
  
  const [error, setError] = useState({
    activeUsers: null,
    trend: null,
    sources: null
  });

  const [lastUpdated, setLastUpdated] = useState(null);

  // 실시간 활성 사용자 데이터 로딩
  const loadRealtimeUsers = useCallback(async () => {
    if (!sdkKey) return;
    
    try {
      setLoading(prev => ({ ...prev, activeUsers: true }));
      setError(prev => ({ ...prev, activeUsers: null }));
      
      const result = await dashboardAPI.fetchRealtimeData(sdkKey);
      setData(prev => ({ ...prev, activeUsers: result.data }));
      setLastUpdated(new Date());
    } catch (err) {
      setError(prev => ({ ...prev, activeUsers: err.message }));
      console.error('실시간 사용자 데이터 로딩 실패:', err);
    } finally {
      setLoading(prev => ({ ...prev, activeUsers: false }));
    }
  }, [sdkKey]);

  // 실시간 트렌드 데이터 로딩
  const loadRealtimeTrend = useCallback(async () => {
    if (!sdkKey) return;
    
    try {
      setLoading(prev => ({ ...prev, trend: true }));
      setError(prev => ({ ...prev, trend: null }));
      
      const result = await dashboardAPI.fetchRealtimeTrend(sdkKey);
      setData(prev => ({ ...prev, trend: result.data }));
    } catch (err) {
      setError(prev => ({ ...prev, trend: err.message }));
      console.error('실시간 트렌드 데이터 로딩 실패:', err);
    } finally {
      setLoading(prev => ({ ...prev, trend: false }));
    }
  }, [sdkKey]);

  // 실시간 소스 데이터 로딩 (새로운 API 엔드포인트 필요)
  const loadRealtimeSources = useCallback(async () => {
    if (!sdkKey) return;
    
    try {
      setLoading(prev => ({ ...prev, sources: true }));
      setError(prev => ({ ...prev, sources: null }));
      
      // 임시로 위젯 데이터에서 트래픽 소스 가져오기
      const result = await dashboardAPI.fetchWidgetsData(sdkKey);
      setData(prev => ({ ...prev, sources: result.trafficSources }));
    } catch (err) {
      setError(prev => ({ ...prev, sources: err.message }));
      console.error('실시간 소스 데이터 로딩 실패:', err);
    } finally {
      setLoading(prev => ({ ...prev, sources: false }));
    }
  }, [sdkKey]);

  // 모든 데이터 로딩
  const loadAllData = useCallback(() => {
    loadRealtimeUsers();
    loadRealtimeTrend();
    loadRealtimeSources();
  }, [loadRealtimeUsers, loadRealtimeTrend, loadRealtimeSources]);

  // 초기 로딩
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 30초마다 자동 갱신
  useEffect(() => {
    if (!sdkKey) return;

    const interval = setInterval(() => {
      loadAllData();
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [sdkKey, loadAllData]);

  return { 
    data, 
    loading, 
    error, 
    lastUpdated,
    refresh: loadAllData 
  };
};
