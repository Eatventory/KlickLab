const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

router.get('/top-clicks', async (req, res) => {
  const segment = req.query.filter;
  let segmentColumn = null;
  try {
    if (segment === 'gender') {
      segmentColumn = 'user_gender';
    } else if (segment === 'ageGroup') {
      segmentColumn = 'user_age';
    } else if (segment === 'signupPath') {
      segmentColumn = 'traffic_source';
    } else if (segment === 'device') {
      segmentColumn = 'device';
    } else {
      return res.status(400).json({ error: 'Invalid user segment' });
    }

    const query = `
      SELECT 
        ${segmentColumn} AS segment,
        element_path AS element,
        count(*) AS count
      FROM klicklab.events
      WHERE event_name = 'auto_click'
        AND timestamp >= now() - interval 7 day
        AND element_path != ''
        AND ${segmentColumn} IS NOT NULL
      GROUP BY segment, element
      ORDER BY segment ASC, count DESC
    `;

    const resultSet = await clickhouse.query({
      query,
      format: 'JSON',
    });

    const result = await resultSet.json();

    // 응답 가공: 각 segment 그룹마다 top 5 요소만 추출
    const grouped = {};
    for (const row of result.data) {
      const key = row.segment ?? 'unknown';
      if (!grouped[key]) grouped[key] = [];
      if (grouped[key].length < 5) {
        grouped[key].push({ element: row.element, count: row.count });
      }
    }

    res.status(200).json({data: grouped});
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

module.exports = router;
