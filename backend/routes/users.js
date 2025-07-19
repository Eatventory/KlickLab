const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { formatLocalDateTime } = require("../utils/formatLocalDateTime");
const { getLocalNow } = require("../utils/timeUtils");

const localNow = getLocalNow();

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

module.exports = router;
