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

router.get('/browser-type-summary', async (req, res) => {
  const query = `
    SELECT 
      browser,
      device_type,
      count(DISTINCT user_id) AS users
    FROM events
    WHERE toDate(timestamp) = today()
      AND user_id IS NOT NULL
    GROUP BY browser, device_type
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();

    const convertBrowser = (browser, deviceType) => {
      if (browser === 'Chrome' && deviceType === 'mobile') return { name: 'Chrome Mobile', category: 'mobile' };
      if (browser === 'Safari' && deviceType === 'mobile') return { name: 'Safari Mobile', category: 'mobile' };
      if (browser === 'Chrome') return { name: 'Chrome', category: 'desktop' };
      if (browser === 'Safari') return { name: 'Safari', category: 'desktop' };
      if (browser === 'Edge') return { name: 'Edge', category: 'desktop' };
      if (browser === 'Firefox') return { name: 'Firefox', category: 'desktop' };
      if (browser === 'Samsung Internet') return { name: 'Samsung Internet', category: 'mobile' };
      return { name: '기타', category: deviceType === 'mobile' ? 'mobile' : 'desktop' };
    };

    const grouped = {};

    for (const row of result.data) {
      const { name, category } = convertBrowser(row.browser, row.device_type);
      if (!grouped[name]) {
        grouped[name] = { browser: name, users: 0, category };
      }
      grouped[name].users += Number(row.users);
    }

    res.status(200).json({ data: Object.values(grouped) });
  } catch (err) {
    console.error('Device Type API ERROR:', err);
    res.status(500).json({ error: 'Failed to get device type data' });
  }
});

// 재방문율 = 최근 7일 중 2일 이상 방문한 user_id 수 ÷ 전체 방문 user_id 수
router.get('/revisit', async (req, res) => {
  const query = `
    SELECT
      countIf(days_visited > 1) AS revisit_users,
      count() AS total_users
    FROM (
      SELECT
        user_id,
        count(DISTINCT toDate(timestamp)) AS days_visited
      FROM events
      WHERE user_id IS NOT NULL
        AND toDate(timestamp) BETWEEN today() - 6 AND today()
      GROUP BY user_id
    )
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();
    const row = result.data[0] || { revisit_users: 0, total_users: 0 };

    const rate = row.total_users > 0
      ? Math.round((row.revisit_users / row.total_users) * 1000) / 10
      : 0;

    res.status(200).json({
      data: {
        revisitUsers: Number(row.revisit_users),
        totalUsers: Number(row.total_users),
        returnRatePercent: rate
      }
    });
  } catch (err) {
    console.error('Revisit Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get revisit rate data' });
  }
});

module.exports = router;
