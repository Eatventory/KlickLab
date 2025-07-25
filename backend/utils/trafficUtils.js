const clickhouse = require("../src/config/clickhouse");
const { formatLocalDateTime } = require("../utils/formatLocalDateTime");
const { getLocalNow, getIsoNow, floorToNearest10Min, getNearestHourFloor, getOneHourAgo, getTodayStart } = require('../utils/timeUtils');

const localNow = getLocalNow();
const isoNow = getIsoNow();
const tenMinutesFloor = formatLocalDateTime(floorToNearest10Min());
const nearestHourFloor = formatLocalDateTime(getNearestHourFloor());
const oneHourFloor = formatLocalDateTime(getOneHourAgo());
const todayStart = formatLocalDateTime(getTodayStart());

function getAgeCondition(ageGroup) {
  switch (ageGroup) {
    case "10s":
      return "user_age >= 10 AND user_age < 20";
    case "20s":
      return "user_age >= 20 AND user_age < 30";
    case "30s":
      return "user_age >= 30 AND user_age < 40";
    case "40s":
      return "user_age >= 40 AND user_age < 50";
    case "50s":
      return "user_age >= 50 AND user_age < 60";
    case "60s+":
      return "user_age >= 60";
    default:
      return "";
  }
}

// 날짜 계산 함수
function getPeriodRange(period, now) {
  let startDate, endDate;
  if (period === "weekly") {
    const nowDay = now.getDay() || 7;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - nowDay + 1);
    const sixWeeksAgoMonday = new Date(thisMonday);
    sixWeeksAgoMonday.setDate(thisMonday.getDate() - 35);
    startDate = new Date(sixWeeksAgoMonday.setHours(0, 0, 0, 0));
    endDate = new Date(thisMonday);
    endDate.setDate(thisMonday.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "monthly") {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = new Date(firstOfThisMonth);
    startDate.setMonth(firstOfThisMonth.getMonth() - 11);
    endDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  } else {
    startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    endDate = now;
  }
  return {
    startDateStr: startDate.toISOString().slice(0, 19).replace("T", " "),
    endDateStr: endDate.toISOString().slice(0, 19).replace("T", " "),
  };
}

// where 조건 생성 함수
function getWhereClause({
  startDateStr,
  endDateStr,
  gender,
  ageGroup
}) {
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
  return where.join(" AND ");
}

// 쿼리 실행 함수
async function runQuery(query) {
  const result = await clickhouse.query({ query, format: "JSON" });
  return (await result.json()).data;
}

// 데이터 보정 함수(예시: visitorTrend)
function fixVisitorTrend(period, visitorTrend, now) {
  if (period === "hourly") {
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000); // now - i시간
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      hours.push(`${year}-${month}-${day} ${hour}`);
    }
    return hours.map((dateStr) => {
      const found = visitorTrend.find((d) => d.date === dateStr);
      return (
        found || {
          date: dateStr,
          visitors: 0,
          newVisitors: 0,
          returningVisitors: 0,
        }
      );
    });
  } else if (period === "weekly") {
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const firstDayOfWeek = firstOfMonth.getDay() || 7;
      const weekOfMonth = Math.ceil(
        (d.getDate() + firstDayOfWeek - 1) / 7
      );
      weeks.push(`${month}월 ${weekOfMonth}주차`);
    }
    return weeks.map((label) => {
      const found = visitorTrend.find((d) => d.date === label);
      return (
        found || {
          date: label,
          visitors: 0,
          newVisitors: 0,
          returningVisitors: 0,
        }
      );
    });
  } else if (period === "monthly") {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      months.push(`${year}-${month}`);
    }
    return months.map((monthStr) => {
      const found = visitorTrend.find((d) => d.date === monthStr);
      return (
        found || {
          date: monthStr,
          visitors: 0,
          newVisitors: 0,
          returningVisitors: 0,
        }
      );
    });
  } else if (period === "daily" && visitorTrend.length > 7) {
    return visitorTrend.slice(-7);
  }
  return visitorTrend;
}

// 캐시 관련 상수 및 함수 추가
function getCacheKey({ sdk_key, period, gender, ageGroup }) {
  return `${sdk_key}|${period}|${gender}|${ageGroup}`;
}

function getVisitorTrendQuery(period, sdk_key, gender, ageGroup, startDateStr, endDateStr) {
  let sumCond = '';
  if (gender !== 'all' && ageGroup !== 'all') { // 교집합 조건: gender + ageGroup
    sumCond = `segment_type = 'user_gender' AND segment_value = '${gender}' AND dist_type = 'ageGroup' AND dist_value = '${ageGroup}'`;
  } else if (gender !== 'all') { // 성별만 필터
    sumCond = `segment_type = 'user_gender' AND segment_value = '${gender}'`;
  } else if (ageGroup !== 'all') { // 연령만 필터 (segment_type에 있음)
    sumCond = `segment_type = 'user_age' AND segment_value = '${ageGroup}'`;
  } else { // 모두 all이면 기본 기준은 user_age
    sumCond = `segment_type = 'user_age'`;
  }

  if (period === 'weekly') {
    return `
      SELECT
        concat(
          formatDateTime(date, '%m'), '월 ',
          toString(toRelativeWeekNum(date) - toRelativeWeekNum(toStartOfMonth(date)) + 1),
          '주차'
        ) AS date_str,
        sumIf(user_count, ${sumCond}) AS visitors,
        0 AS newVisitors,
        0 AS returningVisitors
      FROM daily_user_distribution
      WHERE sdk_key = '${sdk_key}'
        AND date >= toStartOfWeek(toDate('${startDateStr}'))
        AND date <= toDate('${endDateStr}')
      GROUP BY date_str
      ORDER BY date_str ASC
    `;
  }

  if (period === 'monthly') {
    return `
      SELECT
        formatDateTime(date, '%Y-%m') AS date_str,
        sumIf(user_count, ${sumCond}) AS visitors,
        0 AS newVisitors,
        0 AS returningVisitors
      FROM daily_user_distribution
      WHERE sdk_key = '${sdk_key}'
        AND date >= toStartOfMonth(toDate('${startDateStr}'))
        AND date <= toDate('${endDateStr}')
      GROUP BY date_str
      ORDER BY date_str ASC
    `;
  }

  if (period === "daily") {
    return `
      SELECT
        formatDateTime(date, '%Y-%m-%d') AS date_str,
        sumIf(user_count, ${sumCond}) AS visitors,
        0, 0
      FROM (
        SELECT date, segment_type, segment_value, dist_type, dist_value, user_count
        FROM daily_user_distribution
        WHERE sdk_key = '${sdk_key}'
          AND date BETWEEN toDate('${localNow}') - 6 AND toDate('${localNow}')
        UNION ALL
        SELECT toDate(date_time), segment_type, segment_value, dist_type, dist_value, user_count
        FROM hourly_user_distribution
        WHERE sdk_key = '${sdk_key}'
          AND date_time >= toDateTime('${todayStart}')
          AND date_time <= toDateTime('${oneHourFloor}')
        UNION ALL
        SELECT toDate(date_time), segment_type, segment_value, dist_type, dist_value, user_count
        FROM minutes_user_distribution
        WHERE sdk_key = '${sdk_key}'
          AND date_time > toDateTime('${oneHourFloor}')
          AND date_time <= toDateTime('${tenMinutesFloor}')
      )
      GROUP BY date
      ORDER BY date_str ASC
    `;
  }

  if (period === "hourly") {
    return `
      SELECT *
      FROM (
        -- 1. 지난 23시간: hourly_user_distribution
        SELECT
          formatDateTime(date_time, '%Y-%m-%d %H') AS date_str,
          sumIf(user_count, ${sumCond}) AS visitors,
          0 AS newVisitors,
          0 AS returningVisitors
        FROM hourly_user_distribution
        WHERE sdk_key = '${sdk_key}'
          AND date_time >= toDateTime('${isoNow}') - INTERVAL 24 HOUR
          AND date_time < toDateTime('${nearestHourFloor}')
        GROUP BY date_time
  
        UNION ALL
  
        -- 2. 최근 1시간: minutes_user_distribution
        SELECT
          formatDateTime(toStartOfHour(date_time), '%Y-%m-%d %H') AS date_str,
          sumIf(user_count, ${sumCond}) AS visitors,
          0 AS newVisitors,
          0 AS returningVisitors
        FROM minutes_user_distribution
        WHERE sdk_key = '${sdk_key}'
          AND date_time >= toDateTime('${nearestHourFloor}')
          AND date_time < toDateTime('${isoNow}')
        GROUP BY toStartOfHour(date_time)
      )
      ORDER BY date_str ASC
    `;
  }

  return "";
}

function getHourlyTrafficQuery(whereClause, sdk_key) {
  return `
    SELECT
      formatDateTime(timestamp, '%H') AS hour,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
      AND sdk_key = '${sdk_key}'
    GROUP BY hour
    ORDER BY hour ASC
  `;
}

function getSourceDistributionQuery(period, sdk_key) {
  let where = "event_name = 'auto_click'";

  if (period === "daily") {
    where += " AND toDate(timestamp) = yesterday()";
  } else if (period === "hourly") {
    where += " AND timestamp >= now() - INTERVAL 1 HOUR AND timestamp < now()";
  } else if (period === "weekly") {
    where += " AND toDate(timestamp) >= toMonday(today() - INTERVAL 1 WEEK) AND toDate(timestamp) <= toMonday(today()) - INTERVAL 1 DAY";
  } else if (period === "monthly") {
    where += " AND toDate(timestamp) >= toStartOfMonth(today() - INTERVAL 1 MONTH) AND toDate(timestamp) <= toStartOfMonth(today()) - INTERVAL 1 DAY";
  }

  return `
    SELECT
      traffic_source AS source,
      count() AS visitors
    FROM events
    WHERE ${where}
      AND sdk_key = '${sdk_key}'
    GROUP BY source
    ORDER BY visitors DESC
    LIMIT 10
  `;
}

function getMediumDistributionQuery(whereClause, sdk_key) {
  return `
    SELECT
      traffic_medium AS medium,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
      AND sdk_key = '${sdk_key}'
    GROUP BY medium
    ORDER BY visitors DESC
    LIMIT 10
  `;
}

function getCampaignDistributionQuery(whereClause, sdk_key) {
  return `
    SELECT
      traffic_campaign AS campaign,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
      AND sdk_key = '${sdk_key}'
    GROUP BY campaign
    ORDER BY visitors DESC
    LIMIT 10
  `;
}

function getReferrerDistributionQuery(whereClause, sdk_key) {
  return `
    SELECT
      referrer,
      count() AS visitors
    FROM events
    WHERE ${whereClause}
      AND sdk_key = '${sdk_key}'
    GROUP BY referrer
    ORDER BY visitors DESC
    LIMIT 10
  `;
}

function getMainPageNavigationQuery(period, sdk_key) {
  let where = "event_name = 'auto_click' AND page_path != '/'";

  if (period === "daily") {
    where += " AND toDate(timestamp) = yesterday()";
  } else if (period === "hourly") {
    where += " AND timestamp >= now() - INTERVAL 1 HOUR AND timestamp < now()";
  } else if (period === "weekly") {
    where += " AND toDate(timestamp) >= toMonday(today() - INTERVAL 1 WEEK) AND toDate(timestamp) <= toMonday(today()) - INTERVAL 1 DAY";
  } else if (period === "monthly") {
    where += " AND toDate(timestamp) >= toStartOfMonth(today() - INTERVAL 1 MONTH) AND toDate(timestamp) <= toStartOfMonth(today()) - INTERVAL 1 DAY";
  }

  return `
    SELECT
      page_path AS page,
      count() AS clicks,
      uniq(user_id) AS uniqueClicks
    FROM events
    WHERE ${where}
      AND sdk_key = '${sdk_key}'
    GROUP BY page
    ORDER BY clicks DESC
    LIMIT 10
  `;
}

module.exports = {
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
};