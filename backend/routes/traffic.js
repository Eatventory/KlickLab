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

    // 집계 단위별 기간 보정
    let startDate, endDate;
    if (period === 'weekly') {
      // 최근 6주: 6주 전 월요일 ~ 이번주 일요일
      const nowDay = now.getDay() || 7;
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - nowDay + 1);
      const sixWeeksAgoMonday = new Date(thisMonday);
      sixWeeksAgoMonday.setDate(thisMonday.getDate() - 35); // 5주 전 + 이번주 = 6주
      startDate = new Date(sixWeeksAgoMonday.setHours(0,0,0,0));
      endDate = new Date(thisMonday);
      endDate.setDate(thisMonday.getDate() + 6); // 이번주 일요일
      endDate.setHours(23,59,59,999);
    } else if (period === 'monthly') {
      // 최근 12개월: 12개월 전 1일 ~ 이번달 말일
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = new Date(firstOfThisMonth);
      startDate.setMonth(firstOfThisMonth.getMonth() - 11);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // 이번달 말일
    } else {
      // 일별/시간별: 기존 로직 유지
      startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = now;
    }
    const startDateStr = startDate.toISOString().slice(0, 19).replace("T", " ");
    const endDateStr = endDate.toISOString().slice(0, 19).replace("T", " ");

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
      weekly: "concat(formatDateTime(timestamp, '%Y-%m'), '-', toString(toRelativeWeekNum(timestamp) - toRelativeWeekNum(toStartOfMonth(timestamp)) + 1), '주차')",
      monthly: "formatDateTime(timestamp, '%Y-%m')",
    }[period];
    
    // 방문자 추이 쿼리 (unique user_id, total count)
    let visitorTrendQuery;
    if (period === 'weekly') {
      // 주별 집계 쿼리 (date_str을 '7월 1주차' 등 한글로 생성)
      visitorTrendQuery = `
        SELECT
          concat(formatDateTime(timestamp, '%m'), '월 ', toString(toRelativeWeekNum(timestamp) - toRelativeWeekNum(toStartOfMonth(timestamp)) + 1), '주차') AS date_str,
          toUInt64(countDistinct(client_id)) AS visitors
        FROM events
        WHERE ${whereClause}
        GROUP BY date_str
        ORDER BY date_str ASC
      `;
    } else if (period === 'monthly') {
      // 월별 집계 쿼리 (today 변수 없이 visitors만 집계)
      visitorTrendQuery = `
        SELECT
          formatDateTime(timestamp, '%Y-%m') AS date_str,
          toUInt64(countDistinct(client_id)) AS visitors
        FROM events
        WHERE ${whereClause}
        GROUP BY date_str
        ORDER BY date_str ASC
      `;
    } else {
      visitorTrendQuery = `
        WITH 
          toDate(toTimeZone(parseDateTimeBestEffort('${todayStr}'), 'Asia/Seoul')) AS today,
          past_clients AS (
            SELECT DISTINCT client_id
            FROM events
            WHERE timestamp < today
          )
        SELECT
          ${formatExpr} AS date_str,
          toUInt64(visitors) AS visitors,
          toUInt64(new_visitors) AS newVisitors,
          toUInt64(visitors - new_visitors) AS returningVisitors
        FROM daily_metrics
        WHERE date < today
          AND date >= toDate(toTimeZone(parseDateTimeBestEffort('${startDateStr}'), 'Asia/Seoul'))
        UNION ALL
        SELECT
          ${eventFormatExpr} AS date_str,
          toUInt64(countDistinct(client_id)) AS visitors,
          toUInt64(countDistinctIf(client_id, client_id NOT IN past_clients)) AS newVisitors,
          toUInt64(countDistinct(client_id) - countDistinctIf(client_id, client_id NOT IN past_clients)) AS returningVisitors
        FROM events
        WHERE 
          toDate(timestamp) = today
          AND event_name = 'auto_click'
          ${gender !== "all" ? `AND user_gender = '${gender}'` : ""}
          ${ageGroup !== "all" ? `AND ${getAgeCondition(ageGroup)}` : ""}
        GROUP BY date_str
        ORDER BY date_str ASC
      `;
    }
    const visitorTrendResult = await clickhouse.query({
      query: visitorTrendQuery,
      format: "JSON",
    });
    const visitorTrendJson = await visitorTrendResult.json();
    let visitorTrend = visitorTrendJson.data.map((row) => ({
      date: row.date_str || row.date,
      visitors: Number(row.visitors),
      newVisitors: period === 'daily' ? Number(row.newVisitors) : 0,
      returningVisitors: period === 'daily' ? Number(row.returningVisitors) : 0,
    }));

    // x축 보정: 기간별로 항상 일정 개수 보장 (hourly: 24, weekly: 6, monthly: 12, daily: 7)
    if (period === 'hourly') {
      // 24시간 key 생성 (끝이 현재 시각)
      const currentHour = now.getHours();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hours = [];
      for (let i = 23; i >= 0; i--) {
        const hour = (currentHour - i + 24) % 24;
        const dateStr = `${todayStr} ${String(hour).padStart(2, '0')}`;
        hours.push(dateStr);
      }
      visitorTrend = hours.map(dateStr => {
        const found = visitorTrend.find(d => d.date === dateStr);
        return found || { date: dateStr, visitors: 0, newVisitors: 0, returningVisitors: 0 };
      });
    } else if (period === 'weekly') {
      // 최근 6주 주차 key 생성 및 데이터 없는 주는 0으로 보정
      const weeks = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const firstDayOfWeek = firstOfMonth.getDay() || 7;
        const weekOfMonth = Math.ceil((d.getDate() + firstDayOfWeek - 1) / 7);
        weeks.push(`${month}월 ${weekOfMonth}주차`);
      }
      // 6주 데이터 보정
      visitorTrend = weeks.map(label => {
        const found = visitorTrend.find(d => d.date === label);
        return found || { date: label, visitors: 0, newVisitors: 0, returningVisitors: 0 };
      });
    } else if (period === 'monthly') {
      // 최근 12개월 key 생성
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
      }
      visitorTrend = months.map(monthStr => {
        const found = visitorTrend.find(d => d.date === monthStr);
        return found || { date: monthStr, visitors: 0, newVisitors: 0, returningVisitors: 0 };
      });
    } else if (period === 'daily' && visitorTrend.length > 7) {
      visitorTrend = visitorTrend.slice(-7);
    }

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
    let hourlyTraffic = hourlyTrafficJson.data.map((row) => ({
      hour: row.hour,
      visitors: Number(row.visitors),
    }));
    // 24시간 보정 (데이터 없는 시간 0으로)
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    hourlyTraffic = hours.map(hour => {
      const found = hourlyTraffic.find(d => d.hour === hour);
      return found || { hour, visitors: 0 };
    });

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

