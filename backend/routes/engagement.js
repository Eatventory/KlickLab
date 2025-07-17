const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

const PERIOD_MAP = {
  '1hour': `toDateTime('${isoNow}') - INTERVAL 1 HOUR`,
  '1day': `toDateTime('${isoNow}') - INTERVAL 1 DAY`,
  '1week': `toDateTime('${isoNow}') - INTERVAL 7 DAY`,
  '1month': `toDateTime('${isoNow}') - INTERVAL 1 MONTH`,
};

const SESSION_LENGTH_CLAUSE = {
  short: 'session_duration < 60',
  medium: 'session_duration >= 60 AND session_duration < 300',
  long: 'session_duration >= 300',
};

const PAGE_TYPE_CLAUSE = {
  landing: "page_path LIKE '/landing%'",
  product: "page_path LIKE '/product%'",
  checkout: "page_path LIKE '/checkout%'",
};

/* 페이지 체류시간 TOP 10 */
router.get('/page-times', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { period = '1day', pageType = 'all', sessionLength = 'all' } = req.query;

  const timeCondition = `timestamp >= ${PERIOD_MAP[period]}`;
  const pageTypeCondition = pageType !== 'all' ? `AND ${PAGE_TYPE_CLAUSE[pageType]}` : '';
  const sessionLengthCondition = sessionLength !== 'all'
    ? `AND session_id IN (
        SELECT session_id
        FROM (
          SELECT session_id, sum(time_on_page_seconds) AS session_duration
          FROM events
          WHERE ${timeCondition}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        )
        WHERE ${SESSION_LENGTH_CLAUSE[sessionLength]}
          AND sdk_key = '${sdk_key}'
      )` : '';

  const query = `
    SELECT
      page_path AS page,
      round(avg(time_on_page_seconds), 1) AS averageTime,
      count(*) AS visitCount
    FROM events
    WHERE ${timeCondition}
      ${pageTypeCondition}
      ${sessionLengthCondition}
      AND sdk_key = '${sdk_key}'
    GROUP BY page_path
    HAVING averageTime > 0
    ORDER BY averageTime DESC
    LIMIT 10
  `;

  try {
    const dataRes = await clickhouse.query({query, format: 'JSONEachRow'});
    const data = await dataRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Page Times API ERROR:", err);
    res.status(500).json({ error: "Failed to get page times data" });
  }
});

/* 이탈률 */
router.get("/bounce-rate", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
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
        WHERE date BETWEEN toDate('${localNow}') - 7 AND toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT
          page_path,
          page_views,
          page_exits
        FROM hourly_page_stats
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'

        UNION ALL

        SELECT
          page_path,
          page_views,
          page_exits
        FROM minutes_page_stats
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time < toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
      )
      GROUP BY page_path
      HAVING total_views > 100 AND bounce_rate > 0
      ORDER BY bounce_rate DESC
      LIMIT 10;
    `;
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json({ data: data });
  } catch (err) {
    console.error("Bounce Top API ERROR:", err);
    res.status(500).json({ error: "Failed to get bounce top data" });
  }
});

/* 페이지 조회수 */
router.get('/page-views', authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  const query = `
    SELECT
      page_path AS page,
      sum(page_views) AS totalViews
    FROM (
      SELECT
        page_path,
        page_views
      FROM hourly_page_stats
      WHERE date_time >= toDateTime('${todayStart}')
        AND date_time <= toDateTime('${oneHourFloor}')
        AND sdk_key = '${sdk_key}'

      UNION ALL

      SELECT
        page_path,
        page_views
      FROM minutes_page_stats
      WHERE date_time >= toDateTime('${NearestHourFloor}')
        AND date_time < toDateTime('${tenMinutesFloor}')
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY page
    HAVING totalViews > 0
    ORDER BY totalViews DESC
    LIMIT 10
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

module.exports = router;
