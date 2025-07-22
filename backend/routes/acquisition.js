const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
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
const { buildQueryWhereClause } = require("../utils/queryUtils");
const { getConversionRate } = require("../utils/conversionUtils");

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

// [1] KPI 데이터
router.get("/overview", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `date >= toDate('${startDate}') AND date <= toDate('${endDate}')`
        : buildQueryWhereClause("daily", 7);

    const activeUsersQuery = `
      SELECT sum(visitors) as active_users
      FROM daily_metrics
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
    `;

    const newUsersQuery = `
      SELECT sum(new_visitors) AS new_users
      FROM daily_metrics
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
    `;

    const realtimeUsersQuery = `
      SELECT count(distinct user_id) as realtime_users
      FROM events
      WHERE timestamp >= now() - INTERVAL 5 MINUTE
        AND sdk_key = '${sdk_key}'
    `;

    const [activeUsersRes, newUsersRes, realtimeUsersRes] = await Promise.all([
      clickhouse
        .query({ query: activeUsersQuery, format: "JSON" })
        .then((r) => r.json()),
      clickhouse
        .query({ query: newUsersQuery, format: "JSON" })
        .then((r) => r.json()),
      clickhouse
        .query({ query: realtimeUsersQuery, format: "JSON" })
        .then((r) => r.json()),
    ]);

    res.status(200).json({
      active_users: Number(activeUsersRes.data[0]?.active_users || 0),
      new_users: Number(newUsersRes.data[0]?.new_users || 0),
      realtime_users: Number(realtimeUsersRes.data[0]?.realtime_users || 0),
    });
  } catch (err) {
    console.error("Acquisition Overview API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [2] 시간별 유입 추이
router.get("/hourly-trend", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const checkQuery = `
      SELECT count() as count
      FROM hourly_metrics
      WHERE sdk_key = '${sdk_key}'
      LIMIT 1
    `;

    const checkRes = await clickhouse.query({
      query: checkQuery,
      format: "JSON",
    });
    const checkData = await checkRes.json();
    const hasData = checkData.data[0]?.count > 0;

    if (!hasData) {
      const query = `
        WITH hours AS (
          SELECT 
            formatDateTime(toDateTime('2024-01-01') + toIntervalHour(number), '%H') AS hour
          FROM numbers(24)
        )
        SELECT 
          h.hour,
          COALESCE(countDistinct(e.user_id), 0) AS users
        FROM hours h
        LEFT JOIN events e ON formatDateTime(e.timestamp, '%H') = h.hour
          AND e.timestamp >= now() - INTERVAL 24 HOUR
          AND e.sdk_key = '${sdk_key}'
        GROUP BY h.hour
        ORDER BY h.hour ASC
      `;

      const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
      const data = await dataRes.json();

      return res.status(200).json(
        data.map((item) => ({
          hour: item.hour,
          users: Number(item.users),
        }))
      );
    } else {
      const dateCondition =
        startDate && endDate
          ? `date_time >= toDateTime('${startDate}') AND date_time <= toDateTime('${endDate}')`
          : `date_time >= now() - INTERVAL 24 HOUR`;

      const query = `
        WITH hours AS (
          SELECT toString(number) AS hour
          FROM numbers(24)
        )
        SELECT 
          h.hour,
          COALESCE(sum(hm.visitors), 0) AS total_users,
          COALESCE(sum(hm.new_visitors), 0) AS new_users,
          COALESCE(sum(hm.existing_visitors), 0) AS existing_users
        FROM hours h
        LEFT JOIN hourly_metrics hm ON toString(toHour(hm.date_time)) = h.hour
          AND ${dateCondition}
          AND hm.sdk_key = '${sdk_key}'
        GROUP BY h.hour
        ORDER BY h.hour ASC
      `;

      const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
      const data = await dataRes.json();

      res.status(200).json(
        data.map((item) => ({
          hour: item.hour,
          total_users: Number(item.total_users),
          new_users: Number(item.new_users),
          existing_users: Number(item.existing_users),
        }))
      );
    }
  } catch (err) {
    console.error("Hourly Trend API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [3] 상위 유입 채널
router.get("/top-channels", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `date >= toDate('${startDate}') AND date <= toDate('${endDate}')`
        : buildQueryWhereClause("daily", 7);

    const query = `
      SELECT 
        segment_value as channel,
        sum(total_users) as users,
        sum(total_clicks) as clicks
      FROM klicklab.daily_click_summary
      WHERE segment_type = 'traffic_source'
        AND sdk_key = '${sdk_key}'
        AND ${dateCondition}
      GROUP BY segment_value
      ORDER BY users DESC
      LIMIT 5
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    res.status(200).json(
      data.map((item) => ({
        channel: item.channel,
        users: Number(item.users),
        clicks: Number(item.clicks),
      }))
    );
  } catch (err) {
    console.error("Top Channels API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [4] 전환 퍼널
router.get("/funnel-conversion", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `timestamp >= toDateTime('${startDate}') AND timestamp <= toDateTime('${endDate}')`
        : `timestamp >= now() - INTERVAL 7 DAY`;

    const query = `
      SELECT 
        page_path,
        count(distinct user_id) as users
      FROM events
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
        AND page_path IN ('/', '/product', '/checkout', '/success')
      GROUP BY page_path
      ORDER BY 
        CASE page_path
          WHEN '/' THEN 1
          WHEN '/product' THEN 2
          WHEN '/checkout' THEN 3
          WHEN '/success' THEN 4
        END
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    const stepNames = {
      "/": "홈",
      "/product": "상품",
      "/checkout": "결제",
      "/success": "완료",
    };

    res.status(200).json(
      data.map((item) => ({
        step: stepNames[item.page_path] || item.page_path,
        users: Number(item.users),
      }))
    );
  } catch (err) {
    console.error("Funnel Conversion API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [5] 플랫폼 분석 (디바이스 & 브라우저)
router.get("/platform-analysis", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `timestamp >= toDateTime('${startDate}') AND timestamp <= toDateTime('${endDate}')`
        : `timestamp >= now() - INTERVAL 7 DAY`;

    const deviceQuery = `
      SELECT 
        device_type AS type,
        count(distinct user_id) AS users
      FROM events
      WHERE sdk_key = '${sdk_key}'
        AND ${dateCondition}
        AND device_type != ''
      GROUP BY device_type
      ORDER BY users DESC
    `;

    const browserQuery = `
      SELECT 
        browser AS name,
        count(distinct user_id) AS users
      FROM events
      WHERE sdk_key = '${sdk_key}'
        AND ${dateCondition}
        AND browser != ''
      GROUP BY browser
      ORDER BY users DESC
      LIMIT 10
    `;

    const [deviceRes, browserRes] = await Promise.all([
      clickhouse
        .query({ query: deviceQuery, format: "JSONEachRow" })
        .then((r) => r.json()),
      clickhouse
        .query({ query: browserQuery, format: "JSONEachRow" })
        .then((r) => r.json()),
    ]);

    res.status(200).json({
      device: (deviceRes || []).map((item) => ({
        type: item.type,
        users: Number(item.users),
      })),
      browser: (browserRes || []).map((item) => ({
        name: item.name,
        users: Number(item.users),
      })),
    });
  } catch (err) {
    console.error("Platform Analysis API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [6] 클릭 흐름
router.get("/click-flow", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `timestamp >= toDateTime('${startDate}') AND timestamp <= toDateTime('${endDate}')`
        : `timestamp >= now() - INTERVAL 7 DAY`;

    const query = `
      SELECT 
        prev_page AS from,
        page_path  AS to,
        count(*)   AS count
      FROM (
        SELECT 
          session_id,
          page_path,
          lag(page_path) OVER (PARTITION BY session_id ORDER BY timestamp) AS prev_page
        FROM events
        WHERE sdk_key = '${sdk_key}'
          AND ${dateCondition}
      )
      WHERE prev_page IS NOT NULL
      GROUP BY from, to
      ORDER BY count DESC
      LIMIT 20
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    res.status(200).json(
      data.map((item) => ({
        from: item.from,
        to: item.to,
        count: Number(item.count),
      }))
    );
  } catch (err) {
    console.error("Click Flow API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [7] 채널 그룹 분석
router.get("/channel-groups", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `date >= toDate('${startDate}') AND date <= toDate('${endDate}')`
        : buildQueryWhereClause("daily", 7);

    const query = `
      SELECT 
        segment_value AS channel,
        dist_value    AS device,
        sum(user_count) AS users
      FROM klicklab.daily_user_distribution
      WHERE segment_type = 'traffic_source'
        AND dist_type    = 'device'
        AND sdk_key      = '${sdk_key}'
        AND ${dateCondition}
      GROUP BY segment_value, dist_value
      ORDER BY users DESC
      LIMIT 20
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    res.status(200).json(
      data.map((item) => ({
        channel: item.channel,
        device: item.device,
        users: Number(item.users),
      }))
    );
  } catch (err) {
    console.error("Channel Groups API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [8] 광고 캠페인 분석 (실데이터)
router.get("/campaigns", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `timestamp >= toDateTime('${startDate}') AND timestamp <= toDateTime('${endDate}')`
        : `timestamp >= now() - INTERVAL 7 DAY`;

    const query = `
      SELECT 
        traffic_campaign AS campaign,
        count(distinct user_id) AS users
      FROM events
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
        AND traffic_campaign != ''
      GROUP BY traffic_campaign
      ORDER BY users DESC
      LIMIT 20
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    return res.status(200).json(
      data.map((row) => ({
        campaign: row.campaign,
        users: Number(row.users),
      }))
    );
  } catch (err) {
    console.error("Campaigns API Error:", err);
    return res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [9] 상위 지역 분석 (실데이터)
router.get("/top-countries", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const candidateCols = [
      "city",
      "traffic_country",
      "traffic_region",
      "country",
      "region",
    ];
    const colQuery = `
      SELECT name FROM system.columns 
      WHERE database = 'klicklab' AND table = 'events' AND name IN (${candidateCols
        .map((c) => `'${c}'`)
        .join(",")})
      ORDER BY CASE 
        WHEN name = 'city' THEN 1
        WHEN name = 'traffic_country' THEN 2
        WHEN name = 'traffic_region' THEN 3
        WHEN name = 'country' THEN 4
        WHEN name = 'region' THEN 5
        ELSE 6
      END
      LIMIT 1`;

    const colRes = await clickhouse.query({
      query: colQuery,
      format: "JSONEachRow",
    });
    const colRows = await colRes.json();
    const col = colRows[0]?.name;

    if (!col) {
      return res.status(200).json([]);
    }

    const dateCondition =
      startDate && endDate
        ? `timestamp >= toDateTime('${startDate}') AND timestamp <= toDateTime('${endDate}')`
        : `timestamp >= now() - INTERVAL 7 DAY`;

    const query = `
      SELECT 
        ${col} AS region,
        count(distinct user_id) AS users
      FROM events
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
        AND ${col} != ''
        AND ${col} IS NOT NULL
      GROUP BY ${col}
      ORDER BY users DESC
      LIMIT 20
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    return res.status(200).json(
      data.map((row) => ({
        region: row.region,
        users: Number(row.users),
      }))
    );
  } catch (err) {
    console.error("Top Countries API Error:", err);
    return res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [10] 신규 사용자 채널 분석
router.get("/new-user-channels", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const dateCondition =
      startDate && endDate
        ? `date >= toDate('${startDate}') AND date <= toDate('${endDate}')`
        : buildQueryWhereClause("daily", 7);

    // 집계 테이블에서 데이터 조회
    const query = `
      SELECT 
        channel,
        sum(users) AS users
      FROM klicklab.new_user_channels
      WHERE ${dateCondition}
        AND sdk_key = '${sdk_key}'
      GROUP BY channel
      ORDER BY users DESC
      LIMIT 10
    `;

    const dataRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await dataRes.json();

    // 집계 테이블에 데이터가 없는 경우 실시간 계산
    if (data.length === 0) {
      const start =
        startDate || dayjs().subtract(7, "day").format("YYYY-MM-DD");
      const end = endDate || dayjs().format("YYYY-MM-DD");

      const realtimeQuery = `
        SELECT
          traffic_source AS channel,
          count(DISTINCT client_id) AS users
        FROM klicklab.events e
        WHERE timestamp BETWEEN toDateTime('${start}') AND toDateTime('${end}')
          AND sdk_key = '${sdk_key}'
          AND traffic_source != ''
          AND client_id IN (
            -- 해당 기간에 처음 등장한 client_id만 선택 (신규 사용자)
            SELECT client_id
            FROM (
              SELECT 
                client_id,
                min(toDate(timestamp)) AS first_seen_date
              FROM klicklab.events
              WHERE sdk_key = '${sdk_key}'
              GROUP BY client_id
              HAVING first_seen_date >= toDate('${start}') AND first_seen_date <= toDate('${end}')
            )
          )
        GROUP BY channel
        ORDER BY users DESC
        LIMIT 10
      `;

      const realtimeRes = await clickhouse.query({
        query: realtimeQuery,
        format: "JSONEachRow",
      });
      const realtimeData = await realtimeRes.json();

      return res.status(200).json(
        realtimeData.map((item) => ({
          channel: item.channel,
          users: Number(item.users),
        }))
      );
    }

    res.status(200).json(
      data.map((item) => ({
        channel: item.channel,
        users: Number(item.users),
      }))
    );
  } catch (err) {
    console.error("New User Channels API Error:", err);
    res.status(500).json({ success: false, error: "Query failed" });
  }
});

// [X] 첫 유입페이지 전환율 (명세 기반 집계)
router.get("/landing-conversion-rate", authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const { sdk_key } = req.user;
  const start = startDate || "2024-06-01";
  const end = endDate || "2024-06-30";
  try {
    const query = `
      SELECT
        landing_page,
        COUNT(*) AS total_sessions,
        COUNTIf(is_converted = 1) AS total_conversions,
        ROUND(100.0 * COUNTIf(is_converted = 1) / COUNT(*), 1) AS conversion_rate
      FROM (
        SELECT
          session_id,
          argMin(page_path, timestamp) AS landing_page,
          max(event_name = 'is_payment') AS is_converted
        FROM klicklab.events
        WHERE
          sdk_key = '${sdk_key}'
          AND timestamp BETWEEN toDateTime('${start}') AND toDateTime('${end}')
          AND (event_name = 'page_view' OR event_name = 'is_payment')
        GROUP BY session_id
      )
      GROUP BY landing_page
      ORDER BY total_sessions DESC
      LIMIT 20
    `;
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error("Landing Conversion Rate API Error:", err);
    res.status(500).json({ error: "DB 쿼리 실패" });
  }
});

module.exports = router;
