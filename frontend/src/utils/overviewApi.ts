function getAuthHeaders() {
  const token = localStorage.getItem('klicklab_token') || sessionStorage.getItem('klicklab_token');
  if (!token) throw new Error('No token');
  return { Authorization: `Bearer ${token}` };
}

export async function fetchRealtimeSummary() {
  const res = await fetch('/api/overview/realtime', { headers: getAuthHeaders() });
  const data = await res.json();
  return data.data;
}

export async function fetchRealtimeTrend() {
  const res = await fetch('/api/overview/realtime-trend', { headers: getAuthHeaders() });
  const data = await res.json();
  return data.data;
}

export async function fetchRealtimeSources() {
  const res = await fetch('/api/overview/realtime/sources', { headers: getAuthHeaders() });
  return res.json();
}

export async function fetchOverviewWidgets() {
  const res = await fetch('/api/overview/widgets', { headers: getAuthHeaders() });
  return res.json();
} 