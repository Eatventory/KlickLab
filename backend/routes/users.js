const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");

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
  
  console.log(`[shouldUseWeeklyData] 시작일: ${start.toISOString().slice(0, 10)} (${['일','월','화','수','목','금','토'][start.getDay()]})`);
  console.log(`[shouldUseWeeklyData] 종료일: ${end.toISOString().slice(0, 10)} (${['일','월','화','수','목','금','토'][end.getDay()]})`);
  console.log(`[shouldUseWeeklyData] 주 시작(월): ${startOfWeek.toISOString().slice(0, 10)}`);
  console.log(`[shouldUseWeeklyData] 주 종료(일): ${endOfWeek.toISOString().slice(0, 10)}`);
  console.log(`[shouldUseWeeklyData] 완전한 주(ISO 8601): ${isCompleteWeek}`);
  
  return isCompleteWeek;
};

// 실시간 사용자 분석 데이터 (시간별/10분별/일별/주별 집계)
router.get("/realtime-analytics", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`[Realtime Analytics] Date range: ${startDate} to ${endDate}`);
    console.log(`[Realtime Analytics] Current time: ${currentHour}:${currentMinute}`);
    console.log(`[Realtime Analytics] Using SDK key: ${sdk_key}`);
    
    // 오늘 날짜인지 확인
    const isToday = startDate === endDate && startDate === now.toISOString().slice(0, 10);
    
    // 주별 데이터 사용 여부 확인
    const useWeeklyData = shouldUseWeeklyData(startDate, endDate);
    
    let hourlyData = [];
    let tenMinuteData = [];
    
    if (isToday) {
      // 오늘인 경우: 실제 데이터가 있는 시간대만 확인
      console.log(`[Realtime Analytics] Processing today's data for ${startDate}`);
      
      // 먼저 실제 데이터가 있는 시간대를 확인 (시간별 + 10분별)
      const availableTimesQuery = `
        SELECT DISTINCT date_time, count(*) as record_count
        FROM klicklab.hourly_user_distribution
        WHERE toDate(date_time) = toDate('${startDate}')
          AND sdk_key = '${sdk_key}'
        GROUP BY date_time
        ORDER BY date_time DESC
      `;
      
      const availableMinutesQuery = `
        SELECT DISTINCT date_time, count(*) as record_count
        FROM klicklab.minutes_user_distribution
        WHERE toDate(date_time) = toDate('${startDate}')
          AND sdk_key = '${sdk_key}'
        GROUP BY date_time
        ORDER BY date_time DESC
      `;
      
      let availableTimes = [];
      let availableMinutes = [];
      
      try {
        const timesResult = await clickhouse.query({ query: availableTimesQuery, format: "JSON" }).then(r => r.json());
        availableTimes = timesResult.data.map(row => row.date_time);
        console.log(`[Realtime Analytics] Available HOURLY times for today:`, availableTimes);
      } catch (err) {
        console.error(`[Realtime Analytics] Failed to get available hourly times:`, err.message);
        availableTimes = [];
      }
      
      try {
        const minutesResult = await clickhouse.query({ query: availableMinutesQuery, format: "JSON" }).then(r => r.json());
        availableMinutes = minutesResult.data.map(row => row.date_time);
        console.log(`[Realtime Analytics] Available MINUTE times for today:`, availableMinutes);
      } catch (err) {
        console.error(`[Realtime Analytics] Failed to get available minute times:`, err.message);
        availableMinutes = [];
      }
      
      // 1. 실제 데이터가 있는 시간대만 처리
      for (const availableTime of availableTimes) {
        const dateTimeHour = availableTime;
        
        const hourlyQuery = `
          SELECT 
            segment_type,
            segment_value,
            dist_type,
            dist_value,
            sum(user_count) as user_count
          FROM klicklab.hourly_user_distribution
          WHERE date_time = '${dateTimeHour}'
            AND sdk_key = '${sdk_key}'
            AND segment_value != 'unknown'
            AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
          GROUP BY segment_type, segment_value, dist_type, dist_value
        `;
        
        // 첫 번째 시간대에서만 테이블 구조 확인 (디버깅용)
        if (availableTime === availableTimes[0]) {
          console.log(`[Realtime Analytics] === DEBUGGING TABLE STRUCTURE ===`);
          
          // 1. 테이블 구조 확인
          const tableQuery = `DESCRIBE klicklab.hourly_user_distribution`;
          console.log(`[DEBUG] Table structure query:`, tableQuery);
          
          try {
            const tableResult = await clickhouse.query({ query: tableQuery, format: "JSON" }).then(r => r.json());
            console.log(`[DEBUG] Table structure:`, tableResult.data);
          } catch (err) {
            console.error(`[DEBUG] Table structure failed:`, err.message);
          }
          
          // 2. 오늘 날짜의 모든 시간대 확인
          const allTimesQuery = `
            SELECT DISTINCT date_time, count(*) as record_count
            FROM klicklab.hourly_user_distribution
            WHERE toDate(date_time) = toDate('2025-07-19')
              AND sdk_key = '${sdk_key}'
            GROUP BY date_time
            ORDER BY date_time
          `;
          console.log(`[DEBUG] All times for today:`, allTimesQuery);
          
          try {
            const allTimesResult = await clickhouse.query({ query: allTimesQuery, format: "JSON" }).then(r => r.json());
            console.log(`[DEBUG] Available times:`, allTimesResult.data);
          } catch (err) {
            console.error(`[DEBUG] All times query failed:`, err.message);
          }
          
          // 3. 다른 테이블들 확인
          const tablesQuery = `
            SELECT name 
            FROM system.tables 
            WHERE database = 'klicklab' 
              AND name LIKE '%distribution%'
          `;
          console.log(`[DEBUG] Available distribution tables:`, tablesQuery);
          
          try {
            const tablesResult = await clickhouse.query({ query: tablesQuery, format: "JSON" }).then(r => r.json());
            console.log(`[DEBUG] Distribution tables:`, tablesResult.data);
          } catch (err) {
            console.error(`[DEBUG] Tables query failed:`, err.message);
          }
        }
        
        console.log(`[Realtime Analytics] Executing hourly query for ${dateTimeHour}:`);
        console.log(hourlyQuery);
        
        try {
          const result = await clickhouse.query({ query: hourlyQuery, format: "JSON" }).then(r => r.json());
          console.log(`[Realtime Analytics] Hourly query result for ${dateTimeHour}: ${result.data.length} records`);
          if (result.data.length > 0) {
            console.log(`[Realtime Analytics] Sample hourly data:`, result.data.slice(0, 3));
          }
          hourlyData.push(...result.data);
        } catch (err) {
          console.warn(`Failed to fetch hourly data for ${dateTimeHour}:`, err.message);
        }
      }
      
      // 2. 실제 데이터가 있는 10분별 시간대 처리
      for (const availableMinute of availableMinutes) {
        const dateTimeTenMin = availableMinute;
        
        const tenMinQuery = `
          SELECT 
            segment_type,
            segment_value,
            dist_type,
            dist_value,
            sum(user_count) as user_count
          FROM klicklab.minutes_user_distribution
          WHERE date_time = '${dateTimeTenMin}'
            AND sdk_key = '${sdk_key}'
            AND segment_value != 'unknown'
            AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
          GROUP BY segment_type, segment_value, dist_type, dist_value
        `;
        
        try {
          const result = await clickhouse.query({ query: tenMinQuery, format: "JSON" }).then(r => r.json());
          tenMinuteData.push(...result.data);
        } catch (err) {
          console.warn(`Failed to fetch 10-minute data for ${currentHourString}:${minute}:`, err.message);
        }
      }
      
    } else if (useWeeklyData) {
      // 주별 데이터 사용 (일요일~토요일 전체 주)
      console.log(`[Realtime Analytics] Using weekly data for period: ${startDate} to ${endDate}`);
      
      const weeklyQuery = `
      SELECT
          segment_type,
          segment_value,
          dist_type,
          dist_value,
          sum(user_count) as user_count
        FROM klicklab.weekly_user_distribution
        WHERE date >= toDate('${startDate}') AND date <= toDate('${endDate}')
        AND sdk_key = '${sdk_key}'
          AND segment_value != 'unknown'
          AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
        GROUP BY segment_type, segment_value, dist_type, dist_value
      `;
      
      const result = await clickhouse.query({ query: weeklyQuery, format: "JSON" }).then(r => r.json());
      hourlyData = result.data;
      
    } else {
      // 일별 데이터 사용 (어제, 며칠간 등)
      console.log(`[Realtime Analytics] Using daily data for period: ${startDate} to ${endDate}`);
      
      const dailyQuery = `
      SELECT
          segment_type,
          segment_value,
          dist_type,
          dist_value,
          sum(user_count) as user_count
        FROM klicklab.daily_user_distribution
        WHERE date >= toDate('${startDate}') AND date <= toDate('${endDate}')
        AND sdk_key = '${sdk_key}'
          AND segment_value != 'unknown'
          AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
        GROUP BY segment_type, segment_value, dist_type, dist_value
      `;
      
      const result = await clickhouse.query({ query: dailyQuery, format: "JSON" }).then(r => r.json());
      hourlyData = result.data;
    }
    
    // 3. 데이터 집계 (시간별 + 10분별 데이터 합치기)
    const aggregatedData = {};
    
    // 시간별 데이터 집계
    hourlyData.forEach(row => {
      const key = `${row.segment_type}|${row.segment_value}|${row.dist_type || ''}|${row.dist_value || ''}`;
      if (!aggregatedData[key]) {
        aggregatedData[key] = { ...row, user_count: 0 };
      }
      aggregatedData[key].user_count += parseInt(row.user_count);
    });
    
    // 10분별 데이터 추가 집계 (오늘인 경우에만)
    tenMinuteData.forEach(row => {
      const key = `${row.segment_type}|${row.segment_value}|${row.dist_type || ''}|${row.dist_value || ''}`;
      if (!aggregatedData[key]) {
        aggregatedData[key] = { ...row, user_count: 0 };
      }
      aggregatedData[key].user_count += parseInt(row.user_count);
    });
    
    // 4. 결과 포맷팅
    let result = Object.values(aggregatedData);
    
    // 6. 데이터가 없을 경우 일별 데이터로 fallback (오늘의 경우)
    if (result.length === 0 && isToday) {
      console.log(`[Realtime Analytics] No hourly/10min data found for today, falling back to daily data`);
      
      // 먼저 오늘 일별 데이터 시도
      const dailyFallbackQuery = `
      SELECT
          segment_type,
          segment_value,
        dist_type,
        dist_value,
          sum(user_count) as user_count
        FROM klicklab.daily_user_distribution
        WHERE date = toDate('${startDate}')
        AND sdk_key = '${sdk_key}'
          AND segment_value != 'unknown'
          AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
        GROUP BY segment_type, segment_value, dist_type, dist_value
      `;
      
      try {
        const fallbackResult = await clickhouse.query({ query: dailyFallbackQuery, format: "JSON" }).then(r => r.json());
        result.push(...fallbackResult.data);
        console.log(`[Realtime Analytics] Fallback daily data: ${fallbackResult.data.length} records`);
        
        // 오늘 일별 데이터도 없으면 최근 7일 중 가장 최근 데이터 사용
        if (result.length === 0) {
          console.log(`[Realtime Analytics] No daily data for today, trying recent 7 days`);
          
          const recent7DaysQuery = `
            SELECT 
              segment_type,
              segment_value,
              dist_type,
              dist_value,
              sum(user_count) as user_count
            FROM klicklab.daily_user_distribution
            WHERE date >= toDate('${startDate}') - INTERVAL 7 DAY
              AND date < toDate('${startDate}')
              AND sdk_key = '${sdk_key}'
              AND segment_value != 'unknown'
              AND (segment_type != 'user_gender' OR segment_value IN ('male', 'female'))
            GROUP BY segment_type, segment_value, dist_type, dist_value
            ORDER BY segment_type, segment_value
          `;
          
          const recentResult = await clickhouse.query({ query: recent7DaysQuery, format: "JSON" }).then(r => r.json());
          result.push(...recentResult.data);
          console.log(`[Realtime Analytics] Recent 7 days fallback data: ${recentResult.data.length} records`);
        }
      } catch (err) {
        console.warn(`Failed to fetch fallback daily data:`, err.message);
      }
    }
    
    console.log(`[Realtime Analytics] Total records: ${result.length}`);
    console.log(`[Realtime Analytics] Data source: ${isToday ? (result.length > 0 ? 'hourly+10min' : 'daily-fallback') : useWeeklyData ? 'weekly' : 'daily'}`);
    console.log(`[Realtime Analytics] Hourly records: ${hourlyData.length}, 10-min records: ${tenMinuteData.length}`);
    
    // 실제 반환 데이터 샘플 로그
    if (result.length > 0) {
      console.log(`[Realtime Analytics] Sample data (first 5 records):`, result.slice(0, 5));
      
      // 세그먼트별 데이터 개수 확인
      const segmentCounts = {};
      result.forEach(row => {
        const segmentType = row.segment_type;
        if (!segmentCounts[segmentType]) segmentCounts[segmentType] = 0;
        segmentCounts[segmentType]++;
      });
      console.log(`[Realtime Analytics] Segment counts:`, segmentCounts);
      
      // 각 세그먼트별 샘플 데이터 표시
      const uniqueSegments = [...new Set(result.map(row => row.segment_type))];
      uniqueSegments.forEach(segmentType => {
        const segmentData = result.filter(row => row.segment_type === segmentType).slice(0, 2);
        console.log(`[Realtime Analytics] ${segmentType} sample:`, segmentData);
      });
    } else {
      console.log(`[Realtime Analytics] No data to return`);
    }
    
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
