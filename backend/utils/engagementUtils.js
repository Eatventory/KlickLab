function getQueryWhereClause(startDate, endDate) {
  if (!startDate || !endDate) return '1 = 1';
  return `summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
}

function getAvgSessionQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT d.date, ifNull(avgData.avgSessionSeconds, 0) AS avgSessionSeconds
    FROM (
      SELECT addDays(start, number) AS date
      FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT
        summary_date AS date,
        round(sumMerge(session_duration_sum_state) / nullIf(uniqMerge(sessions_state), 0), 2) AS avgSessionSeconds
      FROM klicklab.agg_user_session_stats
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start AND end
      GROUP BY summary_date
    ) AS avgData ON d.date = avgData.date
    ORDER BY d.date ASC
  `;
}

function getSessionsPerUserQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT d.date,
      ifNull(userData.totalVisitors, 0) AS totalVisitors,
      ifNull(userData.totalSessions, 0) AS totalSessions,
      ifNull(userData.sessionsPerUser, 0) AS sessionsPerUser
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT
        summary_date AS date,
        uniqMerge(unique_users_state) AS totalVisitors,
        uniqMerge(sessions_state) AS totalSessions,
        round(uniqMerge(sessions_state) / nullIf(uniqMerge(unique_users_state), 0), 2) AS sessionsPerUser
      FROM klicklab.agg_user_session_stats
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start AND end
      GROUP BY summary_date
    ) AS userData ON d.date = userData.date
    ORDER BY d.date ASC
  `;
}

function getClickCountsQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT d.date, ifNull(data.totalClicks, 0) AS totalClicks
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT 
        summary_date AS date, 
        sumMerge(event_count_state) AS totalClicks
      FROM klicklab.agg_event_stats
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start AND end
        AND event_name IN ('auto_click', 'user_click', 'click')
      GROUP BY summary_date
    ) AS data ON d.date = data.date
    ORDER BY d.date ASC
  `;
}

function getViewCountsQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT d.date, ifNull(v.totalViews, 0) AS totalViews
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT 
        summary_date AS date, 
        sumMerge(page_views_state) AS totalViews
      FROM klicklab.agg_page_content_stats
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start AND end
      GROUP BY summary_date
    ) AS v ON d.date = v.date
    ORDER BY d.date ASC
  `;
}

function getUsersOverTimeQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days

    SELECT
      base.date AS base_date,
      ifNull(daily.users, 0) AS daily_users,
      ifNull(weekly.users, 0) AS weekly_users,
      ifNull(monthly.users, 0) AS monthly_users
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) base

    LEFT JOIN (
      SELECT 
        summary_date AS date, 
        uniqMerge(unique_users_state) AS users
      FROM klicklab.agg_user_session_stats
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start AND end
      GROUP BY summary_date
    ) daily ON base.date = daily.date

    LEFT JOIN (
      SELECT 
        ref.date AS date, 
        uniqMerge(unique_users_state) AS users
      FROM (
        SELECT addDays(start, number) AS date FROM numbers(days + 1)
      ) ref
      CROSS JOIN klicklab.agg_user_session_stats aus
      WHERE aus.sdk_key = '${sdk_key}'
        AND aus.summary_date BETWEEN ref.date - INTERVAL 6 DAY AND ref.date
      GROUP BY ref.date
    ) weekly ON base.date = weekly.date

    LEFT JOIN (
      SELECT 
        ref.date AS date, 
        uniqMerge(unique_users_state) AS users
      FROM (
        SELECT addDays(start, number) AS date FROM numbers(days + 1)
      ) ref
      CROSS JOIN klicklab.agg_user_session_stats aus
      WHERE aus.sdk_key = '${sdk_key}'
        AND aus.summary_date BETWEEN ref.date - INTERVAL 29 DAY AND ref.date
      GROUP BY ref.date
    ) monthly ON base.date = monthly.date

    ORDER BY base_date ASC
  `;
}

