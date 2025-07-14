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

    // 오늘 실시간
    // hourly + minutes sum
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
    const hourlyRes = await clickhouse.query({
      query: `
        SELECT segment_value AS target_text, sum(total_clicks) AS cnt
        FROM hourly_top_elements
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time < toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'target_text'
          AND segment_value != ''
        GROUP BY segment_value
      `,
      format: 'JSONEachRow'
    });
    const hourlyClicks = (await hourlyRes.json()).map(row => ({
      label: row.target_text,
      count: Number(row.cnt)
    }));

    const minutesRes = await clickhouse.query({
      query: `
        SELECT segment_value AS target_text, sum(total_clicks) AS cnt
        FROM minutes_top_elements
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time <= toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'target_text'
          AND segment_value != ''
        GROUP BY segment_value
      `,
      format: 'JSONEachRow'
    });
    const minutesClicks = (await minutesRes.json()).map(row => ({
      label: row.target_text,
      count: Number(row.cnt)
    }));

    const eventsRes = await clickhouse.query({
      query: `
        SELECT target_text, count() AS cnt
        FROM events
        WHERE timestamp > toDateTime('${tenMinutesFloor}')
          AND timestamp <= toDateTime('${isoNow}')
          AND event_name = 'auto_click'
          AND sdk_key = '${sdk_key}'
          AND target_text != ''
        GROUP BY target_text
      `,
      format: 'JSONEachRow'
    });
    const eventsClicks = (await eventsRes.json()).map(row => ({
      label: row.target_text,
      count: Number(row.cnt)
    }));

    const clickMap = new Map();
    [...hourlyClicks, ...minutesClicks, ...eventsClicks].forEach(({ label, count }) => {
      clickMap.set(label, (clickMap.get(label) || 0) + count);
    });

    const merged = [...clickMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({ items: merged });
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

  let segmentFilter = '';
  if (segment === 'converted') {
    segmentFilter = `
      AND session_id IN (
        SELECT a.session_id
        FROM (
          SELECT session_id, min(timestamp) AS a_time
          FROM events
          WHERE page_path = '${fromPage}'
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ) a
        INNER JOIN (
          SELECT session_id, min(timestamp) AS b_time
          FROM events
          WHERE page_path = '${toPage}'
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ) b ON a.session_id = b.session_id AND a.a_time < b.b_time
      )
    `;
  } else if (segment === 'abandoned_cart') {
    segmentFilter = `
      AND session_id IN (
        SELECT session_id
        FROM events
        WHERE page_path = '${fromPage}'
          AND sdk_key = '${sdk_key}'
          AND session_id NOT IN (
            SELECT session_id
            FROM events
            WHERE page_path = '${toPage}'
              AND sdk_key = '${sdk_key}'
          )
      )
    `;
  }

  const query = `
    SELECT
      from,
      to,
      sum(count) AS value
    FROM (
      SELECT
        page_path AS from,
        arrayJoin(arrayZip(next_pages.to, next_pages.count)) AS pair,
        pair.1 AS to,
        pair.2 AS count
      FROM klicklab.hourly_page_stats
      WHERE date_time >= toDateTime('${todayStart}')
        AND page_path != ''
        AND sdk_key = '${sdk_key}'
        AND length(next_pages.to) > 0
        ${segmentFilter}
    )
    GROUP BY from, to
    ORDER BY value DESC
    LIMIT 1000
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
    limit = 3,
    startDate,
    endDate,
    event = '/checkout/success'
  } = req.query;

  const start = startDate ? `toDate('${startDate}')` : `today() - 6`;
  const end = endDate ? `toDate('${endDate}')` : `today()`;

  const query = `
    WITH
      -- 전환 세션
      converted_sessions AS (
        SELECT DISTINCT session_id
        FROM events
        WHERE page_path = '${event}'
          AND toDate(timestamp) BETWEEN ${start} AND ${end}
          AND sdk_key = '${sdk_key}'
      ),
      
      -- 세션별 전체 경로
      session_paths AS (
        SELECT
          session_id,
          groupArray(page_path ORDER BY timestamp) AS path
        FROM events
        WHERE toDate(timestamp) BETWEEN ${start} AND ${end}
          AND sdk_key = '${sdk_key}'
        GROUP BY session_id
      ),

      -- 전환 여부 포함한 세션 경로 요약
      labeled_paths AS (
        SELECT
          path,
          has(converted_sessions.session_id, sp.session_id) AS is_converted
        FROM session_paths sp
        LEFT JOIN converted_sessions USING (session_id)
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

      -- 전체 전환 수 및 평균 전환율
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

    // totalConversion 별도 재쿼리
    const totalQuery = `
      SELECT count(DISTINCT session_id) AS total_conversion
      FROM events
      WHERE page_path = '${event}'
        AND toDate(timestamp) BETWEEN ${start} AND ${end}
        AND sdk_key = '${sdk_key}'
    `;
    const totalRes = await clickhouse.query({ query: totalQuery, format: 'JSONEachRow' });
    const totalConversion = (await totalRes.json())[0]?.total_conversion || 0;

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

/* KPI 지표 변화 요약 카드 API */
router.get('/insight-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    // 클릭 수
    const clickRes = await clickhouse.query({
      query: `
        SELECT
          (SELECT sum(clicks) FROM hourly_metrics
            WHERE date_time >= toDateTime('${todayStart}')
              AND date_time <= toDateTime('${oneHourFloor}')
              AND sdk_key = '${sdk_key}') +
          (SELECT sum(clicks) FROM minutes_metrics
            WHERE date_time >= toDateTime('${NearestHourFloor}')
              AND date_time <= toDateTime('${tenMinutesFloor}')
              AND sdk_key = '${sdk_key}') AS today_clicks,
          (SELECT clicks FROM daily_metrics
            WHERE date = yesterday()
              AND sdk_key = '${sdk_key}') AS yesterday_clicks
      `,
      format: 'JSON'
    });
    const { today_clicks, yesterday_clicks } = (await clickRes.json()).data[0] || {};

    // 방문자 수
    const visitorRes = await clickhouse.query({
      query: `
        SELECT
          (SELECT sum(visitors) FROM hourly_metrics
            WHERE date_time >= toDateTime('${todayStart}')
              AND date_time <= toDateTime('${oneHourFloor}')
              AND sdk_key = '${sdk_key}') +
          (SELECT sum(visitors) FROM minutes_metrics
            WHERE date_time >= toDateTime('${NearestHourFloor}')
              AND date_time <= toDateTime('${tenMinutesFloor}')
              AND sdk_key = '${sdk_key}') AS today_visitors,
          (SELECT visitors FROM daily_metrics
            WHERE date = yesterday()
              AND sdk_key = '${sdk_key}') AS yesterday_visitors
      `,
      format: 'JSON'
    });
    const { today_visitors, yesterday_visitors } = (await visitorRes.json()).data[0] || {};

    // 전환율 (기존 /conversion-summary 참고)
    const fromPage = '/cart';
    const toPage = '/checkout/success';
    const convRes = await clickhouse.query({
      query: `
        WITH
          r AS (
            SELECT count(*) AS converted
            FROM (
              SELECT session_id
              FROM events
              WHERE page_path = '${fromPage}'
                AND date_time >= toDateTime('${todayStart}')
                AND sdk_key = '${sdk_key}'
              INTERSECT
              SELECT session_id
              FROM events
              WHERE page_path = '${toPage}'
                AND date_time >= toDateTime('${todayStart}')
                AND sdk_key = '${sdk_key}'
            )
          ),
          t AS (
            SELECT count(DISTINCT session_id) AS total
            FROM events
            WHERE page_path = '${fromPage}'
              AND date_time >= toDateTime('${todayStart}')
              AND sdk_key = '${sdk_key}'
          )
        SELECT 
          (SELECT converted FROM r) AS today_converted,
          (SELECT total FROM t) AS today_total,
          (
            SELECT round(count(*) / nullIf(countDistinct(session_id), 0), 3)
            FROM events
            WHERE page_path = '${toPage}'
              AND toDate(timestamp) = yesterday()
              AND sdk_key = '${sdk_key}'
          ) AS yesterday_rate
      `,
      format: 'JSON'
    });

    const {
      today_converted,
      today_total,
      yesterday_rate
    } = (await convRes.json()).data[0] || {};

    const today_rate = today_total ? +(today_converted / today_total).toFixed(3) : 0;

    // 문장 생성 로직
    const insightMessages = [];

    function formatChange(today, yesterday, unit = '', precision = 1) {
      const delta = today - yesterday;
      const percent = yesterday === 0 ? 0 : (delta / yesterday) * 100;
      const absPercent = Math.abs(percent).toFixed(precision);
      const trend = delta > 0 ? '증가' : delta < 0 ? '감소' : '변동 없음';
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
      return { trend, sentence: `오늘 ${unit} ${absPercent}% ${trend}했습니다.`, absPercent };
    }

    // 클릭 수
    if (today_clicks != null && yesterday_clicks != null) {
      const { sentence } = formatChange(today_clicks, yesterday_clicks, '클릭 수');
      insightMessages.push(sentence);
    }

    // 방문자 수
    if (today_visitors != null && yesterday_visitors != null) {
      const { sentence } = formatChange(today_visitors, yesterday_visitors, '방문자 수');
      insightMessages.push(sentence);
    }

    // 전환율
    if (today_rate != null && yesterday_rate != null) {
      const delta = (today_rate - yesterday_rate) * 100;
      const trend = delta > 0 ? '증가' : delta < 0 ? '감소' : '변동 없음';
      const absDelta = Math.abs(delta).toFixed(1);
      insightMessages.push(`오늘 전환율이 ${absDelta}%포인트 ${trend}했습니다.`);
    }

    res.status(200).json({
      insights: insightMessages,
      raw: {
        clicks: { today: today_clicks, yesterday: yesterday_clicks },
        visitors: { today: today_visitors, yesterday: yesterday_visitors },
        conversion_rate: { today: today_rate, yesterday: yesterday_rate }
      }
    });
  } catch (err) {
    console.error('Insight Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to generate insight summary' });
  }
});
/* 응답 예시 :
{
  "insights": [
    "오늘 클릭 수 23.5% 증가했습니다.",
    "오늘 방문자 수 17.2% 감소했습니다.",
    "오늘 전환율이 0.4%포인트 증가했습니다."
  ],
  "raw": {
    "clicks": { "today": 1230, "yesterday": 996 },
    "visitors": { "today": 801, "yesterday": 968 },
    "conversion_rate": { "today": 0.021, "yesterday": 0.017 }
  }
} */

module.exports = router;