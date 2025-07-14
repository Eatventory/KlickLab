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

  function buildConversionSubQuery(alias, startOffset, endOffset) {
    return `
      ${alias}_filtered AS (
        SELECT session_id, page_path, timestamp
        FROM events
        WHERE page_path IN ('${fromPage}', '${toPage}')
          AND toDate(timestamp) BETWEEN today() - ${startOffset} AND today() - ${endOffset}
          AND sdk_key = '${sdk_key}'
      ),
      ${alias}_a AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM ${alias}_filtered
        WHERE page_path = '${fromPage}'
        GROUP BY session_id
      ),
      ${alias}_b AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM ${alias}_filtered
        WHERE page_path = '${toPage}'
        GROUP BY session_id
      ),
      ${alias}_joined AS (
        SELECT a.session_id
        FROM ${alias}_a a
        INNER JOIN ${alias}_b b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),
      ${alias}_data AS (
        SELECT 
          (SELECT count() FROM ${alias}_joined) AS converted,
          (SELECT count() FROM ${alias}_a) AS total
      )
    `;
  }

  const query = `
    WITH
      ${buildConversionSubQuery('recent', 6, 0)},
      ${buildConversionSubQuery('prev', 13, 7)}
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
    const rows = await resultSet.json();
    const data = rows[0] || {};

    const converted = data.converted || 0;
    const total = data.total || 0;
    const conversionRate = total === 0 ? 0 : (data.conversion_rate || 0);
    const pastRate = data.past_rate || 0;

    const delta = isFinite(conversionRate - pastRate)
      ? +(conversionRate - pastRate).toFixed(1)
      : 0;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

    res.status(200).json({
      conversionRate,
      convertedSessions: converted,
      totalSessions: total,
      deltaRate: delta,
      trend,
      period,
      periodLabel
    });
  } catch (err) {
    console.error('Conversion Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get conversion rate data' });
  }
});

/* 첫 랜딩 페이지 기준 전환율 */
router.get('/conversion-by-landing', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { start_date, end_date, period = 'daily' } = req.query;
  const toPage = '/checkout/success';

  // 날짜 필터링 조건 구성
  const dateFilter = start_date && end_date
    ? `toDate(timestamp) BETWEEN toDate('${start_date}') AND toDate('${end_date}')`
    : `toDate(timestamp) >= today() - INTERVAL 6 DAY`;

  const query = `
    WITH
      session_pages AS (
        SELECT
          session_id,
          page_path,
          timestamp,
          traffic_source,
          traffic_medium
        FROM klicklab.events
        WHERE ${dateFilter}
          AND sdk_key = '${sdk_key}'
        ORDER BY timestamp
      ),
      session_first_last AS (
        SELECT
          session_id,
          any(page_path) AS landing,
          any(traffic_source) AS source,
          any(traffic_medium) AS medium,
          max(if(page_path = '${toPage}', 1, 0)) AS is_converted
        FROM session_pages
        GROUP BY session_id
      )
    SELECT
      landing,
      source,
      medium,
      count() AS totalSessions,
      sum(is_converted) AS convertedSessions,
      round(sum(is_converted) / nullIf(count(), 0) * 100, 1) AS conversionRate
    FROM session_first_last
    GROUP BY landing, source, medium
    ORDER BY conversionRate DESC, totalSessions DESC
    LIMIT 50
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await resultSet.json();

    res.status(200).json({
      success: true,
      data: data.map(row => ({
        landing: row.landing,
        source: row.source,
        medium: row.medium,
        totalSessions: row.totalSessions,
        convertedSessions: row.convertedSessions,
        conversionRate: row.conversionRate
      }))
    });
  } catch (err) {
    console.error('Landing Page Conversion API ERROR:', err);
    res.status(500).json({ success: false, error: 'Failed to get landing page conversion data' });
  }
});

