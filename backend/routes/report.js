const express = require("express");
const router = express.Router();
const { format } = require('@fast-csv/format');
const stream = require('stream');
const clickhouse = require('../src/config/clickhouse');
const authMiddleware = require('../middlewares/authMiddleware');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');

const { getKpiQueries } = require('../utils/reportUtils');

router.get('/kpi-report', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const queries = getKpiQueries(sdk_key, startDate, endDate);

    const results = await Promise.all(
      Object.entries(queries).map(([key, { query }]) =>
        clickhouse.query({ query, format: 'JSON' }).then(r => r.json()).then(r => ({ key, data: r.data || [] }))
      )
    );

    const response = {};
    for (const { key, data } of results) {
      response[key] = {
        category: queries[key].category,
        data
      };
    }

    res.json(response);
  } catch (err) {
    console.error('[ERROR] /api/kpi-report 실패:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/kpi-report/csv', async (req, res) => {
  const reportData = req.body;

  if (!reportData || typeof reportData !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid report data' });
  }

  const dateTime = formatLocalDateTime(new Date(), true);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kpi-report-export-${dateTime}.csv"`);

  try {
    const sections = Object.entries(reportData);

    for (const [key, section] of sections) {
      const { category, data } = section;
      if (!Array.isArray(data) || data.length === 0) continue;

      // 제목 줄 삽입
      res.write(`## ${category}\n`);

      const csvStream = format({ headers: true });
      csvStream.pipe(res, { end: false });

      const keys = Object.keys(data[0]);
      for (const row of data) {
        const rowOut = {};
        keys.forEach(k => rowOut[k] = row[k] ?? '');
        csvStream.write(rowOut);
      }

      await new Promise((resolve) => {
        csvStream.end(() => {
          res.write('\n\n');
          resolve();
        });
      });
    }

    res.end();
  } catch (err) {
    console.error('[ERROR] CSV 생성 실패:', err);
    res.status(500).end();
  }
});

module.exports = router;
