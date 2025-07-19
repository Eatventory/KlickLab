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

// 전환 이벤트 조회 함수 추가
async function getCurrentConversionEvent(sdk_key) {
  const result = await clickhouse.query({
    query: `SELECT event FROM users WHERE sdk_key = '${sdk_key}'`,
    format: "JSON",
  });
  const rows = await result.json();
  const event = rows.data?.[0]?.event || "is_payment";
  // 예시: event가 'is_payment'라면 fromPage/toPage를 매핑
  // 실제 매핑 테이블은 필요에 따라 조정
  const eventMap = {
    is_payment: { fromPage: "/cart", toPage: "/checkout/success" },
    is_signup: { fromPage: "/signup", toPage: "/signup/success" },
    add_to_cart: { fromPage: "/products", toPage: "/cart" },
    contact_submit: { fromPage: "/contact", toPage: "/contact/success" },
  };
  return eventMap[event] || eventMap["is_payment"];
}

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

const tableMap = {
  minutes: "minutes_metrics",
  hourly: "hourly_metrics",
  daily: "daily_metrics",
  weekly: "weekly_metrics",
};

router.get("/visitors", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const period = req.query.period || "daily";
  const table = tableMap[period] || "daily_metrics";
  try {
    // 추이 데이터
    const trendRes = await clickhouse.query({
      query: `
        SELECT
          formatDateTime(date, '%Y-%m-%d') AS date_str,
          toUInt64(visitors) AS visitors
        FROM ${table}
        WHERE date >= toDate('${localNow}') - 6
          AND date < toDate('${localNow}')
          AND sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });
    const trendData = (await trendRes.json()).data || [];
    const trend = trendData.map((row) => ({
      date: row.date_str,
      visitors: Number(row.visitors),
    }));

    // 어제자
    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT visitors
        FROM ${table}
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });
    const yesterdayVisitors =
      (await yesterdayRes.json()).data[0]?.visitors ?? 0;

    // 오늘 실시간 (hourly + minutes)
    const todayVisitorsRes = await clickhouse.query({
      query: `
        WITH
          (
            SELECT sum(visitors) FROM hourly_metrics
            WHERE date_time >= toDateTime('${todayStart}')
              AND date_time <= toDateTime('${oneHourFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS hourly_visitors,
          (
            SELECT sum(visitors) FROM minutes_metrics
            WHERE date_time >= toDateTime('${NearestHourFloor}')
              AND date_time <= toDateTime('${tenMinutesFloor}')
              AND sdk_key = '${sdk_key}'
          ) AS minutes_visitors
        SELECT hourly_visitors + minutes_visitors AS visitors;
      `,
      format: "JSON",
    });
    const todayVisitors =
      +(await todayVisitorsRes.json()).data[0]?.visitors || 0;

    res.status(200).json({
      today: todayVisitors,
      yesterday: yesterdayVisitors,
      trend,
    });
  } catch (err) {
    console.error("Visitors API ERROR:", err);
    res.status(500).json({ error: "Failed to get visitors data" });
  }
});

router.get("/clicks", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const period = req.query.period || "daily";
  const table = tableMap[period] || "daily_metrics";
  try {
    const yesterdayRes = await clickhouse.query({
      query: `
        SELECT clicks
        FROM ${table}
        WHERE date = toDate('${localNow}') - 1
          AND sdk_key = '${sdk_key}'
      `,
      format: "JSON",
    });
    const yesterdayClicks = (await yesterdayRes.json()).data[0]?.clicks ?? 0;

    // 10분 전 데이터부터 top clicks에 반영됨
    const clickRes = await clickhouse.query({
      query: `
        WITH
          (SELECT sum(clicks) FROM hourly_metrics
          WHERE date_time >= toDateTime('${todayStart}')
            AND date_time <= toDateTime('${oneHourFloor}')
            AND sdk_key = '${sdk_key}') AS hourly_clicks,
          (SELECT sum(clicks) FROM minutes_metrics
          WHERE date_time >= toDateTime('${NearestHourFloor}')
            AND date_time <= toDateTime('${tenMinutesFloor}')
            AND sdk_key = '${sdk_key}') AS minutes_clicks
        SELECT hourly_clicks + minutes_clicks AS clicks
      `,
      format: "JSON",
    });
    const todayClicks = +(await clickRes.json()).data[0]?.clicks || 0;

    res.status(200).json({
      today: todayClicks,
      yesterday: yesterdayClicks,
    });
  } catch (err) {
    console.error("Clicks API ERROR:", err);
    res.status(500).json({ error: "Failed to get clicks data" });
  }
});

router.get("/top-clicks", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = `
      SELECT 
        element, 
        sum(total_clicks) AS cnt
      FROM (
        SELECT element, total_clicks
        FROM hourly_top_elements
        WHERE date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'user_age' -- 중복 집계 방지
          AND element != ''

        UNION ALL

        SELECT element, total_clicks
        FROM minutes_top_elements
        WHERE date_time >= toDateTime('${NearestHourFloor}')
          AND date_time < toDateTime('${tenMinutesFloor}')
          AND sdk_key = '${sdk_key}'
          AND segment_type = 'user_age' -- 중복 집계 방지
          AND element != ''
      )
      GROUP BY element
      ORDER BY cnt DESC
      LIMIT 5
    `;

    const clickRes = await clickhouse.query({ query, format: "JSONEachRow" });
    const topClicks = (await clickRes.json()).map((row) => ({
      label: row.element,
      count: Number(row.cnt),
    }));

    res.status(200).json({ items: topClicks });
  } catch (err) {
    console.error("Top Clicks API ERROR:", err);
    res.status(500).json({ error: "Failed to get top clicks data" });
  }
});

router.get("/click-trend", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const baseTime = `'${req.query.baseTime}'`;
    const period = parseInt(req.query.period) || 60; // 조회 범위 (분)
    const step = parseInt(req.query.step) || 5; // 집계 단위 (분)

    const clickTrendRes = await clickhouse.query({
      query: `
        WITH 
          parseDateTimeBestEffortOrNull(${baseTime}) AS base,
          toRelativeMinuteNum(base) AS base_min,
          ${step} AS step_minute,
          ${period} AS period_minute
        SELECT 
          formatDateTime(
            toDateTime(base_min * 60) 
              + toIntervalMinute(
                  intDiv(toRelativeMinuteNum(timestamp) - base_min, step_minute) * step_minute
                ),
            '%H:%i'
          ) AS time,
          count() AS count
        FROM events
        WHERE 
          event_name = 'auto_click'
          AND timestamp >= base - toIntervalMinute(period_minute)
          AND sdk_key = '${sdk_key}'
        GROUP BY time
        ORDER BY time
      `,
      format: "JSONEachRow",
    });
    const rawTrend = await clickTrendRes.json();
    const clickTrend = rawTrend.map((row) => ({
      time: row.time,
      count: Number(row.count),
    }));

    res.status(200).json({ data: clickTrend });
  } catch (err) {
    console.error("Click Trend API ERROR:", err);
    res.status(500).json({ error: "Failed to get click trend data" });
  }
});

router.get("/dropoff-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = `
      WITH t AS (
        SELECT
          page_path,
          sum(page_exits) AS exit_count,
          sum(page_views) AS total_count
        FROM hourly_page_stats
        WHERE date_time >= toDateTime('${todayStart}')
          AND page_path != ''
          AND sdk_key = '${sdk_key}'
        GROUP BY page_path
      )
      SELECT 
        page_path AS page,
        round(exit_count / total_count * 100, 1) AS dropRate
      FROM t
      ORDER BY dropRate DESC
      LIMIT 5
    `;
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json({ data: data });
  } catch (err) {
    console.error("Dropoff Summary API ERROR:", err);
    res.status(500).json({ error: "Failed to get dropoff summary data" });
  }
});

/* 기존 Sankey API에 segment 필터(전환 여부, 장바구니 이탈 등) 적용 */
router.get("/userpath-summary", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const segment = req.query.segment; // e.g. "converted", "abandoned_cart"
  const threshold = parseInt(req.query.threshold || "90");

  const fromPage = "/cart";
  const toPage = "/checkout/success";

  let sessionFilter = ""; // 세션 필터

  // segment 필터 로직
  if (segment === "converted") {
    sessionFilter = `
      AND session_id IN (
        SELECT session_id
        FROM events_pages
        WHERE sdk_key = '${sdk_key}'
        GROUP BY session_id
        HAVING
          minIf(event_ts, page_path = '${fromPage}') IS NOT NULL
          AND minIf(event_ts, page_path = '${toPage}') IS NOT NULL
          AND minIf(event_ts, page_path = '${fromPage}') < minIf(event_ts, page_path = '${toPage}')
      )
    `;
  } else if (segment === "abandoned_cart") {
    sessionFilter = `
      AND session_id IN (
        SELECT session_id
        FROM events_pages
        WHERE sdk_key = '${sdk_key}'
        GROUP BY session_id
        HAVING
          minIf(event_ts, page_path = '${fromPage}') IS NOT NULL
          AND minIf(event_ts, page_path = '${toPage}') IS NULL
      )
    `;
  }

  const query = `
    WITH raw_paths AS (
      SELECT
        session_id,
        groupArrayIf((event_ts, page_path), page_path != '') AS ordered
      FROM events_pages
      WHERE sdk_key = '${sdk_key}'
        AND event_ts >= now() - INTERVAL 1 DAY
        ${sessionFilter}
      GROUP BY session_id
    ),
    flattened AS (
      SELECT
        arrayJoin(
          arrayMap(i -> (ordered[i].2, ordered[i+1].2), range(length(ordered) - 1))
        ) AS pair
      FROM raw_paths
    ),
    ranked AS (
      SELECT
        pair.1 AS from,
        pair.2 AS to,
        count(*) AS value
      FROM flattened
      WHERE pair.1 != '' AND pair.2 != ''
      GROUP BY from, to
      ORDER BY value DESC
    ),
    cumulated AS (
      SELECT *,
        sum(value) OVER (ORDER BY value DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running,
        sum(value) OVER () AS total
      FROM ranked
    )
    SELECT from, to, value
    FROM cumulated
    WHERE running <= total * ${threshold / 100}
    LIMIT 500
  `;

  try {
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json({ data });
  } catch (err) {
    console.error("Userpath Summary API ERROR:", err);
    res.status(500).json({ error: "Failed to get userpath summary data" });
  }
});

/* 전환경로 Top 3 */
router.get(
  "/userpath-summary/conversion-top3",
  authMiddleware,
  async (req, res) => {
    const { sdk_key } = req.user;
    let { fromPage, toPage, event, limit = 3, startDate, endDate } = req.query;

    // event 파라미터가 있으면 fromPage, toPage를 매핑
    if (event) {
      const eventMap = {
        is_payment: { fromPage: "/cart", toPage: "/checkout/success" },
        is_signup: { fromPage: "/signup", toPage: "/signup/success" },
        add_to_cart: { fromPage: "/products", toPage: "/cart" },
        contact_submit: { fromPage: "/contact", toPage: "/contact/success" },
      };
      fromPage = eventMap[event]?.fromPage;
      toPage = eventMap[event]?.toPage;
    }

    // 기존 로직 유지
    if (!fromPage || !toPage) {
      const eventPages = await getCurrentConversionEvent(sdk_key);
      fromPage = fromPage || eventPages.fromPage;
      toPage = toPage || eventPages.toPage;
    }

    const start = startDate ? `toDate('${startDate}')` : `today() - 6`;
    const end = endDate ? `toDate('${endDate}')` : `today()`;

    // 1. fromPage 전체 세션 수 집계
    const totalFromPageQuery = `
      SELECT count(DISTINCT session_id) AS total_frompage_sessions
      FROM events
      WHERE page_path = '${fromPage}'
        AND toDate(timestamp) BETWEEN ${start} AND ${end}
        AND sdk_key = '${sdk_key}'
    `;
    // 2. 전체 전환 성공 세션 수 집계
    const totalConversionQuery = `
      WITH
        a_sessions AS (
          SELECT session_id, min(timestamp) AS a_time
          FROM events
          WHERE page_path = '${fromPage}'
            AND toDate(timestamp) BETWEEN ${start} AND ${end}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ),
        b_sessions AS (
          SELECT session_id, min(timestamp) AS b_time
          FROM events
          WHERE page_path = '${toPage}'
            AND toDate(timestamp) BETWEEN ${start} AND ${end}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        )
      SELECT count() AS total_conversion
      FROM (
        SELECT a.session_id
        FROM a_sessions a
        INNER JOIN b_sessions b USING (session_id)
        WHERE b.b_time > a.a_time
      )
    `;
    // 3. 경로별 집계 (경로별 전체 세션 수, 경로별 전환 성공 세션 수)
    const pathStatsQuery = `
      WITH
        a_sessions AS (
          SELECT session_id, min(timestamp) AS a_time
          FROM events
          WHERE page_path = '${fromPage}'
            AND toDate(timestamp) BETWEEN ${start} AND ${end}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ),
        b_sessions AS (
          SELECT session_id, min(timestamp) AS b_time
          FROM events
          WHERE page_path = '${toPage}'
            AND toDate(timestamp) BETWEEN ${start} AND ${end}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ),
        ab_sessions AS (
          SELECT a.session_id
          FROM a_sessions a
          INNER JOIN b_sessions b USING (session_id)
          WHERE b.b_time > a.a_time
        ),
        full_paths AS (
          SELECT
            session_id,
            arrayMap(x -> x.2, arraySort(x -> x.1, groupArray((timestamp, page_path)))) AS path
          FROM events
          WHERE session_id IN (SELECT session_id FROM a_sessions)
            AND toDate(timestamp) BETWEEN ${start} AND ${end}
            AND sdk_key = '${sdk_key}'
          GROUP BY session_id
        ),
        labeled_paths AS (
          SELECT
            fp.session_id,
            arraySlice(fp.path, 1, if(indexOf(fp.path, '${toPage}') > 0, indexOf(fp.path, '${toPage}'), length(fp.path))) AS path,
            arrayStringConcat(arraySlice(fp.path, 1, if(indexOf(fp.path, '${toPage}') > 0, indexOf(fp.path, '${toPage}'), length(fp.path))), ' → ') AS path_string,
            isNotNull(ab.session_id) AS is_converted
          FROM full_paths fp
          LEFT JOIN ab_sessions ab USING (session_id)
        )
      SELECT
        path_string,
        count() AS total_sessions,
        sum(is_converted) AS conversion_count
      FROM labeled_paths
      GROUP BY path_string
      HAVING sum(is_converted) > 0
      ORDER BY conversion_count DESC
      LIMIT ${limit}
    `;

    try {
      // 쿼리 병렬 실행
      const [fromPageRes, totalConvRes, pathStatsRes] = await Promise.all([
        clickhouse
          .query({ query: totalFromPageQuery, format: "JSON" })
          .then((r) => r.json()),
        clickhouse
          .query({ query: totalConversionQuery, format: "JSON" })
          .then((r) => r.json()),
        clickhouse
          .query({ query: pathStatsQuery, format: "JSON" })
          .then((r) => r.json()),
      ]);
      const totalFromPage = fromPageRes.data?.[0]?.total_frompage_sessions || 0;
      const totalConversion = totalConvRes.data?.[0]?.total_conversion || 0;
      const pathRows = pathStatsRes.data || [];
      const data = pathRows.map((row, index) => ({
        path: row.path_string.split(" → "),
        conversionCount: Number(row.conversion_count),
        conversionRate:
          totalFromPage > 0
            ? Math.round((row.conversion_count / totalFromPage) * 1000) / 10
            : 0,
        share:
          totalConversion > 0
            ? Math.round((row.conversion_count / totalConversion) * 1000) / 10
            : 0,
        rank: index + 1,
      }));
      const avgConversionRate =
        data.length > 0
          ? data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length
          : 0;
      const dataWithCompare = data.map((d) => ({
        ...d,
        compareToAvg:
          avgConversionRate > 0
            ? Math.round((d.conversionRate / avgConversionRate) * 10) / 10
            : "-",
      }));
      res.status(200).json({
        data: dataWithCompare,
        totalConversion,
      });
    } catch (err) {
      console.error("Conversion Top3 API ERROR:", err);
      res.status(500).json({ error: "Failed to get conversion top paths" });
    }
  }
);

// sankey_paths_daily에서 event_path만 뽑아오는 API
router.get("/sankey-paths", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const query = `
    SELECT event_path
    FROM klicklab.sankey_paths_daily
    WHERE day = today()
      AND sdk_key = '${sdk_key}'
  `;
  try {
    const result = await clickhouse.query({ query, format: "JSONEachRow" });
    const data = await result.json();
    res.status(200).json({ data });
  } catch (err) {
    console.error("Sankey Paths API ERROR:", err);
    res.status(500).json({ error: "Failed to get sankey paths data" });
  }
});

module.exports = router;
