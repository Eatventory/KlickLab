const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const { buildFilterCondition } = require('../utils/filter');

router.get('/top-clicks', async (req, res) => {
  try {
    const segment = req.query.filter;
    const validSegments = ['user_gender', 'user_age', 'traffic_source', 'device_type'];

    // if (segment === 'gender') segment = 'user_gender';
    if (!validSegments.includes(segment)) {
      return res.status(400).json({ error: 'Invalid user segment' });
    }

    let segmentCase = segment;
    if (segment === 'user_gender') {
      segmentCase = `CASE
        WHEN user_gender = 'male' THEN 'male'
        WHEN user_gender = 'female' THEN 'female'
        ELSE 'unknown'
      END`;
    }
    else if (segment === 'user_age') {
      segmentCase = `CASE
        WHEN user_age BETWEEN 10 AND 19 THEN '10s'
        WHEN user_age BETWEEN 20 AND 29 THEN '20s'
        WHEN user_age BETWEEN 30 AND 39 THEN '30s'
        WHEN user_age BETWEEN 40 AND 49 THEN '40s'
        WHEN user_age BETWEEN 50 AND 59 THEN '50s'
        WHEN user_age >= 60 THEN '60s+'
        ELSE 'unknown'
      END`;
    }

    // 1. 세그먼트별 총 클릭 수, 유저 수, 평균 클릭 수
    // const baseFilter = `event_name = 'auto_click' AND toDate(timestamp) >= today() - 6 AND ${segment} IS NOT NULL`;
    const baseFilter = `event_name = 'auto_click' AND toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= toDate(toTimeZone(now(), 'Asia/Seoul')) - 6`;
    const summaryQuery = `
      SELECT 
        ${segmentCase} AS segment,
        count(*) AS totalClicks,
        count(DISTINCT client_id) AS totalUsers,
        round(count() / count(DISTINCT client_id), 1) AS avgClicksPerUser
      FROM events
      WHERE ${baseFilter}
      GROUP BY segment
    `;

    // 2. 세그먼트별 Top 요소 (상위 3개)
    const topElementsQuery = `
      SELECT *
      FROM (
        SELECT 
          ${segmentCase} AS segment,
          target_text AS element,
          count(*) AS totalClicks,
          count(DISTINCT client_id) AS userCount,
          row_number() OVER (PARTITION BY ${segmentCase} ORDER BY count(*) DESC) AS rn
        FROM events
        WHERE ${baseFilter} AND target_text != ''
        GROUP BY segment, element
      )
      WHERE rn <= 3
      ORDER BY segment, totalClicks DESC
    `;

    // 3. 연령 분포
    const ageGroupQuery = `
      SELECT 
        ${segmentCase} AS segment,
        CASE
          WHEN user_age BETWEEN 10 AND 19 THEN '10s'
          WHEN user_age BETWEEN 20 AND 29 THEN '20s'
          WHEN user_age BETWEEN 30 AND 39 THEN '30s'
          WHEN user_age BETWEEN 40 AND 49 THEN '40s'
          WHEN user_age BETWEEN 50 AND 59 THEN '50s'
          WHEN user_age >= 60 THEN '60s+'
          ELSE 'unknown'
        END AS ageGroup,
        count(DISTINCT client_id) AS count
      FROM events
      WHERE ${baseFilter} AND user_age IS NOT NULL
      GROUP BY segment, ageGroup
    `;

    // 4. 디바이스 분포
    const deviceQuery = `
      SELECT 
        ${segmentCase} AS segment,
        device_type,
        count(DISTINCT client_id) AS count
      FROM events
      WHERE ${baseFilter} AND device_type != ''
      GROUP BY segment, device_type
    `;

    // 병렬 실행
    const [summaryRes, topElementsRes, ageGroupRes, deviceRes] = await Promise.all([
      clickhouse.query({ query: summaryQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: topElementsQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: ageGroupQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: deviceQuery, format: 'JSON' }).then(r => r.json())
    ]);
    console.log("summaryRes: ", summaryRes.data);
    console.log("topElementsRes: ", topElementsRes.data);
    console.log("ageGroupRes: ", ageGroupRes.data);
    console.log("deviceRes: ", deviceRes.data);

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
    // console.log(result);
    res.status(200).json({ data: result });
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

router.get('/user-type-summary', async (req, res) => {
  try {
    const query = `
      WITH
        today_users AS (
          SELECT DISTINCT user_id
          FROM events
          WHERE toDate(timestamp) = today() AND user_id IS NOT NULL
        ),
        ever_users AS (
          SELECT DISTINCT user_id
          FROM events
          WHERE toDate(timestamp) < today() AND user_id IS NOT NULL
        )
      SELECT
        countIf(u IN (SELECT user_id FROM ever_users)) AS old_users,
        countIf(u NOT IN (SELECT user_id FROM ever_users)) AS new_users
      FROM today_users ARRAY JOIN [user_id] AS u
    `;

    const result = await clickhouse.query({ query, format: 'JSON' }).then(r => r.json());
    const row = result.data[0] || { new_users: 0, old_users: 0 };

    res.status(200).json({
      data: [
        { type: '신규 유저', value: Number(row.new_users) },
        { type: '기존 유저', value: Number(row.old_users) }
      ]
    });
  } catch (err) {
    console.error('User Type API ERROR:', err);
    res.status(500).json({ error: 'Failed to get user type data' });
  }
});

router.get('/os-type-summary', async (req, res) => {
  const { period, userType, device } = req.query;
  const condition = buildFilterCondition({ period, userType, device });

  const query = `
    SELECT 
      device_os AS os, 
      count(DISTINCT user_id) AS users
    FROM events
    WHERE user_id IS NOT NULL AND ${condition}
    GROUP BY device_os
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();

    const osCategoryMap = {
      'Android': 'mobile', 'iOS': 'mobile',
      'Windows': 'desktop', 'macOS': 'desktop', 'Linux': 'desktop',
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
  const { period, userType, device } = req.query;
  const condition = buildFilterCondition({ period, userType, device });

  const query = `
    SELECT 
      browser,
      device_type,
      count(DISTINCT user_id) AS users
    FROM events
    WHERE toDate(timestamp) = today()
      AND user_id IS NOT NULL AND ${condition}
    GROUP BY browser, device_type
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();

    const convertBrowser = (browser, deviceType) => {
      const mapping = {
        'Chrome': { desktop: 'Chrome', mobile: 'Chrome Mobile' },
        'Safari': { desktop: 'Safari', mobile: 'Safari Mobile' },
        'Edge': { desktop: 'Edge' },
        'Firefox': { desktop: 'Firefox' },
        'Samsung Internet': { mobile: 'Samsung Internet' },
      };
      const name = mapping[browser]?.[deviceType] || '기타';
      const category = deviceType === 'mobile' ? 'mobile' : 'desktop';
      return { name, category };
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
router.get('/returning', async (req, res) => {
  const { period, userType, device } = req.query;
  const periodDays = { '5min': 1, '1hour': 1, '1day': 1, '1week': 7 };
  const dayRange = periodDays[period] || 1;
  const deviceFilter = device !== 'all' ? `AND device_type = '${device}'` : '';

  const condition = `user_id IS NOT NULL ${deviceFilter}`;

  const query = `
    SELECT
      countIf(days_visited > 1) AS returning_users,
      count() AS total_users
    FROM (
      SELECT
        user_id,
        count(DISTINCT toDate(timestamp)) AS days_visited
      FROM events
      WHERE ${condition}
        AND toDate(timestamp) BETWEEN today() - interval ${dayRange - 1} day AND today()
      GROUP BY user_id
    )
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: 'JSON' });
    const result = await resultRes.json();
    const row = result.data[0] || { returning_users: 0, total_users: 0 };

    const rate = row.total_users > 0
      ? Math.round((row.returning_users / row.total_users) * 1000) / 10
      : 0;

    res.status(200).json({
      data: {
        returningUsers: Number(row.returning_users),
        totalUsers: Number(row.total_users),
        returnRatePercent: rate
      }
    });
  } catch (err) {
    console.error('returning Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get returning rate data' });
  }
});

module.exports = router;
