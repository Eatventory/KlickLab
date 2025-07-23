const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");

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

// 오늘 데이터 조회 함수 (AGGREGATION 테이블)
const getTodayUserStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      toUInt32(uniqMerge(unique_users_state)) AS active_users,
      toUInt32(uniqMerge(sessions_state)) AS sessions,
      toUInt64(sumMerge(session_duration_sum_state)) AS session_duration_sum
    FROM klicklab.agg_user_session_stats
    WHERE summary_date >= '${startDate}' AND summary_date <= '${endDate}'
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date
  `;
  return await executeQuery(query);
};

// 과거 데이터 조회 함수 (FLAT 테이블)
const getPastUserStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      summary_hour,
      sum(users) AS active_users,
      sum(sessions) AS sessions,
      sum(session_duration_sum) AS session_duration_sum
    FROM klicklab.flat_user_session_stats
    WHERE summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date, summary_hour
    ORDER BY summary_date, summary_hour
  `;
  return await executeQuery(query);
};

// 오늘 트래픽 데이터 조회 (AGGREGATION 테이블)
const getTodayTrafficStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      traffic_source,
      traffic_medium,
      toUInt32(uniqMerge(users_state)) AS users
    FROM klicklab.agg_traffic_marketing_stats
    WHERE summary_date >= '${startDate}' AND summary_date <= '${endDate}'
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date, traffic_source, traffic_medium
  `;
  return await executeQuery(query);
};

// 과거 트래픽 데이터 조회 (FLAT 테이블)
const getPastTrafficStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      summary_hour,
      traffic_source,
      traffic_medium,
      sum(users) AS users
    FROM klicklab.flat_traffic_marketing_stats
    WHERE summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date, summary_hour, traffic_source, traffic_medium
    ORDER BY summary_date, summary_hour
  `;
  return await executeQuery(query);
};

// 오늘 페이지 데이터 조회 (AGGREGATION 테이블)
const getTodayPageStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      page_path,
      toUInt32(sumMerge(page_views_state)) AS page_views,
      toUInt32(uniqMerge(unique_page_views_state)) AS unique_page_views
    FROM klicklab.agg_page_content_stats
    WHERE summary_date >= '${startDate}' AND summary_date <= '${endDate}'
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date, page_path
  `;
  return await executeQuery(query);
};

// 과거 페이지 데이터 조회 (FLAT 테이블)
const getPastPageStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date,
      page_path,
      sum(page_views) AS page_views,
      sum(unique_page_views) AS unique_page_views
    FROM klicklab.flat_page_content_stats
    WHERE summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date, page_path
  `;
  return await executeQuery(query);
};

// 데이터 병합 함수
const mergeData = (...arrays) => {
  const merged = {};
  
  arrays.flat().forEach(item => {
    const key = `${item.summary_date}|${item.traffic_source || ''}|${item.traffic_medium || ''}|${item.page_path || ''}`;
    
    if (!merged[key]) {
      merged[key] = { ...item };
    } else {
      // 숫자 필드들 합산
      Object.keys(item).forEach(field => {
        if (typeof item[field] === 'number') {
          merged[key][field] = (merged[key][field] || 0) + item[field];
        }
      });
    }
  });
  
  return Object.values(merged);
};

// 실시간 데이터 API
router.get("/realtime", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  
  try {
    // 현재 한국 시간 기준으로 최근 3시간 데이터 조회
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    const currentHour = koreaTime.getHours();
    
    console.log('Korea time:', koreaTime.toISOString());
    console.log('Today:', today, 'Current hour:', currentHour);
    
    const [trendResult, locationResult] = await Promise.all([
      executeQuery(`
        SELECT
          summary_hour,
          uniqMerge(unique_users_state) as users
        FROM klicklab.agg_user_session_stats
        WHERE summary_date = parseDateTimeBestEffort('${today}')
          AND summary_hour >= ${Math.max(0, currentHour - 2)}
          AND summary_hour <= ${currentHour}
          AND sdk_key = '${sdk_key}'
        GROUP BY summary_hour
        ORDER BY summary_hour DESC
      `),
      executeQuery(`
        SELECT
          city,
          uniqMerge(unique_users_state) as users
        FROM klicklab.agg_user_session_stats
        WHERE summary_date = parseDateTimeBestEffort('${today}')
          AND summary_hour >= ${Math.max(0, currentHour - 2)}
          AND summary_hour <= ${currentHour}
          AND sdk_key = '${sdk_key}'
          AND city != ''
        GROUP BY city
        ORDER BY users DESC
        LIMIT 5
      `)
    ]);
    
    console.log('Trend result:', trendResult);
    
    // 최근 3시간의 시간별 데이터 생성
    const trendData = [];
    for (let i = 2; i >= 0; i--) {
      const hour = Math.max(0, currentHour - i);
      const hourStr = String(hour).padStart(2, '0');
      
      // 집계 테이블에서 반환된 데이터와 매칭
      const dataPoint = trendResult.find(r => parseInt(r.summary_hour) === hour);
      
      trendData.push({
        time: `${today}T${hourStr}:00`,
        users: dataPoint ? parseInt(dataPoint.users) || 0 : 0
      });
    }
    
    console.log('Final trend data:', trendData);
    
    // 지역 데이터 포맷팅
    const topLocations = locationResult.map(row => ({
      location: row.city,
      users: parseInt(row.users) || 0
    }));
    
    // 실제 활성 사용자 수 계산 (최근 3시간 합계)
    const activeUsers30min = trendResult.length > 0 
      ? trendResult.reduce((sum, row) => sum + (parseInt(row.users) || 0), 0)
      : 0;
    
    res.status(200).json({
      data: {
        activeUsers30min,
        trend: trendData,
        topLocations
      }
    });
    
  } catch (err) {
    console.error("Realtime API ERROR:", err);
    res.status(500).json({ error: "Failed to get realtime data" });
  }
});

