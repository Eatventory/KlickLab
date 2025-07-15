const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { formatLocalDateTime } = require("../utils/formatLocalDateTime");
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');
const { getVisitorTrendQuery } = require("../utils/trafficUtils");
const {
  extractTrafficParams,
  isCacheHit,
  getCachedData,
  saveCache,
  buildTrafficQueries,
  fetchAllTrafficData,
  transformTrafficResponse
} = require("../services/trafficService");

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const NearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

/* Traffic 탭 통합 API */
router.get("/", authMiddleware, async (req, res) => {
  const params = extractTrafficParams(req);
  const cacheKey = require("../utils/trafficUtils").getCacheKey(params);

  if (isCacheHit(cacheKey)) {
    return res.status(200).json(getCachedData(cacheKey));
  }

  try {
    const { getPeriodRange } = require("../utils/trafficUtils");
    const { startDateStr, endDateStr } = getPeriodRange(params.period, new Date());

    const queries = buildTrafficQueries(params, startDateStr, endDateStr);
    const results = await fetchAllTrafficData(queries);
    const responseData = transformTrafficResponse(results, params);

    saveCache(cacheKey, responseData);
    res.status(200).json(responseData);
  } catch (err) {
    console.error("Traffic Dashboard API ERROR:", err);
    res.status(500).json({ error: "Failed to get traffic dashboard data" });
  }
});

/* 일별 방문 트렌드 단독 API */
// ✅ 실행 시간 : 10.678s → 40.90ms (99.62% 감소)
router.get("/daily-visitors", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  try {
    const query = getVisitorTrendQuery("daily", sdk_key, "all", "all", localNow, localNow);

    const visitorTrendResult = await clickhouse.query({
      query,
      format: "JSON",
    });
    const visitorTrendJson = await visitorTrendResult.json();

    const visitorTrend = visitorTrendJson.data
      .map((row) => {
        const parse = (value) =>
          Number.isFinite(Number(value)) && Number(value) >= 0
            ? Number(value)
            : 0;

        return {
          date: row.date_str || row.date,
          visitors: parse(row.visitors),
          newVisitors: parse(row.newVisitors),
          returningVisitors: parse(row.returningVisitors),
        };
      })
      .slice(-7);

    res.status(200).json({ data: visitorTrend });
  } catch (err) {
    console.error("Visitors Traffic API ERROR:", err);
    res.status(500).json({ error: "Failed to get visitors traffic data" });
  }
});

module.exports = router;
