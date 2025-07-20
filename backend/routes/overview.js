const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require("../middlewares/authMiddleware");
const { getLocalNow, getIsoNow } = require("../utils/timeUtils");
// 모든 /api/overview 경로에 authMiddleware 적용
router.use(authMiddleware);

const now = getLocalNow();
// 🎯 1. KPI 데이터 조회 (메인 지표들) - 완전히 새로운 접근법
// 🔧 완전히 수정된 KPI 라우트
router.get('/kpi', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const { date = 'today()' } = req.query;
    
    if (!sdk_key) {
      return res.status(400).json({ error: 'sdk_key는 필수입니다' });
    }

    // ✅ 수정된 simple query - 모든 집계 함수 올바르게 수정
    const simpleQuery = `
      SELECT 
        uniqMerge(visitors_state) AS active_users,
        uniqMerge(session_count_state) AS total_sessions,        -- ✅ uniq 타입이므로 uniqMerge
        sumMerge(conversions_state) AS total_conversions,        -- ✅ sum 타입이므로 sumMerge
        uniqMerge(engaged_sessions_state) AS engaged_sessions    -- ✅ uniq 타입이므로 uniqMerge
      FROM klicklab.daily_overview_agg
      WHERE summary_date = toDate(now(), 'Asia/Seoul') AND sdk_key = {sdk_key:String}
      GROUP BY sdk_key  -- ✅ GROUP BY 추가
    `;

    const simpleResult = await clickhouse.query({
      query: simpleQuery,
      query_params: { sdk_key, now},
      format: 'JSONEachRow',
    });

    const simpleData = await simpleResult.json();
    console.log('Simple query result:', simpleData);

    if (simpleData.length === 0) {
      // 집계 테이블에 데이터가 없으면 실시간 쿼리로 대체
      const realtimeQuery = `
        SELECT 
          uniqExact(client_id) AS active_users,
          uniqExact(session_id) AS total_sessions,
          0 AS total_conversions,
          0 AS engaged_sessions,
          0 AS avg_session_duration
        FROM klicklab.events
        WHERE toDate(timestamp) = toDate(now(), 'Asia/Seoul') AND sdk_key = {sdk_key:String}
      `;

      const realtimeResult = await clickhouse.query({
        query: realtimeQuery,
        query_params: { sdk_key },
        format: 'JSONEachRow',
      });

      const realtimeData = await realtimeResult.json();
      const row = realtimeData[0] || {};

      return res.json({
        data: {
          activeUsers: parseInt(row.active_users) || 0,
          avgSessionDuration: 0,
          conversionRate: 0,
          engagedSessions: parseInt(row.engaged_sessions) || 0,
        },
        changes: {
          activeUsers: 0,
          avgSessionDuration: 0,
          conversionRate: 0,
          engagedSessions: 0,
        },
        note: "Using realtime data - aggregated data not available"
      });
    }

    // 집계 테이블에 데이터가 있으면 계산 진행
    const row = simpleData[0];
    const totalSessions = parseInt(row.total_sessions) || 1; // 0으로 나누기 방지

    // ✅ 수정된 세션 시간 계산 쿼리 - uniqMerge로 변경
    const sessionTimeQuery = `
      SELECT 
        CASE 
          WHEN uniqMerge(session_count_state) > 0 
          THEN sumMerge(session_dur_sum_state) / uniqMerge(session_count_state)
          ELSE 0
        END AS avg_session_duration
      FROM klicklab.daily_overview_agg
      WHERE summary_date = toDate(now(), 'Asia/Seoul') AND sdk_key = {sdk_key:String}
      GROUP BY sdk_key  -- ✅ GROUP BY 추가
    `;

    const sessionTimeResult = await clickhouse.query({
      query: sessionTimeQuery,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });

    const sessionTimeData = await sessionTimeResult.json();
    const avgSessionDuration = sessionTimeData[0]?.avg_session_duration || 0;
    console.log('avg:', avgSessionDuration)

    // ✅ 수정된 어제 데이터 조회 - 모든 집계 함수 올바르게 수정
    const yesterdayQuery = `
      SELECT 
        uniqMerge(visitors_state) AS active_users_yesterday,
        uniqMerge(session_count_state) AS total_sessions_yesterday,     -- ✅ uniqMerge로 변경
        sumMerge(conversions_state) AS total_conversions_yesterday,
        uniqMerge(engaged_sessions_state) AS engaged_sessions_yesterday,
        CASE 
          WHEN uniqMerge(session_count_state) > 0 
          THEN sumMerge(session_dur_sum_state) / uniqMerge(session_count_state)  -- ✅ uniqMerge로 변경
          ELSE 0
        END AS avg_session_duration_yesterday
      FROM klicklab.daily_overview_agg
      WHERE summary_date = toDate(now(), 'Asia/Seoul') - 1 AND sdk_key = {sdk_key:String}
      GROUP BY sdk_key  -- ✅ GROUP BY 추가
    `;

    const yesterdayResult = await clickhouse.query({
      query: yesterdayQuery,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });

    const yesterdayData = await yesterdayResult.json();
    const yesterdayRow = yesterdayData[0] || {};

    // 변화율 계산
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return parseFloat(((current - previous) * 100 / previous).toFixed(1));
    };

    const activeUsers = parseInt(row.active_users) || 0;
    const conversions = parseInt(row.total_conversions) || 0;

    console.log('activeUsers:', activeUsers);
    console.log('conversions:', conversions);
    const engagedSessions = parseInt(row.engaged_sessions) || 0;
    const conversionRate = totalSessions > 0 ? (conversions * 100 / totalSessions) : 0;

    res.json({
      data: {
        activeUsers: activeUsers,
        avgSessionDuration: Math.round(avgSessionDuration),
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        engagedSessions: engagedSessions,
      },
      changes: {
        activeUsers: calculateChange(activeUsers, parseInt(yesterdayRow.active_users_yesterday) || 0),
        avgSessionDuration: calculateChange(avgSessionDuration, parseFloat(yesterdayRow.avg_session_duration_yesterday) || 0),
        conversionRate: calculateChange(conversionRate, 
          yesterdayRow.total_sessions_yesterday > 0 ? 
          (parseInt(yesterdayRow.total_conversions_yesterday) || 0) * 100 / parseInt(yesterdayRow.total_sessions_yesterday) : 0),
        engagedSessions: calculateChange(engagedSessions, parseInt(yesterdayRow.engaged_sessions_yesterday) || 0),
      }
    });

  } catch (error) {
    console.error('KPI 데이터 조회 오류:', error);
    
    // 오류 발생 시 기본값 반환
    res.json({
      data: {
        activeUsers: 0,
        avgSessionDuration: 0,
        conversionRate: 0,
        engagedSessions: 0,
      },
      changes: {
        activeUsers: 0,
        avgSessionDuration: 0,
        conversionRate: 0,
        engagedSessions: 0,
      },
      error: error.message
    });
  }
});

// ✅ 수정된 visitor-trend 라우트 - GROUP BY 추가
router.get('/visitor-trend', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const { days = 7 } = req.query;
    
    if (!sdk_key) {
      return res.status(400).json({ error: 'sdk_key는 필수입니다' });
    }

    // ✅ 집계 테이블 쿼리 수정 - GROUP BY 추가
    const aggregatedQuery = `
      SELECT 
        toString(summary_date) AS date,
        uniqMerge(visitors_state) AS visitors
      FROM klicklab.daily_overview_agg
      WHERE summary_date >= toDate(now(), 'Asia/Seoul') - {days:UInt8}
        AND summary_date <= toDate(now(), 'Asia/Seoul')
        AND sdk_key = {sdk_key:String}
      GROUP BY summary_date  -- ✅ GROUP BY 추가!
      ORDER BY summary_date
    `;

    try {
      const result = await clickhouse.query({
        query: aggregatedQuery,
        query_params: { 
          sdk_key,
          days: parseInt(days)
        },
        format: 'JSONEachRow',
      });

      const data = await result.json();
      
      if (data.length > 0) {
        const formattedData = data.map(row => ({
          date: row.date,
          visitors: parseInt(row.visitors) || 0
        }));

        return res.json({ data: formattedData });
      }
    } catch (aggregatedError) {
      console.log('집계 데이터 조회 실패, 실시간 데이터로 대체:', aggregatedError.message);
    }

    // fallback: 실시간 데이터
    const realtimeQuery = `
      SELECT 
        toString(toDate(timestamp)) AS date,
        uniqExact(client_id) AS visitors
      FROM klicklab.events
      WHERE toDate(timestamp) >= toDate(now(), 'Asia/Seoul') - {days:UInt8}
        AND toDate(timestamp) <= toDate(now(), 'Asia/Seoul')
        AND sdk_key = {sdk_key:String}
      GROUP BY toDate(timestamp)
      ORDER BY date
    `;

    const realtimeResult = await clickhouse.query({
      query: realtimeQuery,
      query_params: { sdk_key, days: parseInt(days) },
      format: 'JSONEachRow',
    });

    const realtimeData = await realtimeResult.json();
    const formattedData = realtimeData.map(row => ({
      date: row.date,
      visitors: parseInt(row.visitors) || 0
    }));

    res.json({ data: formattedData });

  } catch (error) {
    console.error('방문자 트렌드 조회 오류:', error);
    res.status(500).json({ error: '방문자 트렌드 데이터를 불러올 수 없습니다' });
  }
});

// ✅ 수정된 widgets 라우트 - element_selector 제거
router.get('/widgets', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const { date = 'today()' } = req.query;
    
    if (!sdk_key) {
      return res.status(400).json({ error: 'sdk_key는 필수입니다' });
    }

    const dateCondition = date === 'today()' ? 'today()' : `toDate('${date}')`;

    // 트래픽 소스별 데이터
    const trafficSourceQuery = `
      SELECT 
        traffic_source AS source,
        uniqExact(client_id) AS users
      FROM klicklab.events
      WHERE sdk_key = {sdk_key:String}
        AND toDate(timestamp) = ${dateCondition}
        AND traffic_source != ''
      GROUP BY traffic_source
      ORDER BY users DESC
      LIMIT 10
    `;

    // 상위 페이지별 데이터
    const topPagesQuery = `
      SELECT 
        page_path AS page,
        countIf(event_name = 'page_view') AS views
      FROM klicklab.events
      WHERE sdk_key = {sdk_key:String}
        AND toDate(timestamp) = ${dateCondition}
        AND page_path != ''
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 10
    `;

    // ✅ 상위 이벤트 요소 (element_selector 대신 page_path 사용)
    const topEventsQuery = `
    SELECT 
    event_name AS event,
    sumMerge(event_count_state) AS count
  FROM klicklab.daily_event_agg
  WHERE summary_date >= toDate(now(), 'Asia/Seoul') - 6
    AND summary_date <= toDate(now(), 'Asia/Seoul')
    AND sdk_key = {sdk_key:String}
    AND event_name NOT IN ('auto_click', 'page_view', 'scroll_depth', 'page_exit')
  GROUP BY event_name
  ORDER BY count DESC
  LIMIT 10
`;

    // 병렬로 쿼리 실행
    const [trafficResult, pagesResult, eventsResult] = await Promise.all([
      clickhouse.query({
        query: trafficSourceQuery,
        query_params: { sdk_key },
        format: 'JSONEachRow',
      }),
      clickhouse.query({
        query: topPagesQuery,
        query_params: { sdk_key },
        format: 'JSONEachRow',
      }),
      clickhouse.query({
        query: topEventsQuery,
        query_params: { sdk_key },
        format: 'JSONEachRow',
      })
    ]);

    const [trafficData, pagesData, eventsData] = await Promise.all([
      trafficResult.json(),
      pagesResult.json(),
      eventsResult.json()
    ]);

    res.json({
      trafficSources: trafficData.map(row => ({
        source: row.source,
        users: parseInt(row.users) || 0
      })),
      topPages: pagesData.map(row => ({
        page: row.page,
        views: parseInt(row.views) || 0
      })),
      topEvents: eventsData.map(row => ({
        event: row.event,
        count: parseInt(row.count) || 0
      }))
    });

  } catch (error) {
    console.error('위젯 데이터 조회 오류:', error);
    res.status(500).json({ error: '위젯 데이터를 불러올 수 없습니다' });
  }
});

// 🔥 3. 실시간 활성 사용자 조회 (30분) - 이미 작동하고 있으므로 그대로 유지
router.get('/realtime', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    
    if (!sdk_key) {
      return res.status(400).json({ error: 'sdk_key는 필수입니다' });
    }

    const query = `
      SELECT 
        uniqExact(client_id) AS active_users_30min,
        count() AS total_events,
        countIf(event_name = 'page_view') AS pageviews,
        countIf(event_name = 'auto_click') AS clicks
      FROM klicklab.events
      WHERE timestamp >= now() - INTERVAL 30 MINUTE
        AND timestamp <= now()
        AND sdk_key = {sdk_key:String}
    `;

    const result = await clickhouse.query({
      query,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    const row = data[0] || {};

    res.json({
      data: {
        activeUsers30min: parseInt(row.active_users_30min) || 0,
        totalEvents: parseInt(row.total_events) || 0,
        pageviews: parseInt(row.pageviews) || 0,
        clicks: parseInt(row.clicks) || 0,
      }
    });

  } catch (error) {
    console.error('실시간 데이터 조회 오류:', error);
    res.status(500).json({ error: '실시간 데이터를 불러올 수 없습니다' });
  }
});

// 📊 4. 실시간 30분 트렌드 조회 - 이미 작동하므로 그대로 유지
router.get('/realtime-trend', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    
    if (!sdk_key) {
      return res.status(400).json({ error: 'sdk_key는 필수입니다' });
    }

    const query = `
      WITH time_slots AS (
        SELECT toStartOfMinute(now() - INTERVAL number MINUTE) AS minute
        FROM numbers(30)
      )
      SELECT 
        formatDateTime(time_slots.minute, '%H:%M') AS time,
        COALESCE(data.users, 0) AS users
      FROM time_slots
      LEFT JOIN (
        SELECT 
          toStartOfMinute(timestamp) AS minute,
          uniqExact(client_id) AS users
        FROM klicklab.events
        WHERE sdk_key = {sdk_key:String}
          AND timestamp >= now() - INTERVAL 30 MINUTE
        GROUP BY minute
      ) AS data ON time_slots.minute = data.minute
      ORDER BY time_slots.minute
    `;

    const result = await clickhouse.query({
      query,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });

    const data = await result.json();
    const formattedData = data.map(row => ({
      time: row.time,
      users: parseInt(row.users) || 0
    }));

    res.json({ data: formattedData });

  } catch (error) {
    console.error('실시간 트렌드 조회 오류:', error);
    res.status(500).json({ error: '실시간 트렌드 데이터를 불러올 수 없습니다' });
  }
});

router.get('/realtime/summary', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const query = `
      SELECT active_users_30min, total_events, pageviews, clicks
      FROM klicklab.v_realtime_active_users
      WHERE sdk_key = {sdk_key:String}
    `;
    const result = await clickhouse.query({
      query,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });
    const data = await result.json();
    res.json(data[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/realtime/trend', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const query = `
      WITH time_slots AS (
        SELECT toStartOfMinute(now() - INTERVAL number MINUTE) AS minute
        FROM numbers(30)
      )
      SELECT 
        formatDateTime(time_slots.minute, '%H:%M') AS time,
        COALESCE(data.users, 0) AS users
      FROM time_slots
      LEFT JOIN (
        SELECT 
          toStartOfMinute(timestamp) AS minute,
          uniqExact(client_id) AS users
        FROM klicklab.events
        WHERE sdk_key = {sdk_key:String}
          AND timestamp >= now() - INTERVAL 30 MINUTE
        GROUP BY minute
      ) AS data ON time_slots.minute = data.minute
      ORDER BY time_slots.minute
    `;
    const result = await clickhouse.query({
      query,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });
    const data = await result.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/realtime/sources', async (req, res) => {
  try {
    const { sdk_key } = req.user;
    const query = `
      SELECT 
        city AS source,
        uniqExact(client_id) AS users
      FROM klicklab.events
      WHERE sdk_key = {sdk_key:String}
        AND timestamp >= now() - INTERVAL 30 MINUTE
        AND city != ''
      GROUP BY city
      ORDER BY users DESC
      LIMIT 10
    `;
    const result = await clickhouse.query({
      query,
      query_params: { sdk_key },
      format: 'JSONEachRow',
    });
    const data = await result.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;