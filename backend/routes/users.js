const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const {
  buildFilterCondition,
  buildUserDistributionFilter,
} = require("../utils/filter");
const authMiddleware = require("../middlewares/authMiddleware");
const { formatLocalDateTime } = require("../utils/formatLocalDateTime");
const {
  getLocalNow,
  getIsoNow,
  floorToNearest10Min,
  getNearestHourFloor,
  getOneHourAgo,
  getTodayStart,
} = require("../utils/timeUtils");

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

const users_if = "DISTINCT if(user_id IS NULL, client_id, toString(user_id))";

router.get("/top-clicks", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const segment = req.query.filter;
    const validSegments = [
      "user_gender",
      "user_age",
      "traffic_source",
      "device_type",
    ];

    if (!validSegments.includes(segment)) {
      return res.status(400).json({ error: "Invalid user segment" });
    }

    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 6);
    const fromDateStr = fromDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // 1. 클릭 요약
    const summaryQuery = `
      SELECT
        segment_value AS segment,
        sum(total_clicks) AS totalClicks,
        sum(total_users) AS totalUsers,
        round(sum(total_clicks) / sum(total_users), 1) AS avgClicksPerUser
      FROM daily_click_summary
      WHERE segment_type = '${segment}' AND date >= toDate('${localNow}') - INTERVAL 6 DAY
        AND sdk_key = '${sdk_key}'
      GROUP BY segment
    `;

    // 2. Top 클릭 요소
    const topQuery = `
      SELECT
        segment_value AS segment,
        element,
        sum(total_clicks) AS totalClicks,
        sum(user_count) AS userCount
      FROM daily_top_elements
      WHERE segment_type = '${segment}' AND date >= toDate('${localNow}') - INTERVAL 6 DAY
        AND sdk_key = '${sdk_key}'
      GROUP BY segment, element
      ORDER BY segment, totalClicks DESC
    `;

    // 3. 유저 분포
    const distQuery = `
      SELECT
        segment_value AS segment,
        dist_type,
        dist_value,
        sum(user_count) AS count
      FROM daily_user_distribution
      WHERE segment_type = '${segment}' AND date >= toDate('${localNow}') - INTERVAL 6 DAY
        AND sdk_key = '${sdk_key}'
      GROUP BY segment, dist_type, dist_value
    `;

    const [summaryRes, topRes, distRes] = await Promise.all([
      clickhouse
        .query({ query: summaryQuery, format: "JSON" })
        .then((r) => r.json()),
      clickhouse
        .query({ query: topQuery, format: "JSON" })
        .then((r) => r.json()),
      clickhouse
        .query({ query: distQuery, format: "JSON" })
        .then((r) => r.json()),
    ]);

    // 분포 가공
    const ageDistBySegment = {};
    const deviceDistBySegment = {};
    for (const row of distRes.data) {
      const seg = row.segment;
      const distType = row.dist_type;
      const value = row.dist_value;
      const count = row.count;

      if (distType === "ageGroup") {
        if (!ageDistBySegment[seg]) ageDistBySegment[seg] = {};
        ageDistBySegment[seg][value] = count;
      } else if (distType === "device") {
        if (!deviceDistBySegment[seg]) deviceDistBySegment[seg] = {};
        deviceDistBySegment[seg][value] = count;
      }
    }

    // Top 요소 가공
    const topElementsBySegment = {};
    for (const row of topRes.data) {
      const seg = row.segment;
      if (!topElementsBySegment[seg]) topElementsBySegment[seg] = [];
      topElementsBySegment[seg].push(row);
    }

    // 종합 조립
    const result = [];
    for (const row of summaryRes.data) {
      const seg = row.segment;
      const topList = (topElementsBySegment[seg] || []).slice(0, 3);
      const total = row.totalClicks;

      const topElements = topList.map((el) => ({
        element: el.element,
        totalClicks: el.totalClicks,
        percentage:
          total > 0 ? Math.round((el.totalClicks / total) * 1000) / 10 : 0,
        userCount: el.userCount,
      }));

      result.push({
        segmentValue: seg,
        totalUsers: row.totalUsers,
        totalClicks: row.totalClicks,
        averageClicksPerUser: row.avgClicksPerUser,
        topElements,
        userDistribution: {
          ageGroup: ageDistBySegment[seg] || {},
          device: deviceDistBySegment[seg] || {},
        },
      });
    }

    res.status(200).json({ data: result });
  } catch (err) {
    console.error("Top Clicks API ERROR:", err);
    res.status(500).json({ error: "Failed to get top clicks data" });
  }
});

