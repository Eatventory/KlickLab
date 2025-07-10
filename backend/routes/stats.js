const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const { formatLocalDateDay } = require('../utils/formatLocalDateTime');
const authMiddleware = require('../middlewares/authMiddleware');

const now = new Date();
const localNow = formatLocalDateDay(now);

// ✅ UNION ALL 제거: 오늘과 이전 데이터 분리 조회
// ✅ ORDER BY 제거
// ✅ toDate()로 파티션 활용
router.get('/visitors', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    // 최근 7일간 방문자 추이 쿼리
    const trendRes = await clickhouse.query({
      query: `
        SELECT
          formatDateTime(date, '%Y-%m-%d') AS date_str,
          toUInt64(visitors) AS visitors
        FROM daily_metrics
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

    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT visitors
        FROM daily_metrics
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const yesterdayVisitors = (await yesterdayRes.json()).data[0]?.visitors ?? 0;

    const visitorRes = await clickhouse.query({
      query: `
        SELECT countDistinct(client_id) AS visitors
        FROM events
        WHERE toDate(timestamp) = toDate('${localNow}')
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const todayVisitors = +(await visitorRes.json()).data[0]?.visitors || 0;

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

// ✅ event_name = 'auto_click' + toDate(timestamp) 사용
// ✅ 어제 데이터는 daily_metrics 테이블로 빠르게 조회
router.get('/clicks', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
	try {
    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT clicks
        FROM daily_metrics
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: 'JSON'
    });
    const yesterdayClicks = (await yesterdayRes.json()).data[0]?.clicks ?? 0;

    const clickRes = await clickhouse.query({
      query: `
        SELECT count() AS clicks
        FROM events
        WHERE toDate(timestamp) = toDate('${localNow}')
          AND event_name = 'auto_click'
          AND sdk_key = '${sdk_key}'
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

// ✅ event_name = 'auto_click' AND target_text != ''로 필터링
// ✅ GROUP BY target_text, LIMIT 5만 수행 → 비교적 가벼움
// ✅ toDate(timestamp) 사용으로 파티션 최적화
router.get('/top-clicks', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const topClicksRes = await clickhouse.query({
      query: `
        SELECT target_text, count() AS cnt
        FROM events
        WHERE toDate(timestamp) = toDate('${localNow}')
          AND event_name = 'auto_click' AND target_text != ''
            AND sdk_key = '${sdk_key}'
        GROUP BY target_text
        ORDER BY cnt DESC
        LIMIT 5
      `,
      format: 'JSONEachRow'
    });
    const topClicks = (await topClicksRes.json()).map(row => ({
      label: row.target_text,
      count: Number(row.cnt)
    }));
    res.status(200).json({ items: topClicks });
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

// ✅ timestamp 스캔을 base - interval 범위로 제한
// ✅ 시간 블록 계산을 상대값 기반으로 처리 → 정렬 성능 개선
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

// ✅ countIf() + count() 중복 제거 → WITH로 합쳐서 처리
// ✅ toDate(timestamp) 사용, page != ''로 사전 필터링
router.get('/dropoff-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = `
      WITH t AS (
        SELECT
          page_path,
          countIf(event_name = 'page_exit') AS exit_count,
          count(*) AS total_count
        FROM events
        WHERE toDate(timestamp) = toDate('${localNow}') AND page_path != '' AND sdk_key = '${sdk_key}'
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

// ✅ groupArray + ARRAY JOIN 조합에 LIMIT 1000으로 유저 수 제한
// ✅ ORDER BY user_id, timestamp로 정렬은 유지하되 스캔 범위 최소화
router.get('/userpath-summary', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const pathQuery = `
      SELECT 
        tuple.1 AS from,
        tuple.2 AS to,
        count(*) AS value
      FROM (
        SELECT 
          user_id,
          groupArray(page_path) AS path
        FROM (
          SELECT 
            user_id,
            page_path
          FROM events
          WHERE event_name IN ('page_view', 'auto_click')
            AND toDate(timestamp) = toDate('${localNow}')
            AND sdk_key = '${sdk_key}'
          ORDER BY user_id, timestamp
        )
        GROUP BY user_id
        LIMIT 1000
      )
      ARRAY JOIN arrayZip(arraySlice(path, 1, length(path) - 1), arraySlice(path, 2)) AS tuple
      GROUP BY from, to
      ORDER BY value DESC
    `;

    const resultSet = await clickhouse.query({ query: pathQuery, format: "JSON" });
    const result = await resultSet.json();
    res.status(200).json({ data: result.data });
  } catch (err) {
    console.error('User Path Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get userpath summary data' });
  }
});

module.exports = router;