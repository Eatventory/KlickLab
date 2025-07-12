const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/session-duration', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const recentMinutesQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM minutes_metrics
      WHERE date_time >= now() - INTERVAL 50 MINUTE
        AND date_time < now() - INTERVAL 10 MINUTE
        AND sdk_key = '${sdk_key}'
    `;

    const recentHoursQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM hourly_metrics
      WHERE date_time >= now() - INTERVAL 23 HOUR
        AND date_time < now() - INTERVAL 1 HOUR
        AND sdk_key = '${sdk_key}'
    `;

    const prevDayQuery = `
      SELECT avg_session_seconds AS avg_s
      FROM daily_metrics
      WHERE date = yesterday()
        AND sdk_key = '${sdk_key}'
    `;

    const [minutesRes, hoursRes, prevRes] = await Promise.all([
      clickhouse.query({ query: recentMinutesQuery, format: 'JSONEachRow' }).then(r => r.json()),
      clickhouse.query({ query: recentHoursQuery, format: 'JSONEachRow' }).then(r => r.json()),
      clickhouse.query({ query: prevDayQuery, format: 'JSONEachRow' }).then(r => r.json()),
    ]);

    const recentAvgSec = (
      +(minutesRes[0]?.avg_s || 0) +
      +(hoursRes[0]?.avg_s || 0)
    ) / 2;

    const prevAvgSec = +(prevRes[0]?.avg_s || 0);
    const deltaSec = recentAvgSec - prevAvgSec;

    const data = {
      averageDuration: recentAvgSec ? Math.round(recentAvgSec) : 0,
      deltaDuration: Math.round(deltaSec),
      trend: deltaSec > 0 ? 'up' : deltaSec < 0 ? 'down' : 'flat',
      period: '최근 약 24시간',
      periodLabel: '10분~23시간 전 기준'
    };

    res.status(200).json(data);
  } catch (err) {
    console.error('Session Duration API ERROR:', err);
    res.status(500).json({ error: 'Failed to get session duration data' });
  }
});

router.get('/conversion-summary', authMiddleware, async (req, res) => {
  const fromPage = req.query.from || '/cart';
  const toPage = req.query.to || '/checkout/success';
  const period = '7d';
  const periodLabel = '최근 7일';
  const { sdk_key } = req.user;

  const query = `
    WITH
      -- 최근 7일 전환
      recent AS (
        SELECT
          sum(page_views) AS total_views,
          sum(arrayElement(next_pages.count, indexOf(next_pages.to, '${toPage}'))) AS to_views
        FROM daily_page_stats
        WHERE page_path = '${fromPage}'
          AND date >= today() - 6
          AND sdk_key = '${sdk_key}'
      ),

      -- 이전 7일 전환
      prev AS (
        SELECT
          sum(page_views) AS total_views,
          sum(arrayElement(next_pages.count, indexOf(next_pages.to, '${toPage}'))) AS to_views
        FROM daily_page_stats
        WHERE page_path = '${fromPage}'
          AND date BETWEEN today() - 13 AND today() - 7
          AND sdk_key = '${sdk_key}'
      )

    SELECT
      r.to_views AS converted,
      r.total_views AS total,
      round(r.to_views / nullIf(r.total_views, 0) * 100, 1) AS conversion_rate,
      p.to_views AS past_converted,
      p.total_views AS past_total,
      round(p.to_views / nullIf(p.total_views, 0) * 100, 1) AS past_rate
    FROM recent r, prev p
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const [data] = await resultSet.json();

    const { converted, total, conversion_rate, past_rate } = data;

    const delta = isFinite(conversion_rate - past_rate) ? +(conversion_rate - past_rate).toFixed(1) : 0;
    const trend =
      delta > 0 ? 'up' :
      delta < 0 ? 'down' : 'flat';

    const response = {
      conversionRate: total === 0 ? 0 : (conversion_rate ? conversion_rate : 0),
      convertedSessions: converted ?? 0,
      totalSessions: total ?? 0,
      deltaRate: delta,
      trend,
      period,
      periodLabel,
    };
    res.status(200).json(response);
  } catch (err) {
    console.error('Conversion Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get conversion rate data' });
  }
});

module.exports = router;
