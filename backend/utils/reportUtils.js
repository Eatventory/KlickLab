function getKpiQueries(sdk_key, startDate, endDate) {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const today = koreaTime.toISOString().slice(0, 10);
  
  const isOnlyToday = startDate === endDate && startDate === today;
  const includesOnlyToday = startDate <= today && endDate >= today;

  return {
    visitors: {
      category: '유입 분석: 방문자 수 및 변화 추이',
      query: `
        WITH date_series AS (
          SELECT toDate('${startDate}') + number AS date
          FROM numbers(datediff('day', toDate('${startDate}'), toDate('${endDate}')) + 1)
        )
        SELECT 
          ds.date,
          ifNull(agg.visitors, 0) AS visitors,
          ifNull(agg.sessions, 0) AS sessions,
          round(ifNull(agg.total_duration, 0) / nullIf(agg.sessions, 0), 2) AS avg_session_seconds
        FROM date_series ds
        LEFT JOIN (
          ${isOnlyToday ? `
            SELECT
              summary_date AS date,
              toUInt32(uniqMerge(unique_users_state)) AS visitors,
              toUInt32(uniqMerge(sessions_state)) AS sessions,
              sumMerge(session_duration_sum_state) AS total_duration
            FROM klicklab.agg_user_session_stats
            WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${startDate}')
            GROUP BY summary_date
          ` : includesOnlyToday ? `
            SELECT
              date,
              sum(visitors) AS visitors,
              sum(sessions) AS sessions,
              sum(total_duration) AS total_duration
            FROM (
              SELECT
                summary_date AS date,
                toUInt32(uniqMerge(unique_users_state)) AS visitors,
                toUInt32(uniqMerge(sessions_state)) AS sessions,
                sumMerge(session_duration_sum_state) AS total_duration
              FROM klicklab.agg_user_session_stats
              WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${today}')
              GROUP BY summary_date

              UNION ALL

              SELECT
                summary_date AS date,
                sum(users) AS visitors,
                sum(sessions) AS sessions,
                sum(session_duration_sum) AS total_duration
              FROM klicklab.flat_user_session_stats
              WHERE sdk_key = '${sdk_key}'
                AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
              GROUP BY summary_date
            )
            GROUP BY date
          ` : `
            SELECT
              summary_date AS date,
              sum(users) AS visitors,
              sum(sessions) AS sessions,
              sum(session_duration_sum) AS total_duration
            FROM klicklab.flat_user_session_stats
            WHERE sdk_key = '${sdk_key}' 
              AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
            GROUP BY summary_date
          `}
        ) agg ON ds.date = agg.date
        ORDER BY ds.date ASC
      `
    },

    conversions: {
      category: '전환 분석: 전환 수 및 전환율 변화',
      query: `
        WITH date_series AS (
          SELECT toDate('${startDate}') + number AS date
          FROM numbers(datediff('day', toDate('${startDate}'), toDate('${endDate}')) + 1)
        )
        SELECT 
          ds.date,
          ifNull(agg.conversions, 0) AS conversions,
          ifNull(agg.visitors, 0) AS visitors,
          round(ifNull(agg.conversions, 0) / nullIf(agg.visitors, 0) * 100, 2) AS conversion_rate
        FROM date_series ds
        LEFT JOIN (
          ${isOnlyToday ? `
            SELECT
              summary_date AS date,
              sumMerge(conversions_state) AS conversions,
              toUInt32(uniqMerge(users_state)) AS visitors
            FROM klicklab.agg_traffic_marketing_stats
            WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${startDate}')
            GROUP BY summary_date
          ` : includesOnlyToday ? `
            SELECT
              date,
              sum(conversions) AS conversions,
              sum(visitors) AS visitors
            FROM (
              SELECT
                summary_date AS date,
                sumMerge(conversions_state) AS conversions,
                toUInt32(uniqMerge(users_state)) AS visitors
              FROM klicklab.agg_traffic_marketing_stats
              WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${today}')
              GROUP BY summary_date

              UNION ALL

              SELECT
                summary_date AS date,
                sum(conversions) AS conversions,
                sum(users) AS visitors
              FROM klicklab.flat_traffic_marketing_stats
              WHERE sdk_key = '${sdk_key}' 
                AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
              GROUP BY summary_date
            )
            GROUP BY date
          ` : `
            SELECT
              summary_date AS date,
              sum(conversions) AS conversions,
              sum(users) AS visitors
            FROM klicklab.flat_traffic_marketing_stats
            WHERE sdk_key = '${sdk_key}' 
              AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
            GROUP BY summary_date
          `}
        ) agg ON ds.date = agg.date
        ORDER BY ds.date ASC
      `
    },

    pages: {
      category: '페이지 분석: 페이지 조회수 및 체류 시간',
      query: `
        ${isOnlyToday ? `
        -- 오늘만: agg 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          toUInt64(sumMerge(page_views_state)) AS page_views,
          toUInt32(uniqMerge(unique_page_views_state)) AS active_users,
          round(sumMerge(page_views_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS pageviews_per_user,
          round(sumMerge(time_on_page_sum_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS avg_time_on_page
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${startDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        ORDER BY date ASC, page_path ASC
        LIMIT 10
        ` : includesOnlyToday ? `
        -- 오늘 포함: 과거 + 오늘 합치기
        SELECT
          summary_date AS date,
          page_path,
          toUInt64(sumMerge(page_views_state)) AS page_views,
          toUInt32(uniqMerge(unique_page_views_state)) AS active_users,
          round(sumMerge(page_views_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS pageviews_per_user,
          round(sumMerge(time_on_page_sum_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS avg_time_on_page
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${today}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        
        UNION ALL
        
        SELECT
          summary_date AS date,
          page_path,
          page_views,
          unique_page_views AS active_users,
          round(page_views / nullIf(unique_page_views, 0), 2) AS pageviews_per_user,
          round(time_on_page_sum / nullIf(unique_page_views, 0), 2) AS avg_time_on_page
        FROM klicklab.flat_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
          AND page_path != ''
        GROUP BY summary_date, page_path, page_views, unique_page_views, time_on_page_sum
        ORDER BY date ASC, page_path ASC
        LIMIT 10
        ` : `
        -- 과거만: flat 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          page_views,
          unique_page_views AS active_users,
          round(page_views / nullIf(unique_page_views, 0), 2) AS pageviews_per_user,
          round(time_on_page_sum / nullIf(unique_page_views, 0), 2) AS avg_time_on_page
        FROM klicklab.flat_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path, page_views, unique_page_views, time_on_page_sum
        ORDER BY date ASC, page_path ASC
        LIMIT 10
        `}
      `
    },

    events: {
      category: '이벤트 분석: 사용자 행동 Top 10',
      query: `
        SELECT
          event_name,
          total_events,
          unique_users,
          round(total_events / nullIf(unique_users, 0), 2) AS avg_per_user
        FROM (
          ${isOnlyToday ? `
            SELECT
              event_name,
              toUInt64(sumMerge(event_count_state)) AS total_events,
              toUInt32(uniqMerge(unique_users_state)) AS unique_users
            FROM klicklab.agg_event_stats
            WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${startDate}')
              AND event_name != ''
            GROUP BY event_name
          ` : includesOnlyToday ? `
            SELECT
              event_name,
              sum(total_events) AS total_events,
              sum(unique_users) AS unique_users
            FROM (
              SELECT
                event_name,
                toUInt64(sumMerge(event_count_state)) AS total_events,
                toUInt32(uniqMerge(unique_users_state)) AS unique_users
              FROM klicklab.agg_event_stats
              WHERE sdk_key = '${sdk_key}' AND summary_date = toDate('${today}')
                AND event_name != ''
              GROUP BY event_name

              UNION ALL

              SELECT
                event_name,
                event_count AS total_events,
                unique_users
              FROM klicklab.flat_event_stats
              WHERE sdk_key = '${sdk_key}' 
                AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
                AND event_name != ''
            )
            GROUP BY event_name
          ` : `
            SELECT
              event_name,
              sum(event_count) AS total_events,
              sum(unique_users) AS unique_users
            FROM klicklab.flat_event_stats
            WHERE sdk_key = '${sdk_key}' 
              AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
              AND event_name != ''
            GROUP BY event_name
          `}
        )
        ORDER BY total_events DESC
        LIMIT 10
      `
    },

    clicks: {
      category: '클릭 분석: 인기 클릭 세그먼트 Top 10',
      query: `
        ${isOnlyToday ? `
        -- 오늘만: agg 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          toUInt64(sumMerge(event_count_state)) AS total_clicks,
          toUInt32(uniqMerge(unique_users_state)) AS total_users,
          round(sumMerge(event_count_state) / nullIf(uniqMerge(unique_users_state), 0), 2) AS click_rate
        FROM klicklab.agg_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${startDate}')
          AND event_name IN ('auto_click', 'user_click', 'click')
        GROUP BY summary_date, page_path
        ORDER BY total_clicks DESC
        LIMIT 10
        ` : includesOnlyToday ? `
        -- 오늘 포함: 과거 + 오늘 합치기
        SELECT
          summary_date AS date,
          page_path,
          toUInt64(sumMerge(event_count_state)) AS total_clicks,
          toUInt32(uniqMerge(unique_users_state)) AS total_users,
          round(sumMerge(event_count_state) / nullIf(uniqMerge(unique_users_state), 0), 2) AS click_rate
        FROM klicklab.agg_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${today}')
          AND event_name IN ('auto_click', 'user_click', 'click')
        GROUP BY summary_date, page_path
        
        UNION ALL
        
        SELECT
          summary_date AS date,
          page_path,
          event_count AS total_clicks,
          unique_users AS total_users,
          round(event_count / nullIf(unique_users, 0), 2) AS click_rate
        FROM klicklab.flat_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
          AND event_name IN ('auto_click', 'user_click', 'click')
        GROUP BY summary_date, page_path, event_count, unique_users
        ORDER BY total_clicks DESC
        LIMIT 10
        ` : `
        -- 과거만: flat 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          event_count AS total_clicks,
          unique_users AS total_users,
          round(event_count / nullIf(unique_users, 0), 2) AS click_rate
        FROM klicklab.flat_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND event_name IN ('auto_click', 'user_click', 'click')
        GROUP BY summary_date, page_path, event_count, unique_users
        ORDER BY total_clicks DESC
        LIMIT 10
        `}
      `
    },

    bounce: {
      category: '이탈 분석: 페이지별 이탈률 Top 10',
      query: `
        ${isOnlyToday ? `
        -- 오늘만: agg 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          round(sumMerge(exits_state) / nullIf(sumMerge(page_views_state), 0) * 100, 1) AS bounce_rate,
          toUInt64(sumMerge(page_views_state)) AS page_views,
          toUInt64(sumMerge(exits_state)) AS page_exits,
          round(sumMerge(time_on_page_sum_state) / nullIf(sumMerge(page_views_state), 0), 1) AS avg_time_on_page_seconds
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${startDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        ORDER BY bounce_rate DESC
        LIMIT 10
        ` : includesOnlyToday ? `
        -- 오늘 포함: 과거 + 오늘 합치기
        SELECT
          summary_date AS date,
          page_path,
          round(sumMerge(exits_state) / nullIf(sumMerge(page_views_state), 0) * 100, 1) AS bounce_rate,
          toUInt64(sumMerge(page_views_state)) AS page_views,
          toUInt64(sumMerge(exits_state)) AS page_exits,
          round(sumMerge(time_on_page_sum_state) / nullIf(sumMerge(page_views_state), 0), 1) AS avg_time_on_page_seconds
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date = toDate('${today}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        
        UNION ALL
        
        SELECT
          summary_date AS date,
          page_path,
          round(exits / nullIf(page_views, 0) * 100, 1) AS bounce_rate,
          page_views,
          exits AS page_exits,
          round(time_on_page_sum / nullIf(page_views, 0), 1) AS avg_time_on_page_seconds
        FROM klicklab.flat_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${today}') - INTERVAL 1 DAY
          AND page_path != ''
        GROUP BY summary_date, page_path, exits, page_views, time_on_page_sum
        ORDER BY bounce_rate DESC
        LIMIT 10
        ` : `
        -- 과거만: flat 테이블 사용
        SELECT
          summary_date AS date,
          page_path,
          round(exits / nullIf(page_views, 0) * 100, 1) AS bounce_rate,
          page_views,
          exits AS page_exits,
          round(time_on_page_sum / nullIf(page_views, 0), 1) AS avg_time_on_page_seconds
        FROM klicklab.flat_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path, exits, page_views, time_on_page_sum
        ORDER BY bounce_rate DESC
        LIMIT 10
        `}
      `
    }
  };
}

module.exports = { getKpiQueries };
