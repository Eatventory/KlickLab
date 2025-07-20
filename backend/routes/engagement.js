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
  getEventCountsQuery,
  getPageTimesQuery,
  getBounceRateQuery,
  getPageViewsQuery,
  getPageStatsQuery,
  getVisitStatsQuery,
  getRevisitQuery,
} = require('../utils/engagementUtils');

/* 참여도 개요 */

router.get('/overview', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const [avgSessionTimeRes, sessionsPerUserRes] = await Promise.all([
      clickhouse.query({

        query: getAvgSessionQuery(startDate, endDate, sdk_key),

        format: 'JSON',
      }).then(r => r.json()),

      clickhouse.query({

        query: getSessionsPerUserQuery(startDate, endDate, sdk_key),

        format: 'JSON',
      }).then(r => r.json()),
    ]);

    res.status(200).json({
      success: true,
      data: {
        avgSessionSeconds: avgSessionTimeRes.data.map(d => ({
          date: d.date,
          avgSessionSeconds: Number(d.avgSessionSeconds || 0),
        })),
        sessionsPerUser: sessionsPerUserRes.data.map(d => ({
          date: d.date,
          totalVisitors: Number(d.totalVisitors || 0),
          totalClicks: Number(d.totalClicks || 0),
          sessionsPerUser: Number(d.sessionsPerUser || 0),
        })),
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Query failed' });
  }
});

/* 페이지 체류시간 */
router.get('/page-times', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });


  const query = getPageTimesQuery(startDate, endDate, sdk_key, limit);


  try {
    const dataRes = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await dataRes.json();
    res.status(200).json(data);
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

/* 페이지 조회수 */
router.get('/page-views', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });


  const query = getPageViewsQuery(startDate, endDate, sdk_key, limit);


  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    let data = await dataRes.json();
    data = data.map(item => ({
      ...item,
      totalViews: Number(item.totalViews),
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error("Page Views API ERROR:", err);
    res.status(500).json({ error: "Failed to get page views data" });
  }
});

/* 전체 조회수 */
router.get('/view-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const dataRes = await clickhouse.query({
      query: getViewCountsQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(d => ({
      date: d.date,
      totalViews: Number(d.totalViews || 0),
    })));
  } catch (err) {
    console.error("View Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get view counts data" });
  }
});

/* 전체 클릭수 */
router.get('/click-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const dataRes = await clickhouse.query({
      query: getClickCountsQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(d => ({
      date: d.date,
      totalClicks: Number(d.totalClicks || 0),
    })));
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
      datetime: item.datetime,
      totalVisitors: Number(item.total_visitors),
      existingVisitors: Number(item.existing_visitors),
      newVisitors: Number(item.new_visitors),
    })));
  } catch (err) {
    console.error("Users Over Time API ERROR:", err);
    res.status(500).json({ error: "Failed to get users over time data" });
  }
});

/* 시간 경과에 따른 이벤트 수 */
router.get('/event-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const dataRes = await clickhouse.query({
      query: getEventCountsQuery(startDate, endDate, sdk_key),
      format: 'JSONEachRow'
    });
    const data = await dataRes.json();
    res.status(200).json(data.map(item => ({
      date: item.date,
      eventName: item.event_name,
      eventCount: Number(item.event_count),
      userCount: Number(item.user_count),
      avgEventPerUser: Number(item.avg_event_per_user),
    })));
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
