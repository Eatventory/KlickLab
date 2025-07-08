const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

router.get('/visitors', async (req, res) => {
  try {
    // 최근 7일간 방문자 추이 쿼리
    const trendRes = await clickhouse.query({
      query: `
        SELECT
          formatDateTime(date, '%Y-%m-%d') AS date_str,
          toUInt64(visitors) AS visitors
        FROM klicklab.daily_metrics
        WHERE date >= toDate(toTimeZone(now(), 'Asia/Seoul')) - 6
          AND date < toDate(toTimeZone(now(), 'Asia/Seoul'))
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
        WHERE date = toDate(toTimeZone(now() - INTERVAL 1 DAY, 'Asia/Seoul'));
      `,
      format: 'JSON'
    });
    const yesterdayVisitors = (await yesterdayRes.json()).data[0]?.visitors ?? 0;

    const visitorRes = await clickhouse.query({
      query: `
        SELECT countDistinct(client_id) AS visitors
        FROM events
        WHERE toDate(timestamp) = toDate(toTimeZone(now(), 'Asia/Seoul'))
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

router.get('/clicks', async (req, res) => {
	try {
		const yesterdayRes = await clickhouse.query({
			query: `
				SELECT clicks
				FROM daily_metrics
				WHERE date = toDate(toTimeZone(now() - INTERVAL 1 DAY, 'Asia/Seoul'));
			`,
			format: 'JSON'
		});
		const yesterdayClicks = (await yesterdayRes.json()).data[0]?.clicks ?? 0;

		const clickRes = await clickhouse.query({
			query: `
				SELECT count() AS clicks
				FROM events
				WHERE date(timestamp) >= toDate(toTimeZone(now(), 'Asia/Seoul')) AND event_name = 'auto_click'
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

router.get('/top-clicks', async (req, res) => {
  try {
		const topClicksRes = await clickhouse.query({
			query: `
				SELECT target_text, count() AS cnt
				FROM events
				WHERE date(timestamp) >= toDate(toTimeZone(now(), 'Asia/Seoul')) AND event_name = 'auto_click' AND target_text != ''
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

router.get('/click-trend', async (req, res) => {
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

router.get('/dropoff-summary', async (req, res) => {
  try {
    const query = `
      SELECT
        page_path as page,
        round(countIf(event_name = 'page_exit') / count() * 100, 1) AS dropRate
      FROM events
      WHERE date(timestamp) >= toDate(toTimeZone(now(), 'Asia/Seoul')) AND page != ''
      GROUP BY page
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

router.get('/userpath-summary', async (req, res) => {
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
            AND date(timestamp) = toDate(toTimeZone(now(), 'Asia/Seoul'))
          ORDER BY user_id, timestamp
        )
        GROUP BY user_id
      )
      ARRAY JOIN arrayZip(arraySlice(path, 1, length(path) - 1), arraySlice(path, 2)) AS tuple
      GROUP BY from, to
      ORDER BY value DESC
    `;

    const resultSet = await clickhouse.query({
      query: pathQuery,
      format: "JSON"
    });

    const result = await resultSet.json();
    res.status(200).json({ data: result.data });
  } catch (err) {
    console.error('User Path Summary API ERROR:', err);
    res.status(500).json({ error: 'Failed to get userpath summary data' });
  }
});

router.get('/average-session-duration', async (req, res) => {
  try {
    const query = `
      SELECT 
        toDate(timestamp) AS date,
        avg(session_duration) AS avg_session_seconds
      FROM (
        SELECT 
          session_id,
          min(timestamp) AS session_start,
          max(timestamp) AS session_end,
          dateDiff('second', min(timestamp), max(timestamp)) AS session_duration
        FROM events
        GROUP BY session_id
      )
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `;

    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const result = await resultSet.json();
    res.status(200).json({ data: result });
  } catch (err) {
    console.error('Session Duration API ERROR:', err);
    res.status(500).json({ error: 'Failed to get session duration data' });
  }
});

router.get('/conversion-rate', async (req, res) => {
  const fromPage = req.query.from || '/';
  const toPage = req.query.to || '/';

  const query = `
    WITH
      a_sessions AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM events
        WHERE page_path = '${fromPage}'
        GROUP BY session_id
      ),
      ab_sessions AS (
        SELECT a.session_id
        FROM a_sessions a
        JOIN (
          SELECT session_id, min(timestamp) AS b_time
          FROM events
          WHERE page_path = '${toPage}'
          GROUP BY session_id
        ) b ON a.session_id = b.session_id AND a.a_time < b.b_time
      )

    SELECT 
      (SELECT count(*) FROM ab_sessions) AS converted,
      (SELECT count(*) FROM a_sessions) AS total,
      round((converted / total) * 100, 1) AS conversion_rate
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const [data] = await resultSet.json();
    const response = {
      from: fromPage,
      to: toPage,
      converted: data.converted,
      total: data.total,
      conversionRate: data.conversion_rate,
    };
    res.status(200).json({ data: response });
  } catch (err) {
    console.error('Conversion Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get conversion rate data' });
  }
});

module.exports = router;
