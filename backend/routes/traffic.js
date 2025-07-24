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

// 채널별 전환율 API
router.get("/channel-conversion", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    // 기본값 설정 (요청이 없으면 최근 7일)
    const end = endDate || today;
    const start = startDate || new Date(new Date(end).getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // 채널별(traffic_source) 세션 전환율 쿼리
    const query = `
      WITH channel_conversions AS (
          SELECT 
              traffic_source,
              session_id,
              max(if(dictHas('klicklab.conversion_events_dict', tuple(sdk_key, event_name)), 1, 0)) AS is_converted
          FROM klicklab.events
          WHERE timestamp >= '${start} 00:00:00'
              AND timestamp <= '${end} 23:59:59'
              AND sdk_key = '${sdk_key}'
              AND traffic_source != ''
          GROUP BY traffic_source, session_id
      )
      SELECT 
          traffic_source AS channel,
          count(DISTINCT session_id) AS total_sessions,
          sum(is_converted) AS converted_sessions,
          round(sum(is_converted) / count(DISTINCT session_id) * 100, 2) AS conversion_rate
      FROM channel_conversions
      GROUP BY traffic_source
      HAVING total_sessions >= 5  -- 최소 5세션 이상만 표시
      ORDER BY conversion_rate DESC, total_sessions DESC
      LIMIT 20
    `;
    
    const result = await clickhouse.query({
      query,
      format: "JSON",
    });
    const channelData = await result.json();
    
    // 데이터 포맷팅
    const formattedChannelData = channelData.data.map(row => ({
      channel: row.channel || 'unknown',
      source: row.channel || 'unknown', // traffic_source와 동일
      medium: '', // medium은 사용하지 않음
      campaign: '', // 캠페인 정보는 별도 쿼리 필요시 추가
      totalSessions: parseInt(row.total_sessions) || 0,
      convertedSessions: parseInt(row.converted_sessions) || 0,
      conversionRate: parseFloat(row.conversion_rate) || 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedChannelData,
      meta: {
        period: `${start} ~ ${end}`,
        totalChannels: formattedChannelData.length,
        query_date: koreaTime.toISOString()
      }
    });
    
  } catch (err) {
    console.error("Channel Conversion API ERROR:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to get channel conversion data",
      message: err.message 
    });
  }
});

module.exports = router;
