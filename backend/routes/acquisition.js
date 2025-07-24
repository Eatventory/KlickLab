const express = require('express');
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

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

// 오늘 데이터 조회 (Aggregating 테이블)
const getTodayUserSessionStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      toDate(summary_date) as date,
      summary_hour as hour,
      city,
      age_group,
      gender,
      device_type,
      device_os,
      browser,
      uniqMerge(unique_users_state) as unique_users,
      uniqMerge(sessions_state) as sessions,
      sumMerge(session_duration_sum_state) as session_duration_sum
    FROM klicklab.agg_user_session_stats
    WHERE summary_date >= parseDateTimeBestEffort('${startDate}')
      AND summary_date <= parseDateTimeBestEffort('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY date, hour, city, age_group, gender, device_type, device_os, browser
    ORDER BY date, hour
  `;
  return await executeQuery(query);
};

const getTodayTrafficMarketingStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      toDate(summary_date) as date,
      summary_hour as hour,
      traffic_source,
      traffic_medium,
      traffic_campaign,
      landing_page,
      uniqMerge(users_state) as users,
      uniqMerge(sessions_state) as sessions,
      uniqMerge(bounced_sessions_state) as bounced_sessions,
      sumMerge(conversions_state) as conversions,
      sumMerge(conversion_value_sum_state) as conversion_value_sum,
      uniqMerge(funnel_visit_users_state) as funnel_visits,
      uniqMerge(funnel_engage_users_state) as funnel_engaged,
      uniqMerge(funnel_convert_users_state) as funnel_converted
    FROM klicklab.agg_traffic_marketing_stats
    WHERE summary_date >= parseDateTimeBestEffort('${startDate}')
      AND summary_date <= parseDateTimeBestEffort('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY date, hour, traffic_source, traffic_medium, traffic_campaign, landing_page
    ORDER BY date, hour
  `;
  return await executeQuery(query);
};

// 과거 데이터 조회 (Flat 테이블) - 세부 속성 포함 (다른 그래프들을 위해)
const getPastUserSessionStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      summary_hour as hour,
      city,
      age_group,
      gender,
      device_type,
      device_os,
      browser,
      users as unique_users,
      sessions,
      session_duration_sum
    FROM klicklab.flat_user_session_stats
    WHERE summary_date >= parseDateTimeBestEffort('${startDate}')
      AND summary_date <= parseDateTimeBestEffort('${endDate}')
      AND sdk_key = '${sdkKey}'
    ORDER BY date, hour
  `;
  return await executeQuery(query);
};

const getPastTrafficMarketingStats = async (sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      summary_hour as hour,
      traffic_source,
      traffic_medium,
      traffic_campaign,
      landing_page,
      users,
      sessions,
      bounced_sessions,
      conversions,
      conversion_value_sum,
      funnel_visits,
      funnel_engaged,
      funnel_converted
    FROM klicklab.flat_traffic_marketing_stats
    WHERE summary_date >= parseDateTimeBestEffort('${startDate}')
      AND summary_date <= parseDateTimeBestEffort('${endDate}')
      AND sdk_key = '${sdkKey}'
    ORDER BY date, hour
  `;
  return await executeQuery(query);
};

// 데이터 병합 함수
const mergeData = (...arrays) => {
  return arrays.flat().filter(Boolean);
};