// 사용자 통계 API
router.get("/user-stats", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    let todayData = [];
    let pastData = [];
    
    if (isOnlyToday) {
      todayData = await getTodayUserStats(sdk_key, startDate, endDate);
      result = todayData;
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      if (startDate <= yesterdayStr) {
        pastData = await getPastUserStats(sdk_key, startDate, yesterdayStr);
      }
      
      todayData = await getTodayUserStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastUserStats(sdk_key, startDate, endDate);
    }
    
    // KPI 계산
    const totalUsers = result.reduce((sum, row) => sum + (parseInt(row.active_users) || 0), 0);
    const totalSessions = result.reduce((sum, row) => sum + (parseInt(row.sessions) || 0), 0);
    const totalDuration = result.reduce((sum, row) => sum + (parseInt(row.session_duration_sum) || 0), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const conversionRate = totalSessions > 0 ? Math.round((totalSessions / totalUsers) * 100) : 0;
    
    res.status(200).json({
      data: {
        activeUsers: totalUsers,
        sessions: totalSessions,
        avgSessionDuration,
        conversionRate,
        engagedSessions: totalSessions // sessions와 동일하게 설정
      },
      changes: {
        activeUsers: 5.2, // 임시 값
        sessions: 3.8,
        avgSessionDuration: -2.1,
        conversionRate: 1.5,
        engagedSessions: 3.8
      }
    });
    
  } catch (err) {
    console.error("User Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get user stats data" });
  }
});

// 트래픽 통계 API
router.get("/traffic-stats", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    let todayData = [];
    let pastData = [];
    
    if (isOnlyToday) {
      todayData = await getTodayTrafficStats(sdk_key, startDate, endDate);
      result = todayData;
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      if (startDate <= yesterdayStr) {
        pastData = await getPastTrafficStats(sdk_key, startDate, yesterdayStr);
      }
      
      todayData = await getTodayTrafficStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastTrafficStats(sdk_key, startDate, endDate);
    }
    
    // 소스별 집계
    const sourceStats = {};
    result.forEach(row => {
      const source = row.traffic_source || 'direct';
      if (!sourceStats[source]) {
        sourceStats[source] = 0;
      }
      // 명시적으로 숫자로 변환
      const users = parseInt(row.users) || 0;
      sourceStats[source] += users;
    });
    
    const trafficSources = Object.entries(sourceStats)
      .map(([source, users]) => ({ 
        source, 
        users: parseInt(users) || 0 
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
    
    res.status(200).json({
      data: {
        trafficSources
      }
    });
    
  } catch (err) {
    console.error("Traffic Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get traffic stats data" });
  }
});

// 페이지 통계 API
router.get("/page-stats", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    let todayData = [];
    let pastData = [];
    
    if (isOnlyToday) {
      todayData = await getTodayPageStats(sdk_key, startDate, endDate);
      result = todayData;
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      if (startDate <= yesterdayStr) {
        pastData = await getPastPageStats(sdk_key, startDate, yesterdayStr);
      }
      
      todayData = await getTodayPageStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastPageStats(sdk_key, startDate, endDate);
    }
    
    // 페이지별 집계
    const pageStats = {};
    result.forEach(row => {
      const page = row.page_path;
      if (!pageStats[page]) {
        pageStats[page] = 0;
      }
      // 명시적으로 숫자로 변환
      const views = parseInt(row.page_views) || 0;
      pageStats[page] += views;
    });
    
    const topPages = Object.entries(pageStats)
      .map(([page, views]) => ({ 
        page, 
        views: parseInt(views) || 0 
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    res.status(200).json({
      data: {
        topPages
      }
    });
    
  } catch (err) {
    console.error("Page Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get page stats data" });
  }
});

// 이벤트 통계 API
router.get("/event-stats", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    // 성능상 이유로 이벤트 통계 비활성화하려면 아래 주석을 해제하세요
    // return res.status(200).json({ data: { topEvents: [] } });
    
    // 날짜 범위를 최근 7일로 제한 (성능 최적화)
    const now = new Date();
    const maxDaysBack = 7;
    const limitedStartDate = new Date(Math.max(
      new Date(startDate).getTime(),
      now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000
    ));
    
    const actualStartDate = limitedStartDate.toISOString().slice(0, 10);
    const actualEndDate = endDate;
    
    console.log(`Event stats query: ${actualStartDate} to ${actualEndDate}`);
    
    const query = `
      SELECT
        event_name,
        count() as count
      FROM klicklab.events
      WHERE sdk_key = '${sdk_key}'
        AND timestamp >= parseDateTimeBestEffort('${actualStartDate} 00:00:00') 
        AND timestamp <= parseDateTimeBestEffort('${actualEndDate} 23:59:59')
        AND event_name != ''
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const result = await executeQuery(query);
    
    const topEvents = result.map(row => ({
      event: row.event_name,
      count: parseInt(row.count) || 0
    }));
    
    res.status(200).json({
      data: {
        topEvents
      }
    });
    
  } catch (err) {
    console.error("Event Stats API ERROR:", err);
    res.status(500).json({ error: "Failed to get event stats data" });
  }
});

module.exports = router;