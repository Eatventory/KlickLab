const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

router.get('/session-duration', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const recentMinutesQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM minutes_metrics
      WHERE date_time >= toDateTime('${NearestHourFloor}')
        AND date_time < toDateTime('${tenMinutesFloor}')
        AND sdk_key = '${sdk_key}'
    `;

    const recentHoursQuery = `
      SELECT avg(avg_session_seconds) AS avg_s
      FROM hourly_metrics
      WHERE date_time >= toDateTime('${todayStart}')
        AND date_time <= toDateTime('${oneHourFloor}')
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

/* 첫 랜딩 페이지 기준 전환율 */
router.get('/conversion-by-landing', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const toPage = req.query.to || '/checkout/success';
  const days = parseInt(req.query.days) || 7;

  const query = `
    WITH
      -- 세션별 첫 방문 페이지 및 전환 여부
      session_summary AS (
        SELECT
          session_id,
          any(page_path) AS first_page,
          max(if(page_path = '${toPage}', 1, 0)) AS is_converted
        FROM (
          SELECT session_id, page_path, timestamp
          FROM events
          WHERE toDate(timestamp) BETWEEN today() - ${days - 1} AND today()
            AND sdk_key = '${sdk_key}'
          ORDER BY timestamp
        )
        GROUP BY session_id
      )

    -- 랜딩 페이지별 전환율 집계
    SELECT
      first_page,
      count() AS total_sessions,
      sum(is_converted) AS converted_sessions,
      round(sum(is_converted) / nullIf(count(), 0) * 100, 1) AS conversion_rate
    FROM session_summary
    GROUP BY first_page
    ORDER BY conversion_rate DESC, total_sessions DESC
    LIMIT 10
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await resultSet.json();

    const response = {
      summary: data.map(row => ({
        firstPage: row.first_page,
        totalSessions: row.total_sessions,
        convertedSessions: row.converted_sessions,
        conversionRate: row.conversion_rate,
      })),
      period: `최근 ${days}일`,
      conversionTarget: toPage
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Landing Page Conversion API ERROR:', err);
    res.status(500).json({ error: 'Failed to get landing page conversion data' });
  }
});
/* 응답 예시 :
{
  "summary": [
    { "firstPage": "/product/airpods", "totalSessions": 102, "convertedSessions": 36, "conversionRate": 35.3 },
    { "firstPage": "/main", "totalSessions": 224, "convertedSessions": 59, "conversionRate": 26.3 },
    ...
  ],
  "period": "최근 7일",
  "conversionTarget": "/checkout/success"
}
*/

/* UTM 및 referrer 기준 전환율 */
router.get('/conversion-by-source', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const toPage = req.query.to || '/checkout/success';
  const days = parseInt(req.query.days) || 7;

  const query = `
    WITH
      -- 각 세션의 최초 이벤트 정보 (유입 경로)
      session_entry AS (
        SELECT
          session_id,
          any(utm_params) AS utm,
          any(referrer) AS referrer,
          maxIf(page_path = '${toPage}', 1, 0) AS is_converted
        FROM (
          SELECT session_id, utm_params, referrer, page_path, timestamp
          FROM events
          WHERE toDate(timestamp) BETWEEN today() - ${days - 1} AND today()
            AND sdk_key = '${sdk_key}'
          ORDER BY timestamp
        )
        GROUP BY session_id
      )

    SELECT
      referrer,
      utm,
      count() AS total_sessions,
      sum(is_converted) AS converted_sessions,
      round(sum(is_converted) / nullIf(count(), 0) * 100, 1) AS conversion_rate
    FROM session_entry
    GROUP BY referrer, utm
    ORDER BY conversion_rate DESC, total_sessions DESC
    LIMIT 20
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await resultSet.json();

    const response = {
      summary: data.map(row => ({
        utm: row.utm,
        referrer: row.referrer,
        totalSessions: row.total_sessions,
        convertedSessions: row.converted_sessions,
        conversionRate: row.conversion_rate,
      })),
      period: `최근 ${days}일`,
      conversionTarget: toPage
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Source Conversion API ERROR:', err);
    res.status(500).json({ error: 'Failed to get source-based conversion data' });
  }
});
/* 응답 예시 :
[
  {
    "utm": "utm_source=google&utm_campaign=summer",
    "referrer": "https://google.com",
    "totalSessions": 83,
    "convertedSessions": 30,
    "conversionRate": 36.1
  },
  {
    "utm": "utm_source=instagram&utm_campaign=launch",
    "referrer": "https://instagram.com",
    "totalSessions": 52,
    "convertedSessions": 9,
    "conversionRate": 17.3
  }
]
*/

/* 인사이트 summary */
router.get('/summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const date = req.query.date || localNow;
  const period = req.query.period || 'daily';

  try {
    // 오늘 metric 쿼리 (hourly + minutes)
    const metricQuery = `
      SELECT
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(visitors)) AS visitors,
        toUInt64(avg(avg_session_seconds)) AS sessionDuration
      FROM (
        SELECT clicks, visitors, avg_session_seconds
        FROM hourly_metrics
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT clicks, visitors, avg_session_seconds
        FROM minutes_metrics
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time <= toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
      )
    `;

    // 어제 metric 쿼리
    const prevMetricQuery = `
      SELECT
        toUInt64(clicks) AS clicks,
        toUInt64(visitors) AS visitors,
        toUInt64(avg_session_seconds) AS sessionDuration
      FROM daily_metrics
      WHERE date = toDate('${localNow}') - 1
        AND sdk_key = '${sdk_key}'
    `;

    // top 클릭 요소 (오늘 기준)
    const topClickQuery = `
      SELECT element AS label, sum(total_clicks) AS count
      FROM (
        SELECT element, total_clicks
        FROM hourly_top_elements
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'user_age' -- 중복 집계 방지
          AND element != ''

        UNION ALL

        SELECT element, total_clicks
        FROM minutes_top_elements
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time <= toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'user_age' -- 중복 집계 방지
          AND element != ''
      )
      GROUP BY element
      ORDER BY count DESC
      LIMIT 3
    `;

    const metricRes = await clickhouse.query({ query: metricQuery, format: 'JSON' });
    const prevMetricRes = await clickhouse.query({ query: prevMetricQuery, format: 'JSON' });
    const topClickRes = await clickhouse.query({ query: topClickQuery, format: 'JSON' });

    const metricData = await metricRes.json();
    const prevMetricData = await prevMetricRes.json();
    const topClickData = await topClickRes.json();

    const [current] = metricData.data || [{}];
    const [previous] = prevMetricData.data || [{}];
    const topClicks = topClickData.data || [];

    // TODO: 실제 계산 로직으로 교체
    const currentConversionRate = 8.2;
    const prevConversionRate = 10.3;

    const totalClicks = Number(current?.clicks || 0);

    const response = {
      success: true,
      data: {
        metrics: [
          {
            name: '방문자 수',
            value: Number(current?.visitors || 0),
            prevValue: Number(previous?.visitors || 0),
            unit: '명',
            label: 'visitors'
          },
          {
            name: '전환율',
            value: currentConversionRate,
            prevValue: prevConversionRate,
            unit: '%',
            label: 'conversionRate'
          },
          {
            name: '클릭 수',
            value: Number(current?.clicks || 0),
            prevValue: Number(previous?.clicks || 0),
            unit: '회',
            label: 'clicks'
          },
          {
            name: '세션 시간',
            value: Number(current?.sessionDuration || 0),
            prevValue: Number(previous?.sessionDuration || 0),
            unit: '초',
            label: 'sessionDuration'
          }
        ],
        topClicks,
        totalClicks
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in /summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