// 1. Overview API (KPI 데이터)
router.get("/overview", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let userResult = [];
    let trafficResult = [];
    
    if (isOnlyToday) {
      userResult = await getTodayUserSessionStats(sdk_key, startDate, endDate);
      trafficResult = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastUserData = [];
      let pastTrafficData = [];
      if (startDate <= yesterdayStr) {
        pastUserData = await getPastUserSessionStats(sdk_key, startDate, yesterdayStr);
        pastTrafficData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayUserData = await getTodayUserSessionStats(sdk_key, today, today);
      const todayTrafficData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      userResult = mergeData(pastUserData, todayUserData);
      trafficResult = mergeData(pastTrafficData, todayTrafficData);
    } else {
      userResult = await getPastUserSessionStats(sdk_key, startDate, endDate);
      trafficResult = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
    }
    
    // 유입 관련 KPI 계산 (trafficResult 기반)
    const trafficDateGrouped = {};
    const directTrafficByDate = {};
    
    trafficResult.forEach(row => {
      const date = row.date;
      const isDirectTraffic = (row.traffic_source === 'direct' || row.traffic_source === '(direct)' || !row.traffic_source);
      
      if (!trafficDateGrouped[date]) {
        trafficDateGrouped[date] = { visits: 0, engaged: 0, converted: 0 };
        directTrafficByDate[date] = 0;
      }
      
      // 마케팅 관점: Direct를 제외한 마케팅 채널만 유입으로 계산
      if (!isDirectTraffic) {
        trafficDateGrouped[date].visits += parseInt(row.funnel_visits) || 0;
        trafficDateGrouped[date].engaged += parseInt(row.funnel_engaged) || 0;
        trafficDateGrouped[date].converted += parseInt(row.funnel_converted) || 0;
      }
      
      if (isDirectTraffic) {
        directTrafficByDate[date] += parseInt(row.funnel_visits) || 0;
      }
    });

    const totalVisits = Object.values(trafficDateGrouped).reduce((sum, data) => sum + data.visits, 0);
    const totalEngaged = Object.values(trafficDateGrouped).reduce((sum, data) => sum + data.engaged, 0);
    const totalConverted = Object.values(trafficDateGrouped).reduce((sum, data) => sum + data.converted, 0);
    const totalDirectVisits = Object.values(directTrafficByDate).reduce((sum, visits) => sum + visits, 0);
    
    // 유입 관련 지표 계산
    const engagementRate = totalVisits > 0 ? Math.round((totalEngaged / totalVisits) * 100) : 0;
    const directTrafficRate = totalVisits > 0 ? Math.round((totalDirectVisits / totalVisits) * 100) : 0;
    
    res.status(200).json({
      // 프론트엔드 KPI 카드용 필드 - 유입 관련 지표로 변경
      active_users: totalVisits,          // 유입 사용자 (유입 창구를 통해 들어온 사용자)
      converted_users: totalConverted,    // 전환 사용자
      
      // 추가 유입 관련 지표들
      engaged_users: totalEngaged,        // 참여 사용자
      engagement_rate: engagementRate,    // 참여율 (%)
      direct_traffic_rate: directTrafficRate, // 직접 유입 비율 (%)
      total_visits: totalVisits,          // 총 방문 수
      direct_visits: totalDirectVisits,   // 직접 유입 방문 수
      
      // 기존 필드 유지 (호환성)
      totalUsers: totalVisits,            // 유입 사용자로 변경
      totalSessions: totalVisits,         // 유입 방문으로 변경
      avgSessionDuration: engagementRate, // 참여율로 변경
      bounceRate: directTrafficRate       // 직접 유입 비율 (%)
    });
    
  } catch (err) {
    console.error("Acquisition Overview API ERROR:", err);
    res.status(500).json({ error: "Failed to get acquisition overview data" });
  }
});

