const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');
const authMiddleware = require('../middlewares/authMiddleware');
const dayjs = require("dayjs");

router.get("/kpi-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  const today = dayjs().startOf("day");
  const dates = {
    today: today.format("YYYY-MM-DD"),
    yesterday: today.subtract(1, "day").format("YYYY-MM-DD"),
    weekAgo: today.subtract(7, "day").format("YYYY-MM-DD"),
  };

  const query = `
  WITH
    today_data AS (
    SELECT *
    FROM daily_metrics
    WHERE date = toDate('${dates.today}')
      AND sdk_key = '${sdk_key}'
    ),
    yesterday_data AS (
    SELECT *
    FROM daily_metrics
    WHERE date = toDate('${dates.yesterday}')
      AND sdk_key = '${sdk_key}'
    ),
    weekago_data AS (
    SELECT *
    FROM daily_metrics
    WHERE date = toDate('${dates.weekAgo}')
      AND sdk_key = '${sdk_key}'
    )
  SELECT
    today_data.visitors AS daily_visitors,
    yesterday_data.visitors AS daily_visitors_prev,
    weekago_data.visitors AS daily_visitors_week,

    today_data.new_visitors AS new_users,
    yesterday_data.new_visitors AS new_users_prev,
    weekago_data.new_visitors AS new_users_week,

    today_data.existing_visitors AS returning_users,
    yesterday_data.existing_visitors AS returning_users_prev,
    weekago_data.existing_visitors AS returning_users_week
  FROM today_data
  JOIN yesterday_data
  JOIN weekago_data
  `;

  try {
    const [data] = await clickhouse.query(query).toPromise();
    const {
      daily_visitors,
      daily_visitors_prev,
      daily_visitors_week,
      new_users,
      new_users_prev,
      new_users_week,
      returning_users,
      returning_users_prev,
      returning_users_week,
    } = data;

    const getDiff = (cur, prev) => {
      if (prev === 0) return 0;
      return (((cur - prev) / prev) * 100).toFixed(1);
    };

    res.json({
      daily_visitors: {
        current: daily_visitors,
        vs_yesterday: `${getDiff(
          daily_visitors,
          daily_visitors_prev
        )}%`,
        vs_last_week: `${getDiff(
          daily_visitors,
          daily_visitors_week
        )}%`,
      },
      new_users: {
        current: new_users,
        vs_yesterday: `${getDiff(new_users, new_users_prev)}%`,
        vs_last_week: `${getDiff(new_users, new_users_week)}%`,
      },
      returning_users: {
        current: returning_users,
        vs_yesterday: `${getDiff(
          returning_users,
          returning_users_prev
        )}%`,
        vs_last_week: `${getDiff(
          returning_users,
          returning_users_week
        )}%`,
      },
      churned_users: {
        current: 0, // 추후 구현 필요
        vs_yesterday: `0%`,
        vs_last_week: `0%`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "KPI 요약 조회 실패" });
  }
});

module.exports = router;
