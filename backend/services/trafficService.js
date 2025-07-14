const {
  getAgeCondition,
  getPeriodRange,
  getWhereClause,
  runQuery,
  fixVisitorTrend,
  getCacheKey,
  getVisitorTrendQuery,
  getHourlyTrafficQuery,
  getSourceDistributionQuery,
  getMediumDistributionQuery,
  getCampaignDistributionQuery,
  getReferrerDistributionQuery,
  getMainPageNavigationQuery
} = require("../utils/trafficUtils");

const dashboardCache = new Map();
const CACHE_TTL = 60 * 1000;

function extractTrafficParams(req) {
  const { sdk_key } = req.user;
  const { period = "daily", gender = "all", ageGroup = "all" } = req.query;
  return { sdk_key, period, gender, ageGroup };
}

function isCacheHit(cacheKey) {
  const now = Date.now();
  const cached = dashboardCache.get(cacheKey);
  return cached && now - cached.timestamp < CACHE_TTL;
}

function getCachedData(cacheKey) {
  return dashboardCache.get(cacheKey).data;
}

function saveCache(cacheKey, data) {
  dashboardCache.set(cacheKey, { data, timestamp: Date.now() });
}

function buildTrafficQueries(params, startDateStr, endDateStr) {
  const { sdk_key, period, gender, ageGroup } = params;
  const whereClause = getWhereClause({
    startDateStr,
    endDateStr,
    gender,
    ageGroup,
  });

  return {
    visitorTrendQuery: getVisitorTrendQuery(
      period,
      sdk_key,
      gender,
      ageGroup,
      startDateStr,
      endDateStr
    ),
    hourlyTrafficQuery: getHourlyTrafficQuery(whereClause, sdk_key),
    sourceDistQuery: getSourceDistributionQuery(period, sdk_key),
    mediumDistQuery: getMediumDistributionQuery(whereClause, sdk_key),
    campaignDistQuery: getCampaignDistributionQuery(whereClause, sdk_key),
    referrerDistQuery: getReferrerDistributionQuery(whereClause, sdk_key),
    mainPageNavQuery: getMainPageNavigationQuery(period, sdk_key),
  };
}

async function fetchAllTrafficData(queries) {
  const [
    visitorTrendResult,
    hourlyTrafficResult,
    sourceDistResult,
    mediumDistResult,
    campaignDistResult,
    referrerDistResult,
    mainPageNavResult,
  ] = await Promise.all([
    runQuery(queries.visitorTrendQuery),
    runQuery(queries.hourlyTrafficQuery),
    runQuery(queries.sourceDistQuery),
    runQuery(queries.mediumDistQuery),
    runQuery(queries.campaignDistQuery),
    runQuery(queries.referrerDistQuery),
    runQuery(queries.mainPageNavQuery),
  ]);

  return {
    visitorTrendResult,
    hourlyTrafficResult,
    sourceDistResult,
    mediumDistResult,
    campaignDistResult,
    referrerDistResult,
    mainPageNavResult,
  };
}

function transformTrafficResponse(results, params) {
  const { period, gender, ageGroup } = params;
  const now = new Date();

  let visitorTrend = results.visitorTrendResult.map((row) => ({
    date: row.date_str || row.date,
    visitors: Number(row.visitors) || 0,
    newVisitors: Number(row.newVisitors) || 0,
    returningVisitors: Number(row.returningVisitors) || 0,
  }));
  visitorTrend = fixVisitorTrend(period, visitorTrend, now);

  const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    const found = results.hourlyTrafficResult.find((r) => r.hour === hour);
    return { hour, visitors: found ? Number(found.visitors) : 0 };
  });

  const mapDist = (rows, key) =>
    rows.map((row) => ({
      [key]: row[key] || "(없음)",
      visitors: Number(row.visitors) || 0,
    }));

  const mainPageNavigation = results.mainPageNavResult.map((row, i) => ({
    name: row.page,
    page: row.page,
    clicks: Number(row.clicks) || 0,
    uniqueClicks: Number(row.uniqueClicks) || 0,
    clickRate: 0,
    avgTimeToClick: 0,
    rank: i + 1,
    id: (i + 1).toString(),
  }));

  return {
    visitorTrend,
    mainPageNavigation,
    hourlyTraffic,
    entryPageDistribution: mapDist(results.sourceDistResult, "source"),
    mediumDistribution: mapDist(results.mediumDistResult, "medium"),
    campaignDistribution: mapDist(results.campaignDistResult, "campaign"),
    referrerDistribution: mapDist(results.referrerDistResult, "referrer"),
    filters: { period, gender, ageGroup },
  };
}

module.exports = {
  extractTrafficParams,
  isCacheHit,
  getCachedData,
  saveCache,
  buildTrafficQueries,
  fetchAllTrafficData,
  transformTrafficResponse,
};
