const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

function buildQueryWhereClause (table = "minutes", startDate, endDate) {
  if (!startDate || !endDate) return '1 = 1';

  if (table === "daily") {
    return `date BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
  } else {
    return `date_time BETWEEN toDateTime('${startDate} 00:00:00') AND toDateTime('${endDate} 23:59:59')`;
  }
}

router.get('/overview', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const [avgSessionTimeRes, sessionsPerUserRes] = await Promise.all([
      clickhouse.query({
        query: `
          SELECT
            toDate(date_time) AS date,
            round(avg(avg_session_seconds), 2) AS avgSessionSeconds
          FROM (
            SELECT cast(date AS DateTime) AS date_time, avg_session_seconds FROM daily_metrics
            WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
            UNION ALL
            SELECT date_time, avg_session_seconds FROM hourly_metrics
            WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
            UNION ALL
            SELECT date_time, avg_session_seconds FROM minutes_metrics
            WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
          )
          GROUP BY date
          ORDER BY date ASC
        `,
        format: 'JSON',
      }).then(r => r.json()),
      
      clickhouse.query({
        query: `
          SELECT
            toDate(date_time) AS date,
            sum(visitors) AS totalVisitors,
            sum(clicks) AS totalClicks,
            round(sum(clicks) / nullIf(sum(visitors), 0), 2) AS sessionsPerUser
          FROM (
            SELECT cast(date AS DateTime) AS date_time, clicks, visitors FROM daily_metrics
            WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
            UNION ALL
            SELECT date_time, clicks, visitors FROM hourly_metrics
            WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
            UNION ALL
            SELECT date_time, clicks, visitors FROM minutes_metrics
            WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
              AND sdk_key = '${sdk_key}'
          )
          GROUP BY date
          ORDER BY date ASC
        `,
        format: 'JSON',
      }).then(r => r.json()),
    ]);

    res.status(200).json({
      success: true,
      data: {
        avgSessionSeconds: avgSessionTimeRes.data.map(d => ({
          date: d.date,
          avgSessionSeconds: Number(d.avgSessionSeconds),
        })),
        sessionsPerUser: sessionsPerUserRes.data.map(d => ({
          date: d.date,
          totalVisitors: Number(d.totalVisitors),
          totalClicks: Number(d.totalClicks),
          sessionsPerUser: Number(d.sessionsPerUser),
        })),
      },
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Query failed' });
  }
});

/* 페이지 체류시간 */
router.get('/page-times', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  const query = `
    SELECT
      page_path AS page,
      round(sum(avg_time_on_page_seconds * page_views) / sum(page_views), 1) AS averageTime
    FROM (
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM daily_page_stats
      WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM hourly_page_stats
      WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM minutes_page_stats
      WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY page
    ORDER BY averageTime DESC
    LIMIT ${limit}
  `;

  try {
    const dataRes = await clickhouse.query({ query, format: 'JSONEachRow' });
    const data = await dataRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Page Times (Simple) API ERROR:", err);
    res.status(500).json({ error: "Failed to get page time data" });
  }
});

/* 이탈률 */
router.get("/bounce-rate", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  try {
    const query = `
      SELECT
        page_path,
        sum(page_views) AS total_views,
        sum(page_exits) AS total_exits,
        round(total_exits / total_views * 100, 1) AS bounce_rate
      FROM (
        SELECT
          page_path,
          page_views,
          page_exits
        FROM daily_page_stats
        WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT
          page_path,
          page_views,
          page_exits
        FROM hourly_page_stats
        WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT
          page_path,
          page_views,
          page_exits
        FROM minutes_page_stats
        WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
          AND sdk_key = '${sdk_key}'
      )
      GROUP BY page_path
      HAVING total_views > 100 AND bounce_rate > 0
      ORDER BY bounce_rate DESC
      LIMIT ${limit}
    `;
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Bounce Top API ERROR:", err);
    res.status(500).json({ error: "Failed to get bounce top data" });
  }
});

/* 페이지 조회수 */
router.get('/page-views', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate, limit = 10 } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  const query = `
    SELECT
      page_path AS page,
      sum(page_views) AS totalViews
    FROM (
      SELECT page_path, page_views
      FROM daily_page_stats
      WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views
      FROM hourly_page_stats
      WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views
      FROM minutes_page_stats
      WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY page
    HAVING totalViews > 0
    ORDER BY totalViews DESC
    LIMIT ${limit}
  `;

  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    let data = await dataRes.json();
    data = data.map(item => ({
      ...item,
      totalViews: Number(item.totalViews),
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error("Page Times API ERROR:", err);
    res.status(500).json({ error: "Failed to get page times data" });
  }
});

/* 전체 조회수 */
router.get('/view-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  const query = `
    SELECT
      date,
      sum(views) AS totalViews
    FROM (
      SELECT date, sum(page_views) AS views
      FROM daily_page_stats
      WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      GROUP BY date
      UNION ALL
      SELECT toDate(date_time) AS date, sum(page_views) AS views
      FROM hourly_page_stats
      WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      GROUP BY toDate(date_time)
      UNION ALL
      SELECT toDate(date_time) AS date, sum(page_views) AS views
      FROM minutes_page_stats
      WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      GROUP BY toDate(date_time)
    )
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    let data = await dataRes.json();
    data = data.map(item => ({
      ...item,
      totalViews: Number(item.totalViews),
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error("View Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get view counts data" });
  }
});

/* 전체 클릭수 */
router.get('/click-counts', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  const query = `
    SELECT
      toDate(date_time) AS date,
      sum(clicks) AS totalClicks
    FROM (
      SELECT cast(date AS DateTime) AS date_time, clicks FROM daily_metrics
      WHERE ${buildQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT date_time, clicks FROM hourly_metrics
      WHERE ${buildQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT date_time, clicks FROM minutes_metrics
      WHERE ${buildQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY date
    ORDER BY date ASC
  `;

  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    let data = await dataRes.json();
    data = data.map(item => ({
      ...item,
      totalClicks: Number(item.totalClicks),
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error("Click Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get click counts data" });
  }
});

/* 시간 경과에 따른 사용자 활동 */
router.get('/users-over-time', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });

  const query = `
    SELECT
      d1.date AS base_date,
      any(d1.visitors) AS daily_users,
      sumIf(d2.visitors, d2.date BETWEEN d1.date - INTERVAL 6 DAY AND d1.date) AS weekly_users,
      sumIf(d2.visitors, d2.date BETWEEN d1.date - INTERVAL 29 DAY AND d1.date) AS monthly_users
    FROM daily_metrics d1
    LEFT JOIN daily_metrics d2 ON d1.sdk_key = d2.sdk_key
    WHERE d1.sdk_key = '${sdk_key}'
      AND d1.date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY d1.date
    ORDER BY base_date ASC
  `;

  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    let data = await dataRes.json();
    data = data.map(item => ({
      date: item.base_date,
      dailyUsers: Number(item.daily_users),
      weeklyUsers: Number(item.weekly_users),
      monthlyUsers: Number(item.monthly_users),
    }));
    res.status(200).json(data);
  } catch (err) {
    console.error("Click Counts API ERROR:", err);
    res.status(500).json({ error: "Failed to get click counts data" });
  }
});

module.exports = router;
