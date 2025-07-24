function getKpiQueries(sdk_key, startDate, endDate) {
  return {
    visitors: {
      category: '유입 분석: 방문자 수 및 변화 추이',
      query: `
        SELECT
          summary_date AS date,
          uniqMerge(unique_users_state) AS visitors,
          uniqMerge(sessions_state) AS sessions,
          round(sumMerge(session_duration_sum_state) / nullIf(uniqMerge(sessions_state), 0), 2) AS avg_session_seconds
        FROM klicklab.agg_user_session_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        GROUP BY summary_date
        ORDER BY summary_date
      `
    },
    clicks: {
      category: '클릭 분석: 인기 클릭 세그먼트 Top 10',
      query: `
        SELECT
          summary_date AS date,
          page_path,
          sumMerge(event_count_state) AS total_clicks,
          uniqMerge(unique_users_state) AS total_users,
          round(sumMerge(event_count_state) / nullIf(uniqMerge(unique_users_state), 0), 2) AS click_rate
        FROM klicklab.agg_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND event_name IN ('auto_click', 'user_click', 'click')
        GROUP BY summary_date, page_path
        ORDER BY total_clicks DESC
        LIMIT 10
      `
    },
    events: {
      category: '이벤트 분석: 사용자 행동 Top 10',
      query: `
        SELECT
          event_name,
          sumMerge(event_count_state) AS total_events,
          uniqMerge(unique_users_state) AS unique_users,
          round(sumMerge(event_count_state) / nullIf(uniqMerge(unique_users_state), 0), 2) AS avg_per_user
        FROM klicklab.agg_event_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND event_name != ''
        GROUP BY event_name
        ORDER BY total_events DESC
        LIMIT 10
      `
    },
    conversions: {
      category: '전환 분석: 전환 수 및 전환율 변화',
      query: `
        SELECT
          summary_date AS date,
          sumMerge(conversions_state) AS conversions,
          uniqMerge(users_state) AS visitors,
          round(sumMerge(conversions_state) / nullIf(uniqMerge(users_state), 0) * 100, 2) AS conversion_rate
        FROM klicklab.agg_traffic_marketing_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        GROUP BY summary_date
        ORDER BY summary_date
      `
    },
    pages: {
      category: '페이지 분석: 페이지 조회수 및 체류 시간',
      query: `
        SELECT
          summary_date AS date,
          page_path,
          sumMerge(page_views_state) AS page_views,
          uniqMerge(unique_page_views_state) AS active_users,
          round(sumMerge(page_views_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS pageviews_per_user,
          round(sumMerge(time_on_page_sum_state) / nullIf(uniqMerge(unique_page_views_state), 0), 2) AS avg_time_on_page
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        ORDER BY page_views DESC
        LIMIT 10
      `
    },
    bounce: {
      category: '이탈 분석: 페이지별 이탈률 Top 10',
      query: `
        SELECT
          summary_date AS date,
          page_path,
          round(sumMerge(exits_state) / nullIf(sumMerge(page_views_state), 0) * 100, 1) AS bounce_rate,
          sumMerge(page_views_state) AS page_views,
          sumMerge(exits_state) AS page_exits,
          round(sumMerge(time_on_page_sum_state) / nullIf(sumMerge(page_views_state), 0), 1) AS avg_time_on_page_seconds
        FROM klicklab.agg_page_content_stats
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
          AND page_path != ''
        GROUP BY summary_date, page_path
        ORDER BY bounce_rate DESC
        LIMIT 10
      `
    }
  };
}

module.exports = { getKpiQueries };
