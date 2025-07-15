const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const authMiddleware = require('../middlewares/authMiddleware');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

const tableMap = {
  minutes: 'minutes_metrics',
  hourly: 'hourly_metrics',
  daily: 'daily_metrics',
  weekly: 'weekly_metrics'
};

router.get('/visitors', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const period = req.query.period || 'daily';
  const table = tableMap[period] || 'daily_metrics';
  try {
    // 추이 데이터
    const trendRes = await clickhouse.query({
      query: `
        SELECT
          formatDateTime(date, '%Y-%m-%d') AS date_str,
          toUInt64(visitors) AS visitors
        FROM ${table}
        WHERE date >= toDate('${localNow}') - 6
          AND date < toDate('${localNow}')
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const trendData = (await trendRes.json()).data || [];
    const trend = trendData.map(row => ({
      date: row.date_str,
      visitors: Number(row.visitors)
    }));

    // 어제자
    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT visitors
        FROM ${table}
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const yesterdayVisitors = (await yesterdayRes.json()).data[0]?.visitors ?? 0;

    // 오늘 실시간 (hourly + minutes)
    const todayVisitorsRes = await clickhouse.query({
      query: `
        WITH
          (
            SELECT sum(visitors) FROM hourly_metrics
            WHERE date_time >= toDateTime('${todayStart}')
              AND date_time <= toDateTime('${oneHourFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS hourly_visitors,
          (
            SELECT sum(visitors) FROM minutes_metrics
            WHERE date_time >= toDateTime('${NearestHourFloor}')
              AND date_time <= toDateTime('${tenMinutesFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS minutes_visitors
        SELECT hourly_visitors + minutes_visitors AS visitors;
      `,
      format: 'JSON'
    });
    const todayVisitors = +(await todayVisitorsRes.json()).data[0]?.visitors || 0;

    res.status(200).json({
      today: todayVisitors,
      yesterday: yesterdayVisitors,
      trend
    });
  } catch (err) {
    console.error('Visitors API ERROR:', err);
    res.status(500).json({ error: 'Failed to get visitors data' });
  }
});

router.get('/clicks', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const period = req.query.period || 'daily';
  const table = tableMap[period] || 'daily_metrics';
  try {
    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT clicks
        FROM ${table}
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const yesterdayClicks = (await yesterdayRes.json()).data[0]?.clicks ?? 0;

    // 10분 전 데이터부터 top clicks에 반영됨
    const clickRes = await clickhouse.query({
      query: `
        WITH
          (SELECT sum(clicks) FROM hourly_metrics
          WHERE date_time >= toDateTime('${todayStart}')
            AND date_time <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}') AS hourly_clicks,
          (SELECT sum(clicks) FROM minutes_metrics
          WHERE date_time >= toDateTime('${NearestHourFloor}')
            AND date_time <= toDateTime('${tenMinutesFloor}')
            AND sdk_key = '${sdk_key}') AS minutes_clicks
        SELECT hourly_clicks + minutes_clicks AS clicks
      `,
      format: 'JSON'
    });
    const todayClicks = +(await clickRes.json()).data[0]?.clicks || 0;

    res.status(200).json({
      today: todayClicks,
      yesterday: yesterdayClicks
    });
  } catch (err) {
    console.error('Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get clicks data' });
  }
});

router.get('/top-clicks', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = `
      SELECT 
        element, 
        sum(total_clicks) AS cnt
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
          AND date_time < toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'user_age' -- 중복 집계 방지
          AND element != ''
      )
      GROUP BY element
      ORDER BY cnt DESC
      LIMIT 5
    `;

    const clickRes = await clickhouse.query({ query, format: 'JSONEachRow' });
    const topClicks = (await clickRes.json()).map(row => ({
      label: row.element,
      count: Number(row.cnt)
    }));

    res.status(200).json({ items: topClicks });
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

router.get('/click-trend', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const baseTime = `'${req.query.baseTime}'`;
    const period = parseInt(req.query.period) || 60; // 조회 범위 (분)
    const step = parseInt(req.query.step) || 5;      // 집계 단위 (분)

    const clickTrendRes = await clickhouse.query({
      query: `
        WITH 
          parseDateTimeBestEffortOrNull(${baseTime}) AS base,
          toRelativeMinuteNum(base) AS base_min,
          ${step} AS step_minute,
          ${period} AS period_minute
        SELECT 
          formatDateTime(
            toDateTime(base_min * 60) 
              + toIntervalMinute(
                  intDiv(toRelativeMinuteNum(timestamp) - base_min, step_minute) * step_minute
                ),
            '%H:%i'
          ) AS time,
          count() AS count
        FROM events
        WHERE 
          event_name = 'auto_click'
          AND timestamp >= base - toIntervalMinute(period_minute)
          AND sdk_key = '${sdk_key}'
        GROUP BY time
        ORDER BY time
      `,
      format: 'JSONEachRow'
    });
    const rawTrend = await clickTrendRes.json();
    const clickTrend = rawTrend.map(row => ({
      time: row.time,
      count: Number(row.count)
    }));

    res.status(200).json({ data: clickTrend });
  } catch (err) {
    console.error('Click Trend API ERROR:', err);
    res.status(500).json({ error: 'Failed to get click trend data' });
  }
});

router.get('/dropoff-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = `
      WITH t AS (
        SELECT
          page_path,
          sum(page_exits) AS exit_count,
          sum(page_views) AS total_count
        FROM klicklab.hourly_page_stats
        WHERE date_time >= toDateTime('${todayStart}')
          AND page_path != ''
          AND sdk_key = '${sdk_key}'
        GROUP BY page_path
      )
      SELECT 
        page_path AS page,
        round(exit_count / total_count * 100, 1) AS dropRate
      FROM t
      ORDER BY dropRate DESC
      LIMIT 5
    `;
    const result = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await result.json();
    res.status(200).json({ data: data });
  } catch (err) {
    console.error('Dropoff Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get dropoff summary data' });
  }
});

/* 기존 Sankey API에 segment 필터(전환 여부, 장바구니 이탈 등) 적용 */
router.get('/userpath-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const segment = req.query.segment; // e.g. "converted", "abandoned_cart"
  const fromPage = '/cart';
  const toPage = '/checkout/success';

  let sessionFilter = ''; // 세션 필터

  // segment 필터 로직
  if (segment === 'converted') {
    sessionFilter = `
      AND session_id IN (
        SELECT a.session_id
        FROM (
          SELECT session_id, min(event_ts) AS a_time
          FROM events_pages
          WHERE page_path = '${fromPage}' AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ) AS a
        INNER JOIN (
          SELECT session_id, min(event_ts) AS b_time
          FROM events_pages
          WHERE page_path = '${toPage}' AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ) AS b
        ON a.session_id = b.session_id AND a.a_time < b.b_time
      )
    `;
  } else if (segment === 'abandoned_cart') {
    sessionFilter = `
      AND session_id IN (
        SELECT session_id
        FROM events_pages
        WHERE page_path = '${fromPage}' AND sdk_key = '${sdk_key}'
        AND session_id NOT IN (
          SELECT session_id
          FROM events_pages
          WHERE page_path = '${toPage}' AND sdk_key = '${sdk_key}'
        )
      )
    `;
  }

  const query = `
    WITH raw_paths AS (
      SELECT
        session_id,
        groupArray((event_ts, page_path)) AS ordered
      FROM events_pages
      WHERE sdk_key = '${sdk_key}'
        AND page_path != ''
        AND event_ts >= now() - INTERVAL 1 DAY
        ${sessionFilter}
      GROUP BY session_id
    ),
    flattened AS (
      SELECT
        arrayJoin(
          arrayMap(i -> (ordered[i].2, ordered[i+1].2), range(length(ordered) - 1))
        ) AS pair
      FROM raw_paths
    )
    SELECT
      pair.1 AS from,
      pair.2 AS to,
      count(*) AS value
    FROM flattened
    GROUP BY from, to
    ORDER BY value DESC
    LIMIT 500
  `;

  try {
    const result = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await result.json();
    res.status(200).json({ data });
  } catch (err) {
    console.error('Userpath Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get userpath summary data' });
  }
});

/* 전환경로 Top 3 */
router.get('/userpath-summary/conversion-top3', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const {
    fromPage = '/cart',
    toPage = '/checkout/success',
    limit = 3,
    startDate,
    endDate
  } = req.query;

  const start = startDate ? `toDate('${startDate}')` : `today() - 6`;
  const end = endDate ? `toDate('${endDate}')` : `today()`;

  const query = `
    WITH
      -- A: fromPage 도달 세션
      a_sessions AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM events
        WHERE page_path = '${fromPage}'
          AND toDate(timestamp) BETWEEN ${start} AND ${end}
          AND sdk_key = '${sdk_key}'
        GROUP BY session_id
      ),

      -- B: toPage 도달 세션
      b_sessions AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM events
        WHERE page_path = '${toPage}'
          AND toDate(timestamp) BETWEEN ${start} AND ${end}
          AND sdk_key = '${sdk_key}'
        GROUP BY session_id
      ),

      -- A → B를 만족하는 전환 세션
      ab_sessions AS (
        SELECT a.session_id
        FROM a_sessions a
        INNER JOIN b_sessions b USING (session_id)
        WHERE b.b_time > a.a_time
      ),

      -- A 세션 기준 전체 경로 복원
      full_paths AS (
        SELECT
          session_id,
          arrayMap(x -> x.2, arraySort(x -> x.1, groupArray((timestamp, page_path)))) AS path
        FROM events
        WHERE session_id IN (SELECT session_id FROM a_sessions)
          AND toDate(timestamp) BETWEEN ${start} AND ${end}
          AND sdk_key = '${sdk_key}'
        GROUP BY session_id
      ),

      -- 라벨링: 전환 여부
      labeled_paths AS (
        SELECT
          fp.path,
          isNotNull(ab.session_id) AS is_converted
        FROM full_paths fp
        LEFT JOIN ab_sessions ab USING (session_id)
      ),

      -- 경로별 집계
      path_stats AS (
        SELECT
          arrayStringConcat(path, ' → ') AS path_string,
          count() AS total_sessions,
          sum(is_converted) AS conversion_count,
          round(sum(is_converted) / nullIf(count(), 0) * 100, 1) AS conversion_rate
        FROM labeled_paths
        GROUP BY path
      ),

      -- 총 전환 수 및 평균 전환율
      total_stats AS (
        SELECT
          sum(conversion_count) AS total_conversion,
          avg(conversion_rate) AS avg_rate
        FROM path_stats
      )

    SELECT
      path_string,
      conversion_count,
      conversion_rate,
      round(conversion_count / nullIf(ts.total_conversion, 0) * 100, 1) AS share,
      round(conversion_rate / nullIf(ts.avg_rate, 0), 1) AS compare_to_avg
    FROM path_stats, total_stats ts
    ORDER BY conversion_count DESC
    LIMIT ${limit}
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const rows = await resultSet.json();

    const totalConversion = rows.reduce((acc, row) => acc + Number(row.conversion_count || 0), 0);

    const data = rows.map((row, index) => ({
      path: row.path_string.split(' → '),
      conversionCount: Number(row.conversion_count),
      conversionRate: Number(row.conversion_rate),
      rank: index + 1,
      share: Number(row.share),
      compareToAvg: Number(row.compare_to_avg)
    }));

    res.status(200).json({
      data,
      totalConversion
    });
  } catch (err) {
    console.error('Conversion Top3 API ERROR:', err);
    res.status(500).json({ error: 'Failed to get conversion top paths' });
  }
});

module.exports = router;