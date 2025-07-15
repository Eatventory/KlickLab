const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const authMiddleware = require('../middlewares/authMiddleware');
const { formatLocalDateTime } = require('../utils/formatLocalDateTime');
const { getLocalNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

router.get("/kpi-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  const query = `
    WITH
      today_total AS (
        SELECT
          sum(visitors) AS visitors,
          sum(new_visitors) AS new_visitors,
          sum(existing_visitors) AS existing_visitors
        FROM (
          SELECT * FROM klicklab.hourly_metrics
          WHERE date_time >= toDateTime('${todayStart}')
            AND date_time <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}'
          UNION ALL
          SELECT * FROM klicklab.minutes_metrics
          WHERE date_time >= toDateTime('${NearestHourFloor}')
            AND date_time < toDateTime('${tenMinutesFloor}')
            AND sdk_key = '${sdk_key}'
        ) AS merged_today
      ),
      yesterday AS (
        SELECT * FROM klicklab.daily_metrics
        WHERE date = toDate('${localNow}') - INTERVAL 1 DAY
          AND sdk_key = '${sdk_key}'
      ),
      weekago AS (
        SELECT * FROM klicklab.daily_metrics
        WHERE date = toDate('${localNow}') - INTERVAL 7 DAY
          AND sdk_key = '${sdk_key}'
      )

    SELECT
      today_total.visitors AS daily_visitors,
      yesterday.visitors AS daily_visitors_prev,
      weekago.visitors AS daily_visitors_week,

      today_total.new_visitors AS new_users,
      yesterday.new_visitors AS new_users_prev,
      weekago.new_visitors AS new_users_week,

      today_total.existing_visitors AS returning_users,
      yesterday.existing_visitors AS returning_users_prev,
      weekago.existing_visitors AS returning_users_week
    FROM today_total
    CROSS JOIN yesterday
    CROSS JOIN weekago
  `;

  try {
    const response = await clickhouse.query({ query, format: "JSON" });
    const json = await response.json();
    const [data = {}] = json.data || [];

    const {
      daily_visitors = 0,
      daily_visitors_prev = 0,
      daily_visitors_week = 0,
      new_users = 0,
      new_users_prev = 0,
      new_users_week = 0,
      returning_users = 0,
      returning_users_prev = 0,
      returning_users_week = 0,
    } = data;

    const getDiff = (cur, prev) => {
      if (!prev || prev === 0) return 0;
      return (((cur - prev) / prev) * 100).toFixed(1);
    };

    res.json({
      reference_date: localNow,
      daily_visitors: {
        current: daily_visitors,
        vs_yesterday: `${getDiff(daily_visitors, daily_visitors_prev)}%`,
        vs_last_week: `${getDiff(daily_visitors, daily_visitors_week)}%`,
      },
      new_users: {
        current: new_users,
        vs_yesterday: `${getDiff(new_users, new_users_prev)}%`,
        vs_last_week: `${getDiff(new_users, new_users_week)}%`,
      },
      returning_users: {
        current: returning_users,
        vs_yesterday: `${getDiff(returning_users, returning_users_prev)}%`,
        vs_last_week: `${getDiff(returning_users, returning_users_week)}%`,
      },
      churned_users: {
        current: 0,
        vs_yesterday: `0%`,
        vs_last_week: `0%`,
      },
    });
  } catch (err) {
    console.error('[ERROR] KPI 요약 실패:', err);
    res.status(500).json({ message: "KPI 요약 조회 실패" });
  }
});

module.exports = router;
