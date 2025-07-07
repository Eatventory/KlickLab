const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

router.get('/top-clicks', async (req, res) => {
  try {
    let segment = req.query.filter;
    const validSegments = ['user_gender', 'user_age', 'traffic_source', 'device_type'];

    if (segment === 'gender') segment = 'user_gender';
    if (!validSegments.includes(segment)) {
      return res.status(400).json({ error: 'Invalid user segment' });
    }

    // 1. 세그먼트별 총 클릭 수, 유저 수, 평균 클릭 수
    const summaryQuery = `
      SELECT 
        ${segment} AS segment,
        count(*) AS totalClicks,
        count(DISTINCT user_id) AS totalUsers,
        round(count() / countDistinct(user_id), 1) AS avgClicksPerUser
      FROM klicklab.events
      WHERE event_name = 'auto_click'
        AND timestamp >= now() - interval 7 day
        AND ${segment} IS NOT NULL
      GROUP BY segment
    `;

    // 2. 세그먼트별 Top 요소 (상위 3개)
    const topElementsQuery = `
      SELECT 
        ${segment} AS segment,
        element_path AS element,
        count(*) AS totalClicks,
        count(DISTINCT user_id) AS userCount
      FROM klicklab.events
      WHERE event_name = 'auto_click'
        AND timestamp >= now() - interval 7 day
        AND ${segment} IS NOT NULL
        AND element_path != ''
      GROUP BY segment, element
      ORDER BY segment, totalClicks DESC
    `;

    // 3. 연령 분포
    const ageGroupQuery = `
      SELECT 
        ${segment} AS segment,
        CASE
          WHEN user_age BETWEEN 10 AND 19 THEN '10s'
          WHEN user_age BETWEEN 20 AND 29 THEN '20s'
          WHEN user_age BETWEEN 30 AND 39 THEN '30s'
          WHEN user_age BETWEEN 40 AND 49 THEN '40s'
          WHEN user_age BETWEEN 50 AND 59 THEN '50s'
          ELSE '60s+'
        END AS ageGroup,
        count(DISTINCT user_id) AS count
      FROM klicklab.events
      WHERE event_name = 'auto_click'
        AND timestamp >= now() - interval 7 day
        AND ${segment} IS NOT NULL
        AND user_age IS NOT NULL
      GROUP BY segment, ageGroup
    `;

    // 4. 디바이스 분포
    const deviceQuery = `
      SELECT 
        ${segment} AS segment,
        device_type,
        count(DISTINCT user_id) AS count
      FROM klicklab.events
      WHERE event_name = 'auto_click'
        AND timestamp >= now() - interval 7 day
        AND ${segment} IS NOT NULL
        AND device_type != ''
      GROUP BY segment, device_type
    `;

    // 병렬 실행
    const [summaryRes, topElementsRes, ageGroupRes, deviceRes] = await Promise.all([
      clickhouse.query({ query: summaryQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: topElementsQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: ageGroupQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: deviceQuery, format: 'JSON' }).then(r => r.json())
    ]);

    const result = [];
    const topElementsBySegment = {};
    const ageDistBySegment = {};
    const deviceDistBySegment = {};

    // Top 요소 가공
    for (const row of topElementsRes.data) {
      const seg = row.segment;
      if (!topElementsBySegment[seg]) topElementsBySegment[seg] = [];
      topElementsBySegment[seg].push(row);
    }

    // 연령 분포 가공
    for (const row of ageGroupRes.data) {
      const seg = row.segment;
      if (!ageDistBySegment[seg]) ageDistBySegment[seg] = {};
      ageDistBySegment[seg][row.ageGroup] = row.count;
    }

    // 디바이스 분포 가공
    for (const row of deviceRes.data) {
      const seg = row.segment;
      if (!deviceDistBySegment[seg]) deviceDistBySegment[seg] = {};
      deviceDistBySegment[seg][row.device_type] = row.count;
    }

    // 종합 조립
    for (const row of summaryRes.data) {
      const seg = row.segment;
      const topList = (topElementsBySegment[seg] || []).slice(0, 3);
      const total = row.totalClicks;

      const topElements = topList.map(el => ({
        element: el.element,
        totalClicks: el.totalClicks,
        percentage: Math.round((el.totalClicks / total) * 1000) / 10,
        userCount: el.userCount
      }));

      result.push({
        segmentValue: seg,
        totalUsers: row.totalUsers,
        totalClicks: row.totalClicks,
        averageClicksPerUser: row.avgClicksPerUser,
        topElements,
        userDistribution: {
          ageGroup: ageDistBySegment[seg] || {},
          device: deviceDistBySegment[seg] || {}
        }
      });
    }

    res.status(200).json({ data: result });
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

router.get('/user-type-summary', async (req, res) => {
  try {
    const todayUserQuery = `
      SELECT DISTINCT user_id
      FROM events
      WHERE toDate(timestamp) = today()
        AND user_id IS NOT NULL
    `;

    const everUserQuery = `
      SELECT DISTINCT user_id
      FROM events
      WHERE toDate(timestamp) < today()
        AND user_id IS NOT NULL
    `;

    const [todayRes, everRes] = await Promise.all([
      clickhouse.query({ query: todayUserQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: everUserQuery, format: 'JSON' }).then(r => r.json()),
    ]);

    const todayUsers = new Set(todayRes.data.map(row => row.user_id));
    const everUsers = new Set(everRes.data.map(row => row.user_id));

    let newUser = 0, oldUser = 0;
    for (const user of todayUsers) {
      if (everUsers.has(user)) {
        oldUser++;
      } else {
        newUser++;
      }
    }

    res.status(200).json({
      data: [
        { type: '신규 유저', value: newUser },
        { type: '기존 유저', value: oldUser }
      ]
    });
  } catch (err) {
    console.error('User Type API ERROR:', err);
    res.status(500).json({ error: 'Failed to get user type data' });
  }
});

router.get('/os-type-summary', async (req, res) => {
  const query = `
    SELECT 
      device_os AS os, 
      count(DISTINCT user_id) AS users
    FROM events
    WHERE toDate(timestamp) = today() 
      AND user_id IS NOT NULL
    GROUP BY device_os
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();

    const osCategoryMap = {
      'Android': 'mobile',
      'iOS': 'mobile',
      'Windows': 'desktop',
      'macOS': 'desktop',
      'Linux': 'desktop',
    };

    const data = result.data.map(item => ({
      os: item.os,
      users: Number(item.users),
      category: osCategoryMap[item.os] || 'unknown',
    }));

    res.status(200).json({ data });
  } catch (err) {
    console.error('OS Type API ERROR:', err);
    res.status(500).json({ error: 'Failed to get os type data' });
  }
});

module.exports = router;