// 2. Hourly Trend API
router.get("/hourly-trend", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    
    if (isOnlyToday) {
      // 오늘 데이터: 시간별로 표시
      const result = await getTodayUserSessionStats(sdk_key, startDate, endDate);
      
      // 시간별 데이터 집계 (0-23시)
      const hourlyData = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = {
          hour: String(i).padStart(2, '0'),
          total_users: 0,
          new_users: 0,
          existing_users: 0
        };
      }
      
      result.forEach(row => {
        const hour = parseInt(row.hour) || 0;
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].total_users += parseInt(row.unique_users) || 0;
          // AGG 테이블에는 신규/기존 구분이 없으므로 전체를 신규로 처리
          hourlyData[hour].new_users += parseInt(row.unique_users) || 0;
          hourlyData[hour].existing_users = 0;
        }
      });
      
      const hourlyTrend = Object.values(hourlyData);
      res.status(200).json(hourlyTrend);
      
    } else {
      // 과거 데이터도 시간별로 집계
      const includesOnlyToday = startDate <= today && endDate >= today;
      let result = [];
      
      if (includesOnlyToday) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        
        let pastData = [];
        if (startDate <= yesterdayStr) {
          pastData = await getPastUserSessionStats(sdk_key, startDate, yesterdayStr);
        }
        
        const todayData = await getTodayUserSessionStats(sdk_key, today, today);
        result = mergeData(pastData, todayData);
      } else {
        result = await getPastUserSessionStats(sdk_key, startDate, endDate);
      }
      
      // 시간별 데이터 집계 (0-23시) - 전체 기간 합산
      const hourlyData = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = {
          hour: String(i).padStart(2, '0'),
          total_users: 0,
          new_users: 0,
          existing_users: 0
        };
      }
      
      result.forEach(row => {
        const hour = parseInt(row.hour) || 0;
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].total_users += parseInt(row.unique_users) || 0;
          hourlyData[hour].new_users += parseInt(row.unique_users) || 0;
          hourlyData[hour].existing_users = 0;
        }
      });
      
      const hourlyTrend = Object.values(hourlyData);
      res.status(200).json(hourlyTrend);
    }
    
  } catch (err) {
    console.error("Hourly Trend API ERROR:", err);
    res.status(500).json({ error: "Failed to get hourly trend data" });
  }
});

// 3. Top Channels API
router.get("/top-channels", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
    }
    
    // 채널별 집계
    const channelStats = {};
    result.forEach(row => {
      const source = row.traffic_source || 'direct';
      if (!channelStats[source]) {
        channelStats[source] = {
          channel: source,
          users: 0,
          clicks: 0  // AGG 테이블에 없으므로 0으로 처리
        };
      }
      channelStats[source].users += parseInt(row.users) || 0;
    });
    
    const topChannels = Object.values(channelStats)
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
    
    res.status(200).json(topChannels);
    
  } catch (err) {
    console.error("Top Channels API ERROR:", err);
    res.status(500).json({ error: "Failed to get top channels data" });
  }
});

// 4. Platform Analysis API (Device & Browser)
router.get("/platform-analysis", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayUserSessionStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastUserSessionStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayUserSessionStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastUserSessionStats(sdk_key, startDate, endDate);
    }
    
    // 디바이스 매핑 (태블릿을 모바일로 분류)
    const deviceMapping = {
      'mobile': 'mobile',
      'desktop': 'desktop', 
      'tablet': 'mobile',  // 태블릿을 모바일로 분류
      'unknown': 'desktop'
    };
    
    // 실제 브라우저 데이터 사용 (OS 매핑 제거)
    
    // 디바이스별 집계
    const deviceStats = {};
    const browserStats = {};
    
    result.forEach(row => {
      const deviceType = row.device_type || 'unknown';
      const browserName = row.browser || 'Unknown';  // 실제 브라우저 데이터 사용
      const users = parseInt(row.unique_users) || 0;
      
      if (users > 0) {
        // 디바이스 통계 (태블릿을 모바일로 분류)
        const mappedDevice = deviceMapping[deviceType.toLowerCase()] || 'desktop';
        if (!deviceStats[mappedDevice]) {
          deviceStats[mappedDevice] = {
            type: mappedDevice,
            users: 0
          };
        }
        deviceStats[mappedDevice].users += users;
        
        // 브라우저 통계 (실제 브라우저 데이터 사용)
        if (!browserStats[browserName]) {
          browserStats[browserName] = {
            name: browserName,
            users: 0
          };
        }
        browserStats[browserName].users += users;
      }
    });
    
    const deviceData = Object.values(deviceStats)
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);
    
    const browserData = Object.values(browserStats)
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);
    
    res.status(200).json({
      device: deviceData,
      browser: browserData
    });
    
  } catch (err) {
    console.error("Platform Analysis API ERROR:", err);
    res.status(500).json({ error: "Failed to get platform analysis data" });
  }
});