/* 채널별 전환율 */
router.get('/conversion-by-channel', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { start_date, end_date, period = 'daily' } = req.query;
  const toPage = '/checkout/success';

  // 날짜 필터 구성
  const dateFilter = start_date && end_date
    ? `toDate(timestamp) BETWEEN toDate('${start_date}') AND toDate('${end_date}')`
    : `toDate(timestamp) >= today() - INTERVAL 6 DAY`;

  const query = `
    WITH
      session_info AS (
        SELECT
          session_id,
          any(traffic_source) AS source,
          any(traffic_medium) AS medium,
          any(traffic_campaign) AS campaign,
          maxIf(page_path = '${toPage}', 1, 0) AS is_converted
        FROM (
          SELECT session_id, page_path, traffic_source, traffic_medium, traffic_campaign, timestamp
          FROM klicklab.events
          WHERE ${dateFilter}
            AND sdk_key = '${sdk_key}'
          ORDER BY timestamp
        )
        GROUP BY session_id
      )

    SELECT
      source,
      medium,
      campaign,
      count() AS totalSessions,
      sum(is_converted) AS convertedSessions,
      round(sum(is_converted) / nullIf(count(), 0) * 100, 1) AS conversionRate
    FROM session_info
    GROUP BY source, medium, campaign
    ORDER BY conversionRate DESC, totalSessions DESC
    LIMIT 50
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await resultSet.json();

    res.status(200).json({
      success: true,
      data: data.map(row => ({
        channel: row.source || 'Unknown',
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        totalSessions: row.totalSessions,
        convertedSessions: row.convertedSessions,
        conversionRate: row.conversionRate,
      }))
    });
  } catch (err) {
    console.error('Source Conversion API ERROR:', err);
    res.status(500).json({ success: false, error: 'Failed to get source-based conversion data' });
  }
});

/* 인사이트 summary */
router.get('/summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const date = req.query.date || localNow;
  const period = req.query.period || 'daily';

  try {
    // 오늘 metric 쿼리 (hourly + minutes)
    const metricQuery = `
      WITH (
        SELECT avg(avg_session_seconds)
        FROM (
          SELECT avg_session_seconds
          FROM hourly_metrics
          WHERE date_time >= toDateTime('${todayStart}')
            AND date_time <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}'
            AND avg_session_seconds > 0

          UNION ALL

          SELECT avg_session_seconds
          FROM minutes_metrics
          WHERE date_time >= toDateTime('${NearestHourFloor}')
            AND date_time <= toDateTime('${tenMinutesFloor}')
            AND sdk_key = '${sdk_key}'
            AND avg_session_seconds > 0
        )
      ) AS raw_avg_session_seconds

      SELECT
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(visitors)) AS visitors,
        toUInt64(multiIf(isFinite(raw_avg_session_seconds), raw_avg_session_seconds, 0)) AS sessionDuration
      FROM (
        SELECT clicks, visitors
        FROM hourly_metrics
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT clicks, visitors
        FROM minutes_metrics
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time <= toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
      )
    `;

    // 어제 metric 쿼리
    const prevMetricQuery = `
      WITH (
        SELECT avg(avg_session_seconds)
        FROM daily_metrics
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
          AND avg_session_seconds > 0
      ) AS raw_avg_session_seconds

      SELECT
        toUInt64(clicks) AS clicks,
        toUInt64(visitors) AS visitors,
        toUInt64(multiIf(isFinite(raw_avg_session_seconds), raw_avg_session_seconds, 0)) AS sessionDuration
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

    const conversionRateQuery = `
      WITH
        filtered_events AS (
          SELECT session_id, page_path, timestamp
          FROM events
          WHERE page_path IN ('/cart', '/checkout/success')
            AND timestamp >= toDateTime('${todayStart}')
            AND timestamp <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}'
        ),
        a_sessions AS (
          SELECT session_id, min(timestamp) AS a_time
          FROM filtered_events
          WHERE page_path = '/cart'
          GROUP BY session_id
        ),
        b_sessions AS (
          SELECT session_id, min(timestamp) AS b_time
          FROM filtered_events
          WHERE page_path = '/checkout/success'
          GROUP BY session_id
        ),
        joined_sessions AS (
          SELECT a.session_id
          FROM a_sessions a
          INNER JOIN b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
        )
      SELECT
        (SELECT count() FROM joined_sessions) AS converted,
        (SELECT count() FROM a_sessions) AS total,
        round(100.0 * (SELECT count() FROM joined_sessions) / nullIf((SELECT count() FROM a_sessions), 0), 1) AS conversion_rate
    `;

    const prevConversionRateQuery = `
      WITH
        filtered_events AS (
          SELECT session_id, page_path, timestamp
          FROM events
          WHERE page_path IN ('/cart', '/checkout/success')
            AND toDate(timestamp) = toDate('${localNow}') - 1
            AND sdk_key = '${sdk_key}'
        ),
        a_sessions AS (
          SELECT session_id, min(timestamp) AS a_time
          FROM filtered_events
          WHERE page_path = '/cart'
          GROUP BY session_id
        ),
        b_sessions AS (
          SELECT session_id, min(timestamp) AS b_time
          FROM filtered_events
          WHERE page_path = '/checkout/success'
          GROUP BY session_id
        ),
        joined_sessions AS (
          SELECT a.session_id
          FROM a_sessions a
          INNER JOIN b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
        )
      SELECT
        (SELECT count() FROM joined_sessions) AS converted,
        (SELECT count() FROM a_sessions) AS total,
        round(100.0 * (SELECT count() FROM joined_sessions) / nullIf((SELECT count() FROM a_sessions), 0), 1) AS conversion_rate
    `;

    const metricRes = await clickhouse.query({ query: metricQuery, format: 'JSON' });
    const prevMetricRes = await clickhouse.query({ query: prevMetricQuery, format: 'JSON' });
    const topClickRes = await clickhouse.query({ query: topClickQuery, format: 'JSON' });
    const conversionRes = await clickhouse.query({ query: conversionRateQuery, format: 'JSON' });
    const prevConversionRes = await clickhouse.query({ query: prevConversionRateQuery, format: 'JSON' });

    const metricData = await metricRes.json();
    const prevMetricData = await prevMetricRes.json();
    const topClickData = await topClickRes.json();
    const conversionData = await conversionRes.json();
    const prevConversionData = await prevConversionRes.json();


    const [current] = metricData.data || [{}];
    const [previous] = prevMetricData.data || [{}];
    const topClicks = topClickData.data || [];

    const [conversion] = conversionData.data || [{}];
    const [prevConversion] = prevConversionData.data || [{}];

    const currentConversionRate = conversion?.conversion_rate || 0;
    const prevConversionRate = prevConversion?.conversion_rate || 0;

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
