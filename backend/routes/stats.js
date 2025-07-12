const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const { formatLocalDateDay, formatLocalDateTime } = require('../utils/formatLocalDateTime');
const authMiddleware = require('../middlewares/authMiddleware');

const now = new Date();
const localNow = formatLocalDateDay(now);
const isoNow = formatLocalDateTime(now);

const floorToNearest10Min = (date) => {
  const d = new Date(date);
  d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
  return d;
};

const oneHourAgoDate = new Date(now);
oneHourAgoDate.setHours(now.getHours() - 1, 0, 0, 0);

const tenMinutesFloor = formatDateTime(floorToNearest10Min(now));
const oneHourFloor = formatDateTime(oneHourAgoDate);
const todayStart = formatLocalDateTime(new Date(new Date().setHours(0, 0, 0, 0)));

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
    // console.time("1. visitors/trendRes");
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
    // console.timeEnd("1. visitors/trendRes");

    // 어제자
    // console.time("2. visitors/yesterdayRes");
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
    // console.timeEnd("2. visitors/yesterdayRes");

    // 오늘 실시간
    // console.time("3. visitors/visitorRes");

    // hourly + minutes sum
    const todayVisitorsRes = await clickhouse.query({
      query: `
        WITH
          (
            SELECT sum(visitors) FROM hourly_metrics
            WHERE toDate(date_time) = toDate('${localNow}')
              AND date_time <= toDateTime('${oneHourFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS hourly_visitors,
          (
            SELECT sum(visitors) FROM minutes_metrics
            WHERE date_time > toDateTime('${oneHourFloor}')
              AND date_time <= toDateTime('${tenMinutesFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS minutes_visitors
        SELECT hourly_visitors + minutes_visitors AS visitors;
      `,
      format: 'JSON'
    });
    const todayVisitors = +(await todayVisitorsRes.json()).data[0]?.visitors || 0;

    // console.timeEnd("3. visitors/visitorRes");

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
    // console.time("4. clicks/yesterdayRes");
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
    // console.timeEnd("4. clicks/yesterdayRes");

    // 10분 전 데이터부터 top clicks에 반영됨
    // console.time("5. clicks/clickRes");
    const clickRes = await clickhouse.query({
      query: `
        WITH
          (SELECT sum(clicks) FROM hourly_metrics
          WHERE date_time >= toDateTime('${todayStart}')
            AND date_time <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}') AS hourly_clicks,
          (SELECT sum(clicks) FROM minutes_metrics
          WHERE date_time > toDateTime('${oneHourFloor}')
            AND date_time <= toDateTime('${tenMinutesFloor}')
            AND sdk_key = '${sdk_key}') AS minutes_clicks
        SELECT hourly_clicks + minutes_clicks AS clicks
      `,
      format: 'JSON'
    });
    const todayClicks = +(await clickRes.json()).data[0]?.clicks || 0;
    // console.timeEnd("5. clicks/clickRes");

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
    // console.time("6. top-clicks/hourlyRes");
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
    // console.timeEnd("6. top-clicks/hourlyRes");

    // console.time("7. top-clicks/minutesRes");
    const minutesRes = await clickhouse.query({
      query: `
        SELECT segment_value AS target_text, sum(total_clicks) AS cnt
        FROM minutes_top_elements
        WHERE date_time > toDateTime('${oneHourFloor}')
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
    // console.timeEnd("7. top-clicks/minutesRes");

    // console.time("8. top-clicks/eventsRes");
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
    // console.timeEnd("8. top-clicks/eventsRes");

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

    // console.time("9. click-trend/clickTrendRes");
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
    // console.timeEnd("9. click-trend/clickTrendRes");

    res.status(200).json({ data: clickTrend });
  } catch (err) {
    console.error('Click Trend API ERROR:', err);
    res.status(500).json({ error: 'Failed to get click trend data' });
  }
});

router.get('/dropoff-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    // console.time("10. dropoff-summary");
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
    // console.timeEnd("10. dropoff-summary");
    res.status(200).json({ data: data });
  } catch (err) {
    console.error('Dropoff Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get dropoff summary data' });
  }
});

router.get('/userpath-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    // console.time("11. userpath-summary");

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
      )
      GROUP BY from, to
      ORDER BY value DESC
      LIMIT 1000
    `;
    const result = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    // console.timeEnd("11. userpath-summary");
    res.status(200).json({ data });
  } catch (err) {
    console.error('Userpath Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get userpath summary data' });
  }
});

module.exports = router;