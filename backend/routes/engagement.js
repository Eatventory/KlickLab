const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

const {
  getAvgSessionQuery,
  getSessionsPerUserQuery,
  getClickCountsQuery,
  getViewCountsQuery,
  getUsersOverTimeQuery,
  getPageTimesQuery,
  getBounceRateQuery,
  getPageViewsQuery,
  getPageStatsQuery,
  getVisitStatsQuery,
  getRevisitQuery,
  // 새로운 이탈률 함수들 추가
  getTodayPageExitRate,
  getPastPageExitRate,
  mergePageExitData,
  // 새로운 세션 참여도 함수들 추가
  getTodaySessionEngagement,
  getPastSessionEngagement,
  mergeSessionEngagementData,
  // 새로운 페이지 평균 체류 시간 함수들 추가
  getTodayPageTimes,
  getPastPageTimes,
  mergePageTimesData,
  // 새로운 페이지 별 조회수 함수들 추가
  getTodayPageViews,
  getPastPageViews,
  mergePageViewsData,
  // 새로운 전체 조회수/클릭수 함수들 추가
  getTodayViewCounts,
  getPastViewCounts,
  mergeViewCountsData,
  getTodayClickCounts,
  getPastClickCounts,
  mergeClickCountsData,
  // 새로운 이벤트 카운트 함수들 추가
  getTodayEventCounts,
  getPastEventCounts,
  mergeEventCountsData,
} = require('../utils/engagementUtils');

/* 참여도 개요 */
router.get('/overview', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      // 오늘만: agg 테이블 사용
      const todayResult = await getTodaySessionEngagement(clickhouse, sdk_key, startDate, endDate);
      result = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 오늘 포함: 과거 + 오늘 합치기
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        const pastResult = await getPastSessionEngagement(clickhouse, sdk_key, startDate, yesterdayStr);
        pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      }
      
      const todayResult = await getTodaySessionEngagement(clickhouse, sdk_key, today, today);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      
      result = mergeSessionEngagementData(pastData, todayData);
    } else {
      // 과거만: flat 테이블 사용
      const pastResult = await getPastSessionEngagement(clickhouse, sdk_key, startDate, endDate);
      result = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    res.status(200).json({
      success: true,
      data: {
        avgSessionSeconds: result.map(d => ({
          date: d.date,
          avgSessionSeconds: Number(d.avg_session_seconds || 0),
        })),
        sessionsPerUser: result.map(d => ({
          date: d.date,
          totalVisitors: Number(d.total_users || 0),
          totalClicks: Number(d.total_sessions || 0), // 세션 수를 클릭 수로 매핑
          sessionsPerUser: Number(d.sessions_per_user || 0),
        })),
      },
    });

  } catch (err) {
    console.error("Session Engagement Overview API ERROR:", err);
    res.status(500).json({ success: false, error: 'Query failed' });
  }
});

/* 페이지 체류시간 (새로운 스키마 사용) */
router.get('/page-times', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let finalData = [];
    
    if (isOnlyToday) {
      // 오늘만 조회하는 경우 - agg 테이블만 사용
      const todayResult = await getTodayPageTimes(clickhouse, sdk_key, startDate, endDate, limit);
      finalData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 과거 + 오늘 혼합 기간 - 두 테이블 데이터 합치기
      const pastEndDate = new Date(today);
      pastEndDate.setDate(pastEndDate.getDate() - 1);
      const pastEndDateStr = pastEndDate.toISOString().slice(0, 10);
      
      const [pastResult, todayResult] = await Promise.all([
        getPastPageTimes(clickhouse, sdk_key, startDate, pastEndDateStr, limit * 2),
        getTodayPageTimes(clickhouse, sdk_key, today, endDate, limit * 2)
      ]);
      
      const pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      finalData = mergePageTimesData(pastData, todayData, limit);
    } else {
      // 과거 기간만 - flat 테이블만 사용
      const pastResult = await getPastPageTimes(clickhouse, sdk_key, startDate, endDate, limit);
      finalData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    // 기존 프론트엔드 형식에 맞게 변환
    const formattedData = finalData.map(row => ({
      page: row.page_path,
      averageTime: parseFloat(row.average_time) || 0
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    console.error("Page Times API ERROR:", err);
    res.status(500).json({ error: "Failed to get page time data" });
  }
});

/* 이탈률 */
router.get('/bounce-rate', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });


  const query = getBounceRateQuery(startDate, endDate, sdk_key, limit);

  try {

    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Bounce Top API ERROR:", err);
    res.status(500).json({ error: "Failed to get bounce top data" });
  }
});

/* 페이지 이탈률 (새로운 스키마 사용) */
router.get('/exit-rate', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 5 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      // 오늘만: agg 테이블 사용
      const todayResult = await getTodayPageExitRate(clickhouse, sdk_key, startDate, endDate);
      result = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 오늘 포함: 과거 + 오늘 합치기
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        const pastResult = await getPastPageExitRate(clickhouse, sdk_key, startDate, yesterdayStr);
        pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      }
      
      const todayResult = await getTodayPageExitRate(clickhouse, sdk_key, today, today);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      
      result = mergePageExitData(pastData, todayData);
    } else {
      // 과거만: flat 테이블 사용
      const pastResult = await getPastPageExitRate(clickhouse, sdk_key, startDate, endDate);
      result = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }
    
    // limit 적용 및 응답 포맷팅
    const formattedResult = result
      .slice(0, parseInt(limit))
      .map(item => ({
        page_path: item.page_path,
        page_views: parseInt(item.page_views) || 0,
        exits: parseInt(item.exits) || 0,
        bounce_rate: parseFloat(item.exit_rate) || 0  // 기존 필드명 유지
      }));
    
    res.status(200).json(formattedResult);
    
  } catch (err) {
    console.error("Exit Rate API ERROR:", err);
    res.status(500).json({ error: "Failed to get exit rate data" });
  }
});

/* 페이지 조회수 (새로운 스키마 사용) */
router.get('/page-views', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let finalData = [];
    
    if (isOnlyToday) {
      // 오늘만 조회하는 경우 - agg 테이블만 사용
      const todayResult = await getTodayPageViews(clickhouse, sdk_key, startDate, endDate, limit);
      finalData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 과거 + 오늘 혼합 기간 - 두 테이블 데이터 합치기
      const pastEndDate = new Date(today);
      pastEndDate.setDate(pastEndDate.getDate() - 1);
      const pastEndDateStr = pastEndDate.toISOString().slice(0, 10);
      
      const [pastResult, todayResult] = await Promise.all([
        getPastPageViews(clickhouse, sdk_key, startDate, pastEndDateStr, limit * 2),
        getTodayPageViews(clickhouse, sdk_key, today, endDate, limit * 2)
      ]);
      
      const pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      finalData = mergePageViewsData(pastData, todayData, limit);
    } else {
      // 과거 기간만 - flat 테이블만 사용
      const pastResult = await getPastPageViews(clickhouse, sdk_key, startDate, endDate, limit);
      finalData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    // 기존 프론트엔드 형식에 맞게 변환
    const formattedData = finalData.map(row => ({
      page: row.page_path,
      totalViews: parseInt(row.total_views) || 0
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    console.error("Page Views API ERROR:", err);
    res.status(500).json({ error: "Failed to get page views data" });
  }
});

/* 전체 조회수 (새로운 스키마 사용) */
router.get('/view-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let finalData = [];
    
    if (isOnlyToday) {
      // 오늘만 조회하는 경우 - agg 테이블만 사용
      const todayResult = await getTodayViewCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 과거 + 오늘 혼합 기간 - 두 테이블 데이터 합치기
      const pastEndDate = new Date(today);
      pastEndDate.setDate(pastEndDate.getDate() - 1);
      const pastEndDateStr = pastEndDate.toISOString().slice(0, 10);
      
      const [pastResult, todayResult] = await Promise.all([
        getPastViewCounts(clickhouse, sdk_key, startDate, pastEndDateStr),
        getTodayViewCounts(clickhouse, sdk_key, today, endDate)
      ]);
      
      const pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      finalData = mergeViewCountsData(pastData, todayData);
    } else {
      // 과거 기간만 - flat 테이블만 사용
      const pastResult = await getPastViewCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    // 기존 프론트엔드 형식에 맞게 변환
    const formattedData = finalData.map(row => ({
      date: row.date,
      totalViews: parseInt(row.totalViews) || 0
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    console.error("View Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get view counts data" });
  }
});

/* 전체 클릭수 (새로운 스키마 사용) */
router.get('/click-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let finalData = [];
    
    if (isOnlyToday) {
      // 오늘만 조회하는 경우 - agg 테이블만 사용
      const todayResult = await getTodayClickCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 과거 + 오늘 혼합 기간 - 두 테이블 데이터 합치기
      const pastEndDate = new Date(today);
      pastEndDate.setDate(pastEndDate.getDate() - 1);
      const pastEndDateStr = pastEndDate.toISOString().slice(0, 10);
      
      const [pastResult, todayResult] = await Promise.all([
        getPastClickCounts(clickhouse, sdk_key, startDate, pastEndDateStr),
        getTodayClickCounts(clickhouse, sdk_key, today, endDate)
      ]);
      
      const pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      finalData = mergeClickCountsData(pastData, todayData);
    } else {
      // 과거 기간만 - flat 테이블만 사용
      const pastResult = await getPastClickCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    // 기존 프론트엔드 형식에 맞게 변환
    const formattedData = finalData.map(row => ({
      date: row.date,
      totalClicks: parseInt(row.totalClicks) || 0
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    console.error("Click Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get click counts data" });
  }
});

/* 시간 경과에 따른 사용자 활동 */
router.get('/users-over-time', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const dataRes = await clickhouse.query({
      query: getUsersOverTimeQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(item => ({
      date: item.base_date,
      dailyUsers: Number(item.daily_users),
      weeklyUsers: Number(item.weekly_users),
      monthlyUsers: Number(item.monthly_users),
    })));
  } catch (err) {
    console.error("Users Over Time API ERROR:", err);
    res.status(500).json({ error: "Failed to get users over time data" });
  }
});

/* 시간 경과에 따른 이벤트 수 (새로운 스키마 사용) */
router.get('/event-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let finalData = [];
    
    if (isOnlyToday) {
      // 오늘만 조회하는 경우 - agg 테이블만 사용
      const todayResult = await getTodayEventCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
    } else if (includesOnlyToday) {
      // 과거 + 오늘 혼합 기간 - 두 테이블 데이터 합치기
      const pastEndDate = new Date(today);
      pastEndDate.setDate(pastEndDate.getDate() - 1);
      const pastEndDateStr = pastEndDate.toISOString().slice(0, 10);
      
      const [pastResult, todayResult] = await Promise.all([
        getPastEventCounts(clickhouse, sdk_key, startDate, pastEndDateStr),
        getTodayEventCounts(clickhouse, sdk_key, today, endDate)
      ]);
      
      const pastData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
      const todayData = Array.isArray(todayResult) ? todayResult : (todayResult.data || []);
      finalData = mergeEventCountsData(pastData, todayData);
    } else {
      // 과거 기간만 - flat 테이블만 사용
      const pastResult = await getPastEventCounts(clickhouse, sdk_key, startDate, endDate);
      finalData = Array.isArray(pastResult) ? pastResult : (pastResult.data || []);
    }

    // 기존 프론트엔드 형식에 맞게 변환
    const formattedData = finalData.map(item => ({
      date: item.date,
      eventName: item.event_name,
      eventCount: Number(item.event_count),
      userCount: Number(item.user_count),
      avgEventPerUser: Number(item.avg_event_per_user),
    }));

    res.status(200).json(formattedData);
  } catch (err) {
    console.error("Event Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get event counts data" });
  }
});

