const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

const {
  getLocalNow,
  getIsoNow,
  floorToNearest10Min,
  getOneHourAgo,
  getTodayStart,
  formatLocalDateTime,
} = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

router.get('/session-duration', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const recentMinutesQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM minutes_metrics
      WHERE date_time > toDateTime('${oneHourFloor}')
        AND date_time < toDateTime('${tenMinutesFloor}')
        AND sdk_key = '${sdk_key}'
    `;

    const recentHoursQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM hourly_metrics
      WHERE date_time >= toDateTime('${todayStart}')
        AND date_time < toDateTime('${oneHourFloor}')
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
      -- 최근 7일 필터링된 로그만
      recent_filtered AS (
        SELECT session_id, page_path, timestamp
        FROM events
        WHERE page_path IN ('${fromPage}', '${toPage}')
          AND toDate(timestamp) BETWEEN today() - 6 AND today()
          AND sdk_key = '${sdk_key}'
      ),
      recent_a AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM recent_filtered
        WHERE page_path = '${fromPage}'
        GROUP BY session_id
      ),
      recent_b AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM recent_filtered
        WHERE page_path = '${toPage}'
        GROUP BY session_id
      ),
      recent_joined AS (
        SELECT a.session_id
        FROM recent_a a
        INNER JOIN recent_b b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),
      -- 이전 7일
      prev_filtered AS (
        SELECT session_id, page_path, timestamp
        FROM events
        WHERE page_path IN ('${fromPage}', '${toPage}')
          AND toDate(timestamp) BETWEEN today() - 13 AND today() - 7
          AND sdk_key = '${sdk_key}'
      ),
      prev_a AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM prev_filtered
        WHERE page_path = '${fromPage}'
        GROUP BY session_id
      ),
      prev_b AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM prev_filtered
        WHERE page_path = '${toPage}'
        GROUP BY session_id
      ),
      prev_joined AS (
        SELECT a.session_id
        FROM prev_a a
        INNER JOIN prev_b b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),
      -- 집계
      recent_data AS (
        SELECT 
          (SELECT count() FROM recent_joined) AS converted,
          (SELECT count() FROM recent_a) AS total
      ),
      prev_data AS (
        SELECT 
          (SELECT count() FROM prev_joined) AS converted,
          (SELECT count() FROM prev_a) AS total
      )
    SELECT 
      r.converted AS converted,
      r.total AS total,
      round(r.converted / nullIf(r.total, 0) * 100, 1) AS conversion_rate,
      p.converted AS past_converted,
      p.total AS past_total,
      round(p.converted / nullIf(p.total, 0) * 100, 1) AS past_rate
    FROM recent_data r, prev_data p
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
