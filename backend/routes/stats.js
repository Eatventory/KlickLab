const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

router.get('/visitors', async (req, res) => {
  try {
		const yesterdayRes = await clickhouse.query({
			query: `
				SELECT visitors
				FROM daily_metrics
				WHERE date = yesterday();
			`,
			format: 'JSON'
		});
		const yesterdayVisitors = (await yesterdayRes.json()).data[0]?.visitors ?? 0;

		// 오늘 방문자 수
		const visitorRes = await clickhouse.query({
			query: `
				SELECT countDistinct(client_id) AS visitors
				FROM events
				WHERE date(timestamp) = today()
			`,
			format: 'JSON'
		});
		const todayVisitors = +(await visitorRes.json()).data[0]?.visitors || 0;
	
		// const visitorsRate = yesterday.visitors
		// 	? +(((visitors - yesterday.visitors) / yesterday.visitors) * 100).toFixed(1)
		// 	: 0;
    
    res.status(200).json({
      today: todayVisitors,
      yesterday: yesterdayVisitors
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
				WHERE date = yesterday();
			`,
			format: 'JSON'
		});
		const yesterdayClicks = (await yesterdayRes.json()).data[0]?.clicks ?? 0;

		// 오늘 방문자 수
		const clickRes = await clickhouse.query({
			query: `
				SELECT count() AS clicks
				FROM events
				WHERE date(timestamp) >= today() AND event_name = 'auto_click'
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
				WHERE date(timestamp) >= today() AND event_name = 'auto_click' AND target_text != ''
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
      FROM klicklab.events
      WHERE date(timestamp) >= today() AND page != ''
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

module.exports = router;
