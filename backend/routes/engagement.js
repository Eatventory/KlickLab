const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

const PERIOD_MAP = {
  '1hour': 'now() - INTERVAL 1 HOUR',
  '1day': 'now() - INTERVAL 1 DAY',
  '1week': 'now() - INTERVAL 7 DAY',
  '1month': 'now() - INTERVAL 1 MONTH',
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
    ORDER BY visitCount DESC
    LIMIT 100
  `;

  try {
    const data = await clickhouse.query(query).toPromise();
    res.status(200).json(data);
  } catch (err) {
    console.error("Page Times API ERROR:", err);
    res.status(500).json({ error: "Failed to get page times data" });
  }
});


module.exports = router;
