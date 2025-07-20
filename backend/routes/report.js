const express = require("express");
const router = express.Router();
const { format } = require('@fast-csv/format');
const stream = require('stream');
const clickhouse = require('../src/config/clickhouse');
const authMiddleware = require('../middlewares/authMiddleware');

// 1) 일별 지표 (daily_metrics)
const dailyMetricsQ = (sdk_key, startDate, endDate) => {
  return `
    SELECT
      date,
      visitors,
      new_visitors,
      existing_visitors,
      avg_session_seconds
    FROM daily_metrics
    WHERE sdk_key='${sdk_key}'
      AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    ORDER BY date ASC
  `;
}

// 2) 클릭 요약 (daily_click_summary)
const clickSummaryQ = (sdk_key, startDate, endDate) => {
  return `
    SELECT
      date,
      segment_type,
      segment_value,
      total_clicks,
      total_users,
      avg_clicks_per_user
    FROM daily_click_summary
    WHERE sdk_key='${sdk_key}'
      AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    ORDER BY date ASC, total_clicks DESC
  `;
}
// 3) 이벤트 집계 (daily_event_agg)
const eventSummaryQ = (sdk_key, startDate, endDate) => {
  return `
    SELECT
      summary_date AS date,
      event_name,
      sumMerge(event_count_state) AS event_count,
      uniqMerge(unique_users_state) AS unique_users
    FROM daily_event_agg
    WHERE sdk_key='${sdk_key}'
      AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY summary_date, event_name
    ORDER BY summary_date ASC, event_count DESC
  `;
}

router.get("/kpi-report", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const [dailyRes, clickRes, eventRes] = await Promise.all([
      clickhouse.query({ query: dailyMetricsQ(sdk_key, startDate, endDate), format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: clickSummaryQ(sdk_key, startDate, endDate), format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: eventSummaryQ(sdk_key, startDate, endDate), format: 'JSON' }).then(r => r.json()),
    ]);

    res.status(200).json({
      dailyMetrics: dailyRes.data || [],
      clickSummary: clickRes.data || [],
      eventSummary: eventRes.data || []
    });
  } catch (err) {
    console.error('[ERROR] KPI 리포트 조회 실패:', err);
    res.status(500).json({ message: "KPI 리포트 조회 실패" });
  }
});

router.get("/kpi-report/csv", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return res.status(400).json({ error: 'Missing startDate or endDate' });

  const queries = [
    dailyMetricsQ(sdk_key, startDate, endDate),
    clickSummaryQ(sdk_key, startDate, endDate),
    eventSummaryQ(sdk_key, startDate, endDate),
  ];

  try {
    const results = await Promise.all(
      queries.map((q) =>
        clickhouse.query({ query: q, format: 'JSON' }).then((r) => r.json()).then((r) => r.data || [])
      )
    );
    const [daily, clicks, events] = results;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpi-report-${startDate}-${endDate}.csv"`);

    const writeCsvSection = (title, data, headers) => {
      return new Promise((resolve) => {
        if (data.length === 0) return resolve();

        res.write(`## Table: ${title}\n`);

        const passthrough = new stream.PassThrough();
        passthrough.pipe(res, { end: false });

        const csvStream = format({ headers: headers });
        csvStream.pipe(passthrough);
        for (const row of data) {
          const rowData = {};
          headers.forEach((h) => {
            rowData[h] = row[h] ?? '';
          });
          csvStream.write(rowData);
        }
        csvStream.end();
        csvStream.on('finish', () => {
          res.write('\n\n');
          resolve();
        });
      });
    };

    await writeCsvSection('dailyMetrics', daily, [
      'date',
      'visitors',
      'new_visitors',
      'existing_visitors',
      'avg_session_seconds',
    ]);

    await writeCsvSection('clickSummary', clicks, [
      'date',
      'segment_type',
      'segment_value',
      'total_clicks',
      'total_users',
      'avg_clicks_per_user',
    ]);

    await writeCsvSection('eventSummary', events, [
      'date',
      'event_name',
      'event_count',
      'unique_users',
    ]);

    res.end();
  } catch (err) {
    console.error('[ERROR] KPI CSV 생성 실패:', err);
    res.status(500).end();
  }
});

module.exports = router;