router.get("/user-type-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { period = "1day", userType = "all", device = "all" } = req.query;

  const condition = buildUserDistributionFilter({ period, userType, device });

  const query = `
    WITH union_data AS (
      SELECT * FROM hourly_user_distribution
      WHERE ${condition}
        AND date_time >= toDateTime('${todayStart}')
        AND date_time <= toDateTime('${oneHourFloor}')
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT * FROM minutes_user_distribution
      WHERE ${condition}
        AND date_time >= toDateTime('${NearestHourFloor}')
        AND date_time < toDateTime('${tenMinutesFloor}')
        AND sdk_key = '${sdk_key}'
    )
    SELECT
      dist_type,
      sum(user_count) AS count
    FROM union_data
    GROUP BY dist_type
  `;

  try {
    const result = await clickhouse
      .query({ query, format: "JSON" })
      .then((r) => r.json());
    const rows = result.data || [];

    const old_users = rows.find((r) => r.dist_type === "existing")?.count || 0;
    const new_users = rows.find((r) => r.dist_type === "new")?.count || 0;

    res.status(200).json({
      data: [
        { type: "신규 유저", value: Number(new_users) },
        { type: "기존 유저", value: Number(old_users) },
      ],
    });
  } catch (err) {
    console.error("User Type API ERROR:", err);
    res.status(500).json({ error: "Failed to get user type data" });
  }
});

router.get("/os-type-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { period, userType, device } = req.query;
  const condition = buildFilterCondition({ period, userType, device });

  const query = `
    SELECT 
      device_os AS os, 
      count(${users_if}) AS users
    FROM events
    WHERE user_id IS NOT NULL AND length(device_os) > 0 AND ${condition}
      AND sdk_key = '${sdk_key}'
    GROUP BY device_os
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: "JSON" });
    const result = await resultRes.json();

    const osCategoryMap = {
      Android: "mobile",
      iOS: "mobile",
      Windows: "desktop",
      macOS: "desktop",
      Linux: "desktop",
    };

    const data = result.data.map((item) => ({
      os: item.os,
      users: Number(item.users),
      category: osCategoryMap[item.os] || "unknown",
    }));

    res.status(200).json({ data });
  } catch (err) {
    console.error("OS Type API ERROR:", err);
    res.status(500).json({ error: "Failed to get os type data" });
  }
});

router.get("/browser-type-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { period, userType, device } = req.query;
  const condition = buildFilterCondition({ period, userType, device });

  const query = `
    SELECT 
      browser,
      device_type,
      count(${users_if}) AS users
    FROM events
    WHERE toDate(timestamp) = today()
      AND user_id IS NOT NULL AND ${condition}
      AND length(browser) > 0 AND length(device_type) > 0
      AND sdk_key = '${sdk_key}'
    GROUP BY browser, device_type
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: "JSON" });
    const result = await resultRes.json();

    const convertBrowser = (browser, deviceType) => {
      const mapping = {
        Chrome: { desktop: "Chrome", mobile: "Chrome Mobile" },
        Safari: { desktop: "Safari", mobile: "Safari Mobile" },
        Edge: { desktop: "Edge" },
        Firefox: { desktop: "Firefox" },
        "Samsung Internet": { mobile: "Samsung Internet" },
      };
      const name = mapping[browser]?.[deviceType] || "기타";
      const category = deviceType === "mobile" ? "mobile" : "desktop";
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
    console.error("Device Type API ERROR:", err);
    res.status(500).json({ error: "Failed to get device type data" });
  }
});

// 재방문율 = 최근 7일 중 2일 이상 방문한 user_id 수 ÷ 전체 방문 user_id 수
router.get("/returning", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { period, userType, device } = req.query;
  const periodDays = { "5min": 1, "1hour": 1, "1day": 1, "1week": 7 };
  const dayRange = periodDays[period] || 1;
  const deviceFilter = device !== "all" ? `AND device_type = '${device}'` : "";

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
        AND toDate(timestamp) BETWEEN today() - interval ${
          dayRange - 1
        } day AND today()
        AND sdk_key = '${sdk_key}'
      GROUP BY user_id
    )
  `;

  try {
    const resultRes = await clickhouse.query({ query, format: "JSON" });
    const result = await resultRes.json();
    const row = result.data[0] || { returning_users: 0, total_users: 0 };

    const rate =
      row.total_users > 0
        ? Math.round((row.returning_users / row.total_users) * 1000) / 10
        : 0;

    res.status(200).json({
      data: {
        returningUsers: Number(row.returning_users),
        totalUsers: Number(row.total_users),
        returnRatePercent: rate,
      },
    });
  } catch (err) {
    console.error("returning Rate API ERROR:", err);
    res.status(500).json({ error: "Failed to get returning rate data" });
  }
});

async function getBackwardPath(sdkKey, toPage, depth = 3) {
  let currentTarget = toPage;
  const path = [toPage];

  for (let i = 0; i < depth; i++) {
    const query = `
      SELECT source
      FROM funnel_links_daily
      WHERE event_date >= toDate('${localNow}') - INTERVAL 6 DAY
        AND target = '${currentTarget}'
        AND sdk_key = '${sdkKey}'
      GROUP BY source
      ORDER BY sum(sessions) DESC
      LIMIT 1;
    `;

    const res = await clickhouse
      .query({ query, format: "JSON" })
      .then((r) => r.json());
    const topSource = res.data?.[0]?.source;
    if (!topSource) break;

    path.unshift(topSource);
    currentTarget = topSource;
  }

  return path;
}

/* 전환자 공통 흐름 카드 */
router.get("/common-paths", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const toPage = req.query.to || "/checkout/success";

  try {
    const path = await getBackwardPath(sdk_key, toPage, 3);
    res.status(200).json({ success: true, data: path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "경로 추적 실패" });
  }
});

module.exports = router;
