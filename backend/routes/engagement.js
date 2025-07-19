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
  getPageViewsQuery
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

/* 시간 경과에 따른 이벤트 이름별 이벤트 수 */
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

module.exports = router;