// 5. Funnel Conversion API
router.get("/funnel-conversion", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
    }
    
    // 퍼널 단계별 집계
    const funnelData = [
      {
        step: '방문',
        users: result.reduce((sum, row) => sum + (parseInt(row.funnel_visits) || 0), 0)
      },
      {
        step: '참여',
        users: result.reduce((sum, row) => sum + (parseInt(row.funnel_engaged) || 0), 0)
      },
      {
        step: '전환',
        users: result.reduce((sum, row) => sum + (parseInt(row.funnel_converted) || 0), 0)
      }
    ];
    
    res.status(200).json(funnelData);
    
  } catch (err) {
    console.error("Funnel Conversion API ERROR:", err);
    res.status(500).json({ error: "Failed to get funnel conversion data" });
  }
});

// 6. Channel Groups API
router.get("/channel-groups", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let trafficResult = [];
    let userResult = [];
    
    if (isOnlyToday) {
      trafficResult = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
      userResult = await getTodayUserSessionStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastTrafficData = [];
      let pastUserData = [];
      if (startDate <= yesterdayStr) {
        pastTrafficData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
        pastUserData = await getPastUserSessionStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayTrafficData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      const todayUserData = await getTodayUserSessionStats(sdk_key, today, today);
      trafficResult = mergeData(pastTrafficData, todayTrafficData);
      userResult = mergeData(pastUserData, todayUserData);
    } else {
      trafficResult = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
      userResult = await getPastUserSessionStats(sdk_key, startDate, endDate);
    }
    
    // 채널별 디바이스 집계 - 수정된 로직
    const channelDeviceStats = [];
    
    // 사용자 세션 데이터에서 채널별 디바이스 정보 추출
    // 트래픽 소스 정보는 별도로 매핑해야 하므로, 우선 사용자 데이터의 디바이스 정보만 사용
    const deviceMapping = {
      'mobile': 'mobile',
      'desktop': 'desktop',
      'tablet': 'mobile', // tablet을 mobile로 분류
    };
    
    userResult.forEach(row => {
      const deviceType = row.device_type || 'unknown';
      const mappedDevice = deviceMapping[deviceType.toLowerCase()] || 'desktop';
      const users = parseInt(row.unique_users) || 0;
      
      if (users > 0) {
        // 임시로 채널을 디바이스 타입 기반으로 생성 (실제로는 트래픽 소스와 매핑 필요)
        const channels = ['google', 'facebook', 'direct', 'naver', 'instagram'];
        const randomChannel = channels[Math.floor(Math.random() * channels.length)];
        
        channelDeviceStats.push({
          channel: randomChannel,
          device: mappedDevice,
          users: Math.floor(users * (0.5 + Math.random() * 0.5)), // 임시 분배
          sessions: users
        });
      }
    });
    
    // 실제 트래픽 데이터 기반 채널 정보로 보완
    trafficResult.forEach(row => {
      const channel = row.traffic_source || 'direct';
      const users = parseInt(row.users) || 0;
      
      if (users > 0) {
        // mobile과 desktop으로 임시 분배
        const mobileRatio = 0.6 + (Math.random() * 0.3); // 60-90% mobile
        const mobileUsers = Math.floor(users * mobileRatio);
        const desktopUsers = users - mobileUsers;
        
        if (mobileUsers > 0) {
          channelDeviceStats.push({
            channel,
            device: 'mobile',
            users: mobileUsers,
            sessions: mobileUsers
          });
        }
        
        if (desktopUsers > 0) {
          channelDeviceStats.push({
            channel,
            device: 'desktop', 
            users: desktopUsers,
            sessions: desktopUsers
          });
        }
      }
    });
    
    res.status(200).json(channelDeviceStats);
    
  } catch (err) {
    console.error("Channel Groups API ERROR:", err);
    res.status(500).json({ error: "Failed to get channel groups data" });
  }
});

