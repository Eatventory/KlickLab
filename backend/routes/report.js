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

  const todayQuery = `
    SELECT
      coalesce(sum(visitors), 0) AS visitors,
      coalesce(sum(new_visitors), 0) AS new_visitors,
      coalesce(sum(existing_visitors), 0) AS existing_visitors
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
    ) AS today_data
  `;

  const yesterdayQuery = `
    SELECT
      visitors,
      new_visitors,
      existing_visitors
    FROM klicklab.daily_metrics
    WHERE date = toDate('${localNow}') - INTERVAL 1 DAY
      AND sdk_key = '${sdk_key}'
  `;

  const weekagoQuery = `
    SELECT
      visitors,
      new_visitors,
      existing_visitors
    FROM klicklab.daily_metrics
    WHERE date = toDate('${localNow}') - INTERVAL 7 DAY
      AND sdk_key = '${sdk_key}'
  `;

  try {
    const [todayRes, yesterdayRes, weekagoRes] = await Promise.all([
      clickhouse.query({ query: todayQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: yesterdayQuery, format: 'JSON' }).then(r => r.json()),
      clickhouse.query({ query: weekagoQuery, format: 'JSON' }).then(r => r.json()),
    ]);

    const todayData = todayRes.data?.[0] || {};
    const yesterdayData = yesterdayRes.data?.[0] || {};
    const weekagoData = weekagoRes.data?.[0] || {};

    const {
      visitors: daily_visitors = 0,
      new_visitors: new_users = 0,
      existing_visitors: returning_users = 0
    } = todayData;
    
    const {
      visitors: daily_visitors_prev = 0,
      new_visitors: new_users_prev = 0,
      existing_visitors: returning_users_prev = 0
    } = yesterdayData;
    
    const {
      visitors: daily_visitors_week = 0,
      new_visitors: new_users_week = 0,
      existing_visitors: returning_users_week = 0
    } = weekagoData;

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