router.get('/page-stats', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const dataRes = await clickhouse.query({
      query: getPageStatsQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(item => ({
      date: item.date,
      pagePath: item.page_path,
      pageViews: Number(item.page_views),
      activeUsers: Number(item.active_users),
      pageviewsPerUser: Number(item.pageviews_per_user),
      avgEngagementTimeSec: Number(item.avg_engagement_time_sec),
      totalEvents: Number(item.total_events),
    })));
  } catch (err) {
    console.error("Page Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get page stats data" });
  }
});

/* 시간 경과에 따른 방문 페이지 */
router.get('/visit-stats', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const dataRes = await clickhouse.query({
      query: getVisitStatsQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(item => ({
      date: item.date,
      pagePath: item.page_path,
      sessions: Number(item.sessions),
      activeUsers: Number(item.active_users),
      newVisitors: Number(item.new_visitors),
      avgSessionSeconds: Number(item.avg_session_seconds),
    })));
  } catch (err) {
    console.error("Visit Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get visit stats data" });
  }
});

router.get('/revisit', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const dataRes = await clickhouse.query({
      query: getRevisitQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();

    res.status(200).json(data.map(row => ({
      date: row.date,
      dau: Number(row.dau),
      wau: Number(row.wau),
      mau: Number(row.mau),
      dauWauRatio: Number(row.dau_wau_ratio),
      dauMauRatio: Number(row.dau_mau_ratio),
      wauMauRatio: Number(row.wau_mau_ratio),
    })));
  } catch (err) {
    console.error('Error fetching revisit stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