// 7. Campaigns API
router.get("/campaigns", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
    }
    
    // 캠페인별 집계
    const campaignStats = {};
    result.forEach(row => {
      const campaign = row.traffic_campaign || 'none';
      if (!campaignStats[campaign]) {
        campaignStats[campaign] = {
          campaign,
          users: 0,
          sessions: 0
        };
      }
      campaignStats[campaign].users += parseInt(row.users) || 0;
      campaignStats[campaign].sessions += parseInt(row.sessions) || 0;
    });
    
    const campaigns = Object.values(campaignStats)
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
    
    res.status(200).json(campaigns);
    
  } catch (err) {
    console.error("Campaigns API ERROR:", err);
    res.status(500).json({ error: "Failed to get campaigns data" });
  }
});

// 8. Top Countries API
router.get("/top-countries", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayUserSessionStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastUserSessionStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayUserSessionStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastUserSessionStats(sdk_key, startDate, endDate);
    }
    
    // 도시별 집계 (국가 대신 도시 사용)
    const cityStats = {};
    result.forEach(row => {
      const city = row.city || 'unknown';
      if (!cityStats[city]) {
        cityStats[city] = {
          city,
          users: 0
        };
      }
      cityStats[city].users += parseInt(row.unique_users) || 0;
    });
    
    const topCities = Object.values(cityStats)
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
    
    res.status(200).json(topCities);
    
  } catch (err) {
    console.error("Top Countries API ERROR:", err);
    res.status(500).json({ error: "Failed to get top countries data" });
  }
});

// 9. Click Flow API (임시 - Sankey 차트용)
router.get("/click-flow", authMiddleware, async (req, res) => {
  try {
    // 임시로 빈 데이터 반환 (Sankey 차트는 나중에 구현)
    res.status(200).json([]);
  } catch (err) {
    console.error("Click Flow API ERROR:", err);
    res.status(500).json({ error: "Failed to get click flow data" });
  }
});

// 상위 방문 페이지 API (Top Landing Pages)
router.get("/landing-pages", authMiddleware, async (req, res) => {
  const { sdk_key } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    const isOnlyToday = startDate === endDate && startDate === today;
    const includesOnlyToday = startDate <= today && endDate >= today;
    
    let result = [];
    
    if (isOnlyToday) {
      result = await getTodayTrafficMarketingStats(sdk_key, startDate, endDate);
    } else if (includesOnlyToday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      let pastData = [];
      if (startDate <= yesterdayStr) {
        pastData = await getPastTrafficMarketingStats(sdk_key, startDate, yesterdayStr);
      }
      
      const todayData = await getTodayTrafficMarketingStats(sdk_key, today, today);
      result = mergeData(pastData, todayData);
    } else {
      result = await getPastTrafficMarketingStats(sdk_key, startDate, endDate);
    }

    // 랜딩 페이지별 집계
    const pageStats = {};
    result.forEach(row => {
      const page = row.landing_page || '/';
      
      if (!pageStats[page]) {
        pageStats[page] = {
          page: page,
          sessions: 0,
          users: 0,
          visits: 0,
          engaged: 0,
          converted: 0,
          bounced: 0
        };
      }
      
      pageStats[page].sessions += parseInt(row.sessions) || 0;
      pageStats[page].users += parseInt(row.users) || 0;
      pageStats[page].visits += parseInt(row.funnel_visits) || 0;
      pageStats[page].engaged += parseInt(row.funnel_engaged) || 0;
      pageStats[page].converted += parseInt(row.funnel_converted) || 0;
      pageStats[page].bounced += parseInt(row.bounced_sessions) || 0;
    });

    // 계산된 지표 추가 및 정렬
    const landingPages = Object.values(pageStats)
      .map(page => ({
        ...page,
        engagement_rate: page.visits > 0 ? Math.round((page.engaged / page.visits) * 100) : 0,
        conversion_rate: page.visits > 0 ? Math.round((page.converted / page.visits) * 100) : 0,
        bounce_rate: page.sessions > 0 ? Math.round((page.bounced / page.sessions) * 100) : 0
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    res.status(200).json(landingPages);
    
  } catch (err) {
    console.error("Landing Pages API ERROR:", err);
    res.status(500).json({ error: "Failed to get landing pages data" });
  }
});

module.exports = router;
