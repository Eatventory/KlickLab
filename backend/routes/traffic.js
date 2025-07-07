const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

function getAgeCondition(ageGroup) {
  switch (ageGroup) {
    case "10s": return "user_age >= 10 AND user_age < 20";
    case "20s": return "user_age >= 20 AND user_age < 30";
    case "30s": return "user_age >= 30 AND user_age < 40";
    case "40s": return "user_age >= 40 AND user_age < 50";
    case "50s": return "user_age >= 50 AND user_age < 60";
    case "60s+": return "user_age >= 60";
    default: return "";
  }
}

/* Traffic 탭 통합 API */
router.get("/", async (req, res) => {
  try {
    const {
      period = "daily",
      gender = "all",
      ageGroup = "all",
    } = req.query;
    const now = new Date();

    const startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().slice(0, 19).replace("T", " ");

    const endDateStr = now.toISOString().slice(0, 19).replace("T", " ");

    // 필터 WHERE 조건 생성
    let where = [
      `timestamp >= toDateTime('${startDateStr}')`,
      `timestamp <= toDateTime('${endDateStr}')`,
      `event_name = 'auto_click'`,
    ];
    if (gender !== "all") {
      where.push(`user_gender = '${gender}'`);
    }
    if (ageGroup !== "all") {
      const ageCond = getAgeCondition(ageGroup);
      if (ageCond) where.push(ageCond);
    }
    const whereClause = where.join(" AND ");

    const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const formatExpr = {
      daily: "formatDateTime(date, '%Y-%m-%d')",
      hourly: "formatDateTime(date, '%Y-%m-%d')",
      weekly: "formatDateTime(date, '%Y-%m-%d')",
      monthly: "formatDateTime(date, '%Y-%m-%d')",
    }[period];
    const eventFormatExpr = {
      daily: "formatDateTime(timestamp, '%Y-%m-%d')",
      hourly: "formatDateTime(timestamp, '%Y-%m-%d %H:00')",
      weekly: "concat(toString(toISOYear(timestamp)), '-', lpad(toString(toISOWeek(timestamp)), 2, '0'))",
      monthly: "formatDateTime(timestamp, '%Y-%m')",
    }[period];
    
    // 방문자 추이 쿼리 (unique user_id, total count)
    const visitorTrendQuery = `
      WITH toDate('${todayStr}') AS today
      , past_clients AS (
        SELECT DISTINCT client_id
        FROM events
        WHERE timestamp < today
      )
      SELECT
        ${formatExpr} AS date_str,
        toUInt64(visitors) AS visitors,
        toUInt64(new_visitors) AS newVisitors,
        toUInt64(visitors - new_visitors) AS returningVisitors
      FROM klicklab.daily_metrics
      WHERE date < today
        AND date >= toDate('${startDateStr}')
      UNION ALL
      SELECT
        ${eventFormatExpr} AS date_str,
        toUInt64(countDistinct(client_id)) AS visitors,
        toUInt64(countDistinctIf(client_id, client_id NOT IN past_clients)) AS newVisitors,
        toUInt64(countDistinct(client_id) - countDistinctIf(client_id, client_id NOT IN past_clients)) AS returningVisitors
      FROM klicklab.events
      WHERE 
        toDate(timestamp) = today
        AND event_name = 'auto_click'
        ${gender !== "all" ? `AND user_gender = '${gender}'` : ""}
        ${ageGroup !== "all" ? `AND ${getAgeCondition(ageGroup)}` : ""}
      GROUP BY date_str
      ORDER BY date_str ASC
    `;
    const visitorTrendResult = await clickhouse.query({
      query: visitorTrendQuery,
      format: "JSON",
    });
    const visitorTrendJson = await visitorTrendResult.json();
    const visitorTrend = visitorTrendJson.data.map((row) => ({
      date: row.date,
      visitors: Number(row.visitors),
      newVisitors: Number(row.newVisitors),
      returningVisitors: Number(row.returningVisitors),
    }));

    // 시간대별 유입 분포 쿼리 (hourlyTraffic)
    const hourlyTrafficQuery = `
    SELECT
      formatDateTime(timestamp, '%H') AS hour,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
    GROUP BY hour
    ORDER BY hour ASC
    `;
    const hourlyTrafficResult = await clickhouse.query({
      query: hourlyTrafficQuery,
      format: "JSON",
    });
    const hourlyTrafficJson = await hourlyTrafficResult.json();
    const hourlyTraffic = hourlyTrafficJson.data.map((row) => ({
      hour: row.hour,
      visitors: Number(row.visitors),
    }));

    // 유입 채널 분포 쿼리 (traffic_source 기준)
    const sourceDistQuery = `
    SELECT
      traffic_source AS source,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
    GROUP BY source
    ORDER BY visitors DESC
    LIMIT 10
    `;
    const sourceDistResult = await clickhouse.query({
      query: sourceDistQuery,
      format: "JSON",
    });
    const sourceDistJson = await sourceDistResult.json();
    const sourceDistribution = sourceDistJson.data.map((row) => ({
      source: row.source || "(없음)",
      visitors: Number(row.visitors),
    }));

    // 유입 매체 분포 쿼리 (traffic_medium 기준)
    const mediumDistQuery = `
    SELECT
      traffic_medium AS medium,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
    GROUP BY medium
    ORDER BY visitors DESC
    LIMIT 10
    `;
    const mediumDistResult = await clickhouse.query({
      query: mediumDistQuery,
      format: "JSON",
    });
    const mediumDistJson = await mediumDistResult.json();
    const mediumDistribution = mediumDistJson.data.map((row) => ({
      medium: row.medium || "(없음)",
      visitors: Number(row.visitors),
    }));

    // 캠페인 분포 쿼리 (traffic_campaign 기준)
    const campaignDistQuery = `
    SELECT
      traffic_campaign AS campaign,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
    GROUP BY campaign
    ORDER BY visitors DESC
    LIMIT 10
    `;
    const campaignDistResult = await clickhouse.query({
      query: campaignDistQuery,
      format: "JSON",
    });
    const campaignDistJson = await campaignDistResult.json();
    const campaignDistribution = campaignDistJson.data.map((row) => ({
      campaign: row.campaign || "(없음)",
      visitors: Number(row.visitors),
    }));

    // 리퍼러 분포 쿼리 (referrer 기준)
    const referrerDistQuery = `
    SELECT
      referrer,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
    GROUP BY referrer
    ORDER BY visitors DESC
    LIMIT 10
    `;
    const referrerDistResult = await clickhouse.query({
      query: referrerDistQuery,
      format: "JSON",
    });
    const referrerDistJson = await referrerDistResult.json();
    const referrerDistribution = referrerDistJson.data.map((row) => ({
      referrer: row.referrer || "(없음)",
      visitors: Number(row.visitors),
    }));

    // 메인 페이지에서 이동하는 페이지 Top 10 쿼리
    const mainPageNavQuery = `
    SELECT
      page_path AS page,
      count() AS clicks,
      uniq(user_id) AS uniqueClicks
    FROM events
    WHERE ${whereClause} AND page_path != '/'
    GROUP BY page
    ORDER BY clicks DESC
    LIMIT 10
    `;
    const mainPageNavResult = await clickhouse.query({
      query: mainPageNavQuery,
      format: "JSON",
    });
    const mainPageNavJson = await mainPageNavResult.json();
    const mainPageNavigation = mainPageNavJson.data.map((row, idx) => ({
      name: row.page,
      page: row.page,
      clicks: Number(row.clicks),
      uniqueClicks: Number(row.uniqueClicks),
      clickRate: 0, // 필요시 계산
      avgTimeToClick: 0, // 필요시 계산
      rank: idx + 1,
      id: (idx + 1).toString(),
    }));

    res.status(200).json({
      visitorTrend,
      mainPageNavigation,
      filters: { period, gender, ageGroup },
      hourlyTraffic, // entryPageDistribution은 traffic_source 기준으로 변경
      entryPageDistribution: sourceDistribution,
      mediumDistribution,
      campaignDistribution,
      referrerDistribution,
    });
  } catch (err) {
    console.error("Traffic Dashboard API ERROR:", err);
    res.status(500).json({ error: "Failed to get traffic dashboard data" });
  }
});

module.exports = router;
