const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");


// 상수 정의
const GENDER_FILTER = "AND (segment_type != 'user_gender' OR (segment_type = 'user_gender' AND segment_value != 'unknown'))";
const UNKNOWN_FILTER = "AND segment_value != 'unknown'";
const SELECT_FIELDS = "segment_type, segment_value, dist_type, dist_value, sum(user_count) as user_count";
const GROUP_BY_FIELDS = "GROUP BY segment_type, segment_value, dist_type, dist_value";

// 공통 쿼리 실행 함수
const executeQuery = async (query) => {

  try {
    const result = await clickhouse.query({ query, format: "JSON" }).then(r => r.json());
    return result.data || [];
  } catch (err) {
    console.error(`Query execution failed:`, err.message);
    return [];
  }
};


// 오늘 데이터 조회 함수, AGGREGATION 테이블에서 조회
const getTodayData = async (sdkKey, startDate, endDate) => {
  const dailyQuery = `
  SELECT
  summary_date,
  city, age_group, gender, device_type, device_os,
  toUInt32( uniqMerge(unique_users_state)        ) AS users,
  toUInt32( uniqMerge(sessions_state)             ) AS sessions,
  toUInt64( sumMerge(session_duration_sum_state) ) AS session_duration_sum
    FROM klicklab.agg_user_session_stats
    WHERE summary_date >= '${startDate}' AND summary_date <= '${endDate}'
      AND sdk_key = '${sdkKey}'
  GROUP BY
  summary_date, city, age_group, gender, device_type, device_os;
  `;

  return await executeQuery(dailyQuery);
};

// 과거 데이터 조회 함수, FLAT 테이블에서 조회
const getPastData = async (sdkKey, startDate, endDate) => {
  const flatQuery = `
    SELECT
        summary_date,
        city,
        age_group,
        gender,
        device_type,
        device_os,

        /* 이미 집계된 값을 날짜·세그먼트별로 한 번 더 SUM */
        sum(users)                AS users,
        sum(sessions)             AS sessions,
        sum(session_duration_sum) AS session_duration_sum
    FROM klicklab.flat_user_session_stats
    WHERE summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY
        summary_date,
        city, age_group, gender,
        device_type, device_os
  `;
  return await executeQuery(flatQuery);
};

// flat과 aggregate 합치는 함수
function mergeSessionRows(...arrays) {
  const merged = {};

  const key = r =>
    `${r.summary_date}|${r.city}|${r.age_group}|${r.gender}|${r.device_type}|${r.device_os}`;

  arrays.flat().forEach(r => {
    const k = key(r);

    if (!merged[k]) {
      merged[k] = { ...r };          // 첫 등장 그대로 복사
    } else {
      merged[k].users                += r.users;
      merged[k].sessions             += r.sessions;
      merged[k].session_duration_sum += r.session_duration_sum;
    }
  });

  return Object.values(merged);
}

// 데이터 집계 함수 (일별, 시간별, 십분별 데이터 모두 합산)
const aggregateData = (dailyData, hourlyData, tenMinuteData) => {
  const aggregatedData = {};

  [...dailyData, ...hourlyData, ...tenMinuteData].forEach(item => {
    const key = `${item.segment_type}-${item.segment_value}-${item.dist_type || 'none'}-${item.dist_value || 'none'}`;

    if (!aggregatedData[key]) {
      aggregatedData[key] = { ...item };
    } else {
      aggregatedData[key].user_count = parseInt(aggregatedData[key].user_count) + parseInt(item.user_count);
    }
  });

  return Object.values(aggregatedData);
};

// 실시간 사용자 분석 데이터 (시간별/10분별/일별 집계)
router.get("/realtime-analytics", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;

  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    // 한국 시간대(UTC+9) 기준으로 today 계산
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);


    // 날짜 조건 확인
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;

    let result = [];
    let todayData = [];
    let pastData = [];

    if (isOnlyToday) {
      todayData = await getTodayData(sdk_key, startDate, endDate);   // ← 여기!
      result   = todayData;             // 이미 집계돼 있으므로 그대로 응답
    } else if (includesOnlyToday) {
      // 기간에 오늘이 포함된 경우 - 과거는 일별, 오늘은 시간별/십분별
      // 1. 과거 날짜들(startDate ~ 어제까지)의 일별 데이터 조회
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (startDate <= yesterdayStr) {
        todayData = await getTodayData(sdk_key, startDate, yesterdayStr);
      }

      // 2. 오늘의 시간별/십분별 데이터 조회
      pastData = await getPastData(sdk_key, startDate, endDate);

      result = mergeSessionRows(pastData, todayData);

    } else {
      // 과거 기간만 선택된 경우 - 일별 데이터만 사용
      result = await getPastData(sdk_key, startDate, endDate);
    }

    // 응답 데이터 생성
    // let dataSource = 'FLAT';
    // if (isOnlyToday) {
    //   dataSource = (hourlyData.length > 0 || tenMinuteData.length > 0) ? 'TODAY' : 'no-data';
    // } else if (includesOnlyToday) {
    //   dataSource = 'FLAT + AGG';
    // }

    res.status(200).json({
      data: result,
      meta: {
        isOnlyToday,
        includesOnlyToday,
        //dataSource,
        pastRecords  : pastData.length,
        todayRecords : todayData.length,
        currentTime: `${currentHour}:${currentMinute}`
      }
    });

  } catch (err) {
    console.error("Realtime Analytics API ERROR:", err);
    res.status(500).json({ error: "Failed to get realtime analytics data" });
  }

});

module.exports = router;