// DEPRECATED: getEventCountsQuery - 새로운 getTodayEventCounts, getPastEventCounts, mergeEventCountsData 함수들을 사용하세요
function getEventCountsQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days,
      events AS (
        SELECT
          summary_date AS date,
          event_name,
          sumMerge(event_count_state) AS event_count,
          uniqMerge(unique_users_state) AS user_count,
          round(sumMerge(event_count_state) / uniqMerge(unique_users_state), 2) AS avg_event_per_user
        FROM klicklab.agg_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN start AND end
        GROUP BY summary_date, event_name
      )
    SELECT
      d.date,
      e.event_name,
      ifNull(e.event_count, 0) AS event_count,
      ifNull(e.user_count, 0) AS user_count,
      ifNull(e.avg_event_per_user, 0) AS avg_event_per_user
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN events e ON d.date = e.date
    WHERE e.event_name IS NOT NULL
    ORDER BY d.date ASC, event_count DESC
  `;
}

function getPageTimesQuery(startDate, endDate, sdk_key, limit = 10) {
  return `
    SELECT
      page_path AS page,
      round(
        sumMerge(time_on_page_sum_state)
        / nullIf(sumMerge(page_views_state), 0)
      , 1) AS averageTime
    FROM agg_page_content_stats
    WHERE sdk_key = '${sdk_key}'
      AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY page_path
    ORDER BY averageTime DESC
    LIMIT ${limit}
  `;
}

function getBounceRateQuery(startDate, endDate, sdk_key, limit = 10) {
  return `
    WITH session_exits AS (
      SELECT 
        page_path,
        session_id,
        countIf(event_name = 'page_exit') > 0 AS has_exit
      FROM klicklab.events
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        AND page_path != ''
      GROUP BY page_path, session_id
    )
    SELECT
      page_path,
      count() AS total_sessions,
      sum(has_exit) AS exit_sessions,
      round(sum(has_exit) / count() * 100, 1) AS bounce_rate
    FROM session_exits
    GROUP BY page_path
    HAVING total_sessions > 5 AND bounce_rate > 0
    ORDER BY bounce_rate DESC
    LIMIT ${limit}
  `;
}

function getPageViewsQuery(startDate, endDate, sdk_key, limit = 10) {
  return `
    SELECT
      page_path AS page,
      sumMerge(page_views_state) AS totalViews
    FROM agg_page_content_stats
    WHERE sdk_key = '${sdk_key}'
      AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY page_path
    HAVING totalViews > 0
    ORDER BY totalViews DESC
    LIMIT ${limit}
  `;
}

function getPageStatsQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      page_path,
      sumMerge(page_views_state) AS page_views,
      uniqMerge(unique_page_views_state) AS active_users,
      round(sumMerge(page_views_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS pageviews_per_user,
      round(sumMerge(time_on_page_sum_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS avg_engagement_time_sec,
      sumMerge(event_count_state) AS total_events
    FROM klicklab.agg_page_content_stats apc
    LEFT JOIN klicklab.agg_event_stats aes
      ON apc.summary_date = aes.summary_date 
      AND apc.page_path = aes.page_path 
      AND apc.sdk_key = aes.sdk_key
    WHERE apc.sdk_key = '${sdk_key}'
      AND apc.summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND apc.page_path != ''
    GROUP BY apc.summary_date, apc.page_path
    ORDER BY apc.summary_date DESC, page_views DESC
  `;
}

function getVisitStatsQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      page_path,
      uniqMerge(sessions_with_page_state) AS sessions,
      uniqMerge(unique_page_views_state) AS active_users,
      uniqMerge(unique_page_views_state) AS new_visitors,
      round(sumMerge(time_on_page_sum_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS avg_session_seconds
    FROM klicklab.agg_page_content_stats
    WHERE sdk_key = '${sdk_key}'
      AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      AND page_path != ''
    GROUP BY summary_date, page_path
    ORDER BY summary_date ASC, sessions DESC
  `;
}

function getRevisitQuery(startDate, endDate, sdk_key) {
  return `
    WITH date_series AS (
      SELECT toDate('${startDate}') + number AS date
      FROM numbers(datediff('day', toDate('${startDate}'), toDate('${endDate}')) + 1)
    ),
    user_stats AS (
      SELECT 
        summary_date AS date,
        uniqMerge(unique_users_state) AS dau,
        uniqMerge(sessions_state) AS sessions
      FROM klicklab.agg_user_session_stats
      WHERE sdk_key = '${sdk_key}' 
        AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      GROUP BY summary_date
    )
    SELECT
      ds.date AS date,
      us.dau,
      us.sessions,
      round(us.dau / nullIf(us.sessions, 0), 4) AS dau_sessions_ratio
    FROM date_series ds
    LEFT JOIN user_stats us ON ds.date = us.date
    ORDER BY ds.date ASC
  `;
}

// 오늘 데이터 조회 (Aggregating 테이블) - 페이지 이탈률
const getTodayPageExitRate = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      page_path,
      page_views,
      exits,
      round((exits * 100.0) / nullIf(page_views, 0), 2) as exit_rate
    FROM (
      SELECT
        page_path,
        sumMerge(page_views_state) as page_views,
        sumMerge(exits_state) as exits
      FROM klicklab.agg_page_content_stats
      WHERE summary_date >= toDate('${startDate}')
        AND summary_date <= toDate('${endDate}')
        AND sdk_key = '${sdkKey}'
        AND page_path != ''
      GROUP BY page_path
      HAVING page_views > 0
    )
    ORDER BY exit_rate DESC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 데이터 조회 (Flat 테이블) - 페이지 이탈률  
const getPastPageExitRate = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      page_path,
      page_views,
      exits,
      round((exits * 100.0) / nullIf(page_views, 0), 2) as exit_rate
    FROM klicklab.flat_page_content_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND page_path != ''
      AND page_views > 0
    ORDER BY exit_rate DESC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 데이터 합치기 함수
const mergePageExitData = (pastData, todayData) => {
  const merged = {};
  
  [...pastData, ...todayData].forEach(row => {
    const key = row.page_path;
    if (!merged[key]) {
      merged[key] = {
        page_path: row.page_path,
        page_views: 0,
        exits: 0,
        exit_rate: 0
      };
    }
    merged[key].page_views += parseInt(row.page_views) || 0;
    merged[key].exits += parseInt(row.exits) || 0;
  });
  
  // 이탈률 재계산
  Object.values(merged).forEach(row => {
    row.exit_rate = row.page_views > 0 
      ? Math.round((row.exits * 100.0) / row.page_views * 100) / 100
      : 0;
  });
  
  return Object.values(merged).sort((a, b) => b.exit_rate - a.exit_rate);
};

// 오늘 데이터 조회 (Aggregating 테이블) - 세션 참여도 데이터
const getTodaySessionEngagement = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      toFloat64(sumMerge(session_duration_sum_state)) as total_session_duration,
      toUInt64(uniqMerge(sessions_state)) as total_sessions,
      toUInt64(uniqMerge(unique_users_state)) as total_users,
      round(toFloat64(sumMerge(session_duration_sum_state)) / nullIf(toUInt64(uniqMerge(sessions_state)), 0), 2) as avg_session_seconds,
      round(toUInt64(uniqMerge(sessions_state)) / nullIf(toUInt64(uniqMerge(unique_users_state)), 0), 2) as sessions_per_user
    FROM klicklab.agg_user_session_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
  
  console.log('[SESSION ENGAGEMENT DEBUG] Today query:', query);
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 데이터 조회 (Flat 테이블) - 세션 참여도 데이터
const getPastSessionEngagement = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      session_duration_sum as total_session_duration,
      sessions as total_sessions,
      users as total_users,
      round(session_duration_sum / nullIf(sessions, 0), 2) as avg_session_seconds,
      round(sessions / nullIf(users, 0), 2) as sessions_per_user
    FROM klicklab.flat_user_session_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    ORDER BY summary_date ASC
  `;
  
  console.log('[SESSION ENGAGEMENT DEBUG] Past query:', query);
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 세션 참여도 데이터 합치기 함수
const mergeSessionEngagementData = (pastData, todayData) => {
  const merged = {};
  
  [...pastData, ...todayData].forEach(row => {
    const key = row.date;
    if (!merged[key]) {
      merged[key] = {
        date: row.date,
        total_session_duration: 0,
        total_sessions: 0,
        total_users: 0,
        avg_session_seconds: 0,
        sessions_per_user: 0
      };
    }
    merged[key].total_session_duration += parseInt(row.total_session_duration) || 0;
    merged[key].total_sessions += parseInt(row.total_sessions) || 0;
    merged[key].total_users += parseInt(row.total_users) || 0;
  });
  
  // 비율 재계산
  Object.values(merged).forEach(row => {
    row.avg_session_seconds = row.total_sessions > 0 
      ? Math.round((row.total_session_duration / row.total_sessions) * 100) / 100
      : 0;
    row.sessions_per_user = row.total_users > 0 
      ? Math.round((row.total_sessions / row.total_users) * 100) / 100
      : 0;
  });
  
  return Object.values(merged).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// 오늘 데이터 조회 (Aggregating 테이블) - 페이지 평균 체류 시간
const getTodayPageTimes = async (clickhouse, sdkKey, startDate, endDate, limit = 10) => {
  const query = `
    SELECT
      page_path,
      page_views,
      time_on_page_sum,
      round(time_on_page_sum / nullIf(page_views, 0), 1) as average_time
    FROM (
      SELECT
        page_path,
        sumMerge(page_views_state) as page_views,
        sumMerge(time_on_page_sum_state) as time_on_page_sum
      FROM klicklab.agg_page_content_stats
      WHERE summary_date >= toDate('${startDate}')
        AND summary_date <= toDate('${endDate}')
        AND sdk_key = '${sdkKey}'
        AND page_path != ''
      GROUP BY page_path
      HAVING page_views > 0
    )
    ORDER BY average_time DESC
    LIMIT ${limit}
  `;
  
  console.log('[PAGE TIMES DEBUG] Today query (using time_on_page_sum_state):', query);
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 데이터 조회 - events 테이블에서 직접 계산
const getPastPageTimes = async (clickhouse, sdkKey, startDate, endDate, limit = 10) => {
  const query = `
    SELECT
      page_path,
      page_views,
      time_on_page_sum,
      round(time_on_page_sum / nullIf(page_views, 0), 1) as average_time
    FROM (
      SELECT
        page_path,
        count() as page_views,
        sum(time_on_page_seconds) as time_on_page_sum
      FROM klicklab.events
      WHERE toDate(timestamp) >= toDate('${startDate}')
        AND toDate(timestamp) <= toDate('${endDate}')
        AND sdk_key = '${sdkKey}'
        AND page_path != ''
        AND event_name = 'page_view'
      GROUP BY page_path
      HAVING page_views > 0
    )
    ORDER BY average_time DESC
    LIMIT ${limit}
  `;
  
  console.log('[PAGE TIMES DEBUG] Past query (from events table):', query);
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 페이지 평균 체류 시간 데이터 합치기 함수
const mergePageTimesData = (pastData, todayData, limit = 10) => {
  const merged = {};
  
  [...pastData, ...todayData].forEach(row => {
    const key = row.page_path;
    if (!merged[key]) {
      merged[key] = {
        page_path: row.page_path,
        page_views: 0,
        time_on_page_sum: 0,
        average_time: 0
      };
    }
    merged[key].page_views += parseInt(row.page_views) || 0;
    merged[key].time_on_page_sum += parseFloat(row.time_on_page_sum) || 0;
  });
  
  // 평균 시간 재계산
  Object.values(merged).forEach(row => {
    row.average_time = row.page_views > 0 
      ? Math.round((row.time_on_page_sum / row.page_views) * 10) / 10
      : 0;
  });
  
  return Object.values(merged)
    .sort((a, b) => b.average_time - a.average_time) // 평균 시간 기준으로 정렬
    .slice(0, limit);
};

// 오늘 데이터 조회 (Aggregating 테이블) - 페이지 별 조회수
const getTodayPageViews = async (clickhouse, sdkKey, startDate, endDate, limit = 10) => {
  const query = `
    SELECT
      page_path,
      sumMerge(page_views_state) as total_views
    FROM klicklab.agg_page_content_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND page_path != ''
    GROUP BY page_path
    HAVING total_views > 0
    ORDER BY total_views DESC
    LIMIT ${limit}
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 데이터 조회 (Flat 테이블) - 페이지 별 조회수
const getPastPageViews = async (clickhouse, sdkKey, startDate, endDate, limit = 10) => {
  const query = `
    SELECT
      page_path,
      page_views as total_views
    FROM klicklab.flat_page_content_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND page_path != ''
      AND page_views > 0
    ORDER BY total_views DESC
    LIMIT ${limit}
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 페이지 별 조회수 데이터 합치기 함수
const mergePageViewsData = (pastData, todayData, limit = 10) => {
  const merged = {};
  
  [...pastData, ...todayData].forEach(row => {
    const key = row.page_path;
    if (!merged[key]) {
      merged[key] = {
        page_path: row.page_path,
        total_views: 0
      };
    }
    merged[key].total_views += parseInt(row.total_views) || 0;
  });
  
  return Object.values(merged)
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, limit);
};

// 오늘 전체 조회수 조회 (Aggregating 테이블)
const getTodayViewCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      sumMerge(page_views_state) as totalViews
    FROM klicklab.agg_page_content_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 전체 조회수 조회 (Flat 테이블)
const getPastViewCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      page_views as totalViews
    FROM klicklab.flat_page_content_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
    ORDER BY summary_date ASC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 전체 조회수 데이터 합치기 함수
const mergeViewCountsData = (pastData, todayData) => {
  const merged = {};
  
  [...pastData, ...todayData].forEach(row => {
    const key = row.date;
    if (!merged[key]) {
      merged[key] = {
        date: row.date,
        totalViews: 0
      };
    }
    merged[key].totalViews += parseInt(row.totalViews) || 0;
  });
  
  return Object.values(merged).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// 오늘 전체 클릭수 조회 (Aggregating 테이블) - 이벤트 기반
const getTodayClickCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      sumMerge(event_count_state) as totalClicks
    FROM klicklab.agg_event_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND event_name IN ('auto_click', 'user_click', 'click')
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 과거 전체 클릭수 조회 (Flat 테이블) - 이벤트 기반
const getPastClickCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      event_count as totalClicks
    FROM klicklab.flat_event_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND event_name IN ('auto_click', 'user_click', 'click')
    ORDER BY summary_date ASC
  `;
  
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

// 데이터 합치기 로직 - 클릭수
const mergeClickCountsData = (pastData, todayData) => {
  const dataMap = new Map();
  
  // 과거 데이터 추가
  pastData.forEach(item => {
    dataMap.set(item.date, {
      date: item.date,
      totalClicks: parseInt(item.totalClicks) || 0
    });
  });
  
  // 오늘 데이터 추가 (덮어쓰기)
  todayData.forEach(item => {
    dataMap.set(item.date, {
      date: item.date,
      totalClicks: parseInt(item.totalClicks) || 0
    });
  });
  
  return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// 오늘 이벤트 카운트 조회 (Aggregating 테이블)
const getTodayEventCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      event_name,
      sumMerge(event_count_state) as event_count,
      uniqMerge(unique_users_state) as user_count,
      round(sumMerge(event_count_state) / nullIf(uniqMerge(unique_users_state), 0), 2) as avg_event_per_user
    FROM klicklab.agg_event_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND event_name != ''
    GROUP BY summary_date, event_name
    ORDER BY summary_date ASC, event_count DESC
  `;
  
  console.log('[EVENT COUNTS DEBUG] Today query:', query);
  const result = await clickhouse.query({ query, format: "JSON" });
  return await result.json();
};

const getPastEventCounts = async (clickhouse, sdkKey, startDate, endDate) => {
  const query = `
    SELECT
      summary_date as date,
      event_name,
      event_count,
      unique_users as user_count,
      round(event_count / greatest(unique_users, 1), 2) as avg_event_per_user
    FROM klicklab.flat_event_stats
    WHERE summary_date >= toDate('${startDate}')
      AND summary_date <= toDate('${endDate}')
      AND sdk_key = '${sdkKey}'
      AND event_name != ''
    ORDER BY summary_date ASC, event_count DESC
  `;
  
  console.log('[EVENT COUNTS DEBUG] Past query:', query);
  
  try {
    const result = await clickhouse.query({ query, format: "JSON" });
    return await result.json();
  } catch (error) {
    console.error('[EVENT COUNTS ERROR]', error);
    return { data: [] };
  }
};
// 데이터 합치기 로직 - 이벤트 카운트
const mergeEventCountsData = (pastData, todayData) => {
  const dataMap = new Map();
  
  // 과거 데이터 추가
  pastData.forEach(item => {
    const key = `${item.date}_${item.event_name}`;
    dataMap.set(key, {
      date: item.date,
      event_name: item.event_name,
      event_count: parseInt(item.event_count) || 0,
      user_count: parseInt(item.user_count) || 0,
      avg_event_per_user: parseFloat(item.avg_event_per_user) || 0
    });
  });
  
  // 오늘 데이터 추가 (덮어쓰기)
  todayData.forEach(item => {
    const key = `${item.date}_${item.event_name}`;
    dataMap.set(key, {
      date: item.date,
      event_name: item.event_name,
      event_count: parseInt(item.event_count) || 0,
      user_count: parseInt(item.user_count) || 0,
      avg_event_per_user: parseFloat(item.avg_event_per_user) || 0
    });
  });
  
  return Array.from(dataMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return b.event_count - a.event_count;
  });
};

module.exports = {
  getQueryWhereClause,
  getAvgSessionQuery,
  getSessionsPerUserQuery,
  getClickCountsQuery,
  getViewCountsQuery,
  getUsersOverTimeQuery,
  getPageTimesQuery,
  getBounceRateQuery,
  getPageViewsQuery,
  getPageStatsQuery,
  getVisitStatsQuery,
  getRevisitQuery,
  // 새로운 이탈률 함수들 추가
  getTodayPageExitRate,
  getPastPageExitRate,
  mergePageExitData,
  // 새로운 세션 참여도 함수들 추가
  getTodaySessionEngagement,
  getPastSessionEngagement,
  mergeSessionEngagementData,
  // 새로운 페이지 평균 체류 시간 함수들 추가
  getTodayPageTimes,
  getPastPageTimes,
  mergePageTimesData,
  // 새로운 페이지 별 조회수 함수들 추가
  getTodayPageViews,
  getPastPageViews,
  mergePageViewsData,
  // 새로운 전체 조회수/클릭수 함수들 추가
  getTodayViewCounts,
  getPastViewCounts,
  mergeViewCountsData,
  getTodayClickCounts,
  getPastClickCounts,
  mergeClickCountsData,
  // 새로운 이벤트 카운트 함수들 추가
  getTodayEventCounts,
  getPastEventCounts,
  mergeEventCountsData,
};