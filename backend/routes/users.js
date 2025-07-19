const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");

// 상수 정의
const GENDER_FILTER = "AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))";
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

// 주별 데이터를 사용할지 판단하는 함수 (ISO 8601 기준, 월요일 시작)
const shouldUseWeeklyData = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // ISO 8601 기준: 월요일을 주의 시작으로 설정
  const startOfWeek = new Date(start);
  const dayOffset = (start.getDay() + 6) % 7; // 월요일로 이동하기 위한 오프셋
  startOfWeek.setDate(start.getDate() - dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 일요일로 이동
  endOfWeek.setHours(23, 59, 59, 999);
  
  // 선택된 기간이 정확히 한 주(월요일~일요일)인지 엄격하게 확인
  const isCompleteWeek = start.getTime() === startOfWeek.getTime() && 
                        end.getDate() === endOfWeek.getDate() &&
                        end.getMonth() === endOfWeek.getMonth() &&
                        end.getFullYear() === endOfWeek.getFullYear();
  
  return isCompleteWeek;
};

// 시간별 데이터 조회 함수
const getHourlyData = async (sdkKey, availableTimes) => {
  const hourlyData = [];
  
  for (const availableTime of availableTimes) {
    const hourlyQuery = `
      SELECT ${SELECT_FIELDS}
      FROM klicklab.hourly_user_distribution
      WHERE date_time = '${availableTime}'
        AND sdk_key = '${sdkKey}'
        ${UNKNOWN_FILTER}
        ${GENDER_FILTER}
      ${GROUP_BY_FIELDS}
    `;
    
    try {
      const result = await executeQuery(hourlyQuery);
      hourlyData.push(...result);
    } catch (err) {
      console.warn(`Failed to fetch hourly data for ${availableTime}:`, err.message);
    }
  }
  
  return hourlyData;
};

// 10분 단위 데이터 조회 함수
const getTenMinuteData = async (sdkKey, startDate, currentHour, currentMinute) => {
  const tenMinuteData = [];
  const currentHourString = currentHour.toString().padStart(2, '0');
  
  // 현재 시간의 0분, 10분, 20분, 30분, 40분, 50분대 데이터만 조회
  for (let minute = 0; minute <= 50; minute += 10) {
    if (minute > currentMinute) break; // 현재 시각 이후는 조회하지 않음
    
    const minuteString = minute.toString().padStart(2, '0');
    const dateTime = `${startDate} ${currentHourString}:${minuteString}:00`;
    
    const tenMinuteQuery = `
      SELECT ${SELECT_FIELDS}
      FROM klicklab.minutes_user_distribution
      WHERE date_time = '${dateTime}'
        AND sdk_key = '${sdkKey}'
        ${UNKNOWN_FILTER}
        ${GENDER_FILTER}
      ${GROUP_BY_FIELDS}
    `;
    
    try {
      const result = await executeQuery(tenMinuteQuery);
      tenMinuteData.push(...result);
    } catch (err) {
      console.warn(`Failed to fetch 10-minute data for ${currentHour}:${currentMinute}:`, err.message);
    }
  }
  
  return tenMinuteData;
};

// 주별 데이터 조회 함수
const getWeeklyData = async (sdkKey, startDate, endDate) => {
  const weeklyQuery = `
    SELECT ${SELECT_FIELDS}
    FROM klicklab.weekly_user_distribution
    WHERE week_start_date = '${startDate}'
      AND week_end_date = '${endDate}'
      AND sdk_key = '${sdkKey}'
      ${UNKNOWN_FILTER}
      ${GENDER_FILTER}
    ${GROUP_BY_FIELDS}
  `;
  
  return await executeQuery(weeklyQuery);
};

// 일별 데이터 조회 함수
const getDailyData = async (sdkKey, startDate, endDate) => {
  const dailyQuery = `
    SELECT ${SELECT_FIELDS}
    FROM klicklab.daily_user_distribution
    WHERE date >= '${startDate}' AND date <= '${endDate}'
      AND sdk_key = '${sdkKey}'
      ${UNKNOWN_FILTER}
      ${GENDER_FILTER}
    ${GROUP_BY_FIELDS}
  `;
  
  return await executeQuery(dailyQuery);
};

// 폴백 데이터 조회 함수
const getFallbackData = async (sdkKey, startDate) => {
  // 먼저 오늘 일별 데이터 시도
  const dailyFallbackQuery = `
    SELECT ${SELECT_FIELDS}
    FROM klicklab.daily_user_distribution
    WHERE date = toDate('${startDate}')
      AND sdk_key = '${sdkKey}'
      ${UNKNOWN_FILTER}
      ${GENDER_FILTER}
    ${GROUP_BY_FIELDS}
  `;
  
  let result = await executeQuery(dailyFallbackQuery);
  
  // 오늘 일별 데이터도 없으면 최근 7일 중 가장 최근 데이터 사용
  if (result.length === 0) {
    const recent7DaysQuery = `
      SELECT ${SELECT_FIELDS}
      FROM klicklab.daily_user_distribution
      WHERE date >= toDate('${startDate}') - INTERVAL 7 DAY
        AND date < toDate('${startDate}')
        AND sdk_key = '${sdkKey}'
        ${UNKNOWN_FILTER}
        ${GENDER_FILTER}
      ${GROUP_BY_FIELDS}
      ORDER BY segment_type, segment_value
    `;
    
    result = await executeQuery(recent7DaysQuery);
  }
  
  return result;
};

// 데이터 집계 함수
const aggregateData = (hourlyData, tenMinuteData) => {
  const aggregatedData = {};
  
  [...hourlyData, ...tenMinuteData].forEach(item => {
    const key = `${item.segment_type}-${item.segment_value}-${item.dist_type || 'none'}-${item.dist_value || 'none'}`;
    
    if (!aggregatedData[key]) {
      aggregatedData[key] = { ...item };
    } else {
      aggregatedData[key].user_count = parseInt(aggregatedData[key].user_count) + parseInt(item.user_count);
    }
  });
  
  return Object.values(aggregatedData);
};

// 실시간 사용자 분석 데이터 (시간별/10분별/일별/주별 집계)
router.get("/realtime-analytics", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 날짜 조건 확인
    const isToday = startDate === endDate && startDate === now.toISOString().slice(0, 10);
    const useWeeklyData = shouldUseWeeklyData(startDate, endDate);
    
    let result = [];
    let hourlyData = [];
    let tenMinuteData = [];
    
    if (isToday) {
      // 오늘 데이터 처리
      const availableTimesQuery = `
        SELECT DISTINCT date_time
        FROM klicklab.hourly_user_distribution
        WHERE toDate(date_time) = toDate('${startDate}')
          AND sdk_key = '${sdk_key}'
        ORDER BY date_time DESC
      `;
      
      const availableTimes = await executeQuery(availableTimesQuery);
      const timesList = availableTimes.map(row => row.date_time);
      
      // 시간별 데이터 수집
      hourlyData = await getHourlyData(sdk_key, timesList);
      
      // 10분 단위 데이터 수집
      tenMinuteData = await getTenMinuteData(sdk_key, startDate, currentHour, currentMinute);
      
      // 데이터 집계
      result = aggregateData(hourlyData, tenMinuteData);
      
      // 데이터가 없으면 폴백 데이터 사용
      if (result.length === 0) {
        result = await getFallbackData(sdk_key, startDate);
      }
      
    } else if (useWeeklyData) {
      // 주별 데이터 처리
      result = await getWeeklyData(sdk_key, startDate, endDate);
      
    } else {
      // 일별 데이터 처리
      result = await getDailyData(sdk_key, startDate, endDate);
    }
    
    // 응답 데이터 생성
    const dataSource = isToday ? 
      (hourlyData.length > 0 || tenMinuteData.length > 0 ? 'hourly+10min' : 'daily-fallback') : 
      useWeeklyData ? 'weekly' : 'daily';

    res.status(200).json({ 
      data: result,
      meta: {
        isToday,
        useWeeklyData,
        dataSource,
        hourlyRecords: hourlyData.length,
        tenMinuteRecords: tenMinuteData.length,
        currentTime: `${currentHour}:${currentMinute}`
      }
    });
    
  } catch (err) {
    console.error("Realtime Analytics API ERROR:", err);
    res.status(500).json({ error: "Failed to get realtime analytics data" });
  }
});

module.exports = router;
