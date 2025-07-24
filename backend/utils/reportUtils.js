function getKpiQueries(sdk_key, startDate, endDate) {
  return {
    visitors: {
      category: '유입 분석: 방문자 수 및 변화 추이',
      query: `
        SELECT
          date,
          visitors,
          new_visitors,
          existing_visitors,
          round(new_visitors / visitors * 100, 1) AS new_ratio,
          avg_session_seconds,
          visitors - lag(visitors, 1) OVER (ORDER BY date) AS diff_vs_yesterday,
          round((visitors - lag(visitors, 1) OVER (ORDER BY date)) / lag(visitors, 1) OVER (ORDER BY date) * 100, 1) AS change_pct
        FROM daily_metrics
        WHERE sdk_key = '${sdk_key}'
          AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        ORDER BY date
      `
    },
    clicks: {
      category: '클릭 분석: 인기 클릭 세그먼트 Top 10',
      query: `
        SELECT
          date,
          segment_type,
          segment_value,
          total_clicks,
          total_users,
          round(total_clicks / total_users, 2) AS click_rate
        FROM klicklab.daily_click_summary
        WHERE sdk_key = '${sdk_key}'
          AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
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
          round(total_events / unique_users, 2) AS avg_per_user
        FROM klicklab.daily_event_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
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
          uniqMerge(visitors_state) AS visitors,
          round(conversions / visitors * 100, 2) AS conversion_rate
        FROM daily_overview_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        GROUP BY summary_date
        ORDER BY date
      `
    },
    pages: {
      category: '페이지 분석: 페이지 조회수 및 체류 시간',
      query: `
        SELECT
          summary_date AS date,
          page_path,
          sumMerge(pageview_count_state) AS page_views,
          uniqMerge(unique_users_state) AS active_users,
          round(page_views / active_users, 2) AS pageviews_per_user,
          round(sumMerge(total_time_state) / active_users, 2) AS avg_time_on_page
        FROM klicklab.daily_page_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        GROUP BY summary_date, page_path
        ORDER BY page_views DESC
        LIMIT 10
      `
    },
    bounce: {
      category: '이탈 분석: 페이지별 이탈률 Top 10',
      query: `
        SELECT
          date,
          page_path,
          round(page_exits / page_views * 100, 1) AS bounce_rate,
          page_views,
          page_exits,
          avg_time_on_page_seconds
        FROM klicklab.daily_page_stats
        WHERE sdk_key = '${sdk_key}'
          AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
        ORDER BY bounce_rate DESC
        LIMIT 10
      `
    }
  };
}

module.exports = { getKpiQueries };
