function getQueryWhereClause(startDate, endDate) {
  if (!startDate || !endDate) return '1 = 1';
  return `summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
}

function getAvgSessionQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      round(sumMerge(session_dur_sum_state) / nullIf(uniqMerge(session_count_state), 0), 2) AS avgSessionSeconds
    FROM daily_overview_agg
    WHERE sdk_key = '${sdk_key}'
      AND ${getQueryWhereClause(startDate, endDate)}
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
}

function getSessionsPerUserQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      uniqMerge(visitors_state) AS totalVisitors,
      sumMerge(total_clicks_state) AS totalClicks,
      round(sumMerge(total_clicks_state) / nullIf(uniqMerge(visitors_state), 0), 2) AS sessionsPerUser
    FROM daily_overview_agg
    WHERE sdk_key = '${sdk_key}'
      AND ${getQueryWhereClause(startDate, endDate)}
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
}

function getClickCountsQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      sumMerge(total_clicks_state) AS totalClicks
    FROM daily_overview_agg
    WHERE sdk_key = '${sdk_key}'
      AND ${getQueryWhereClause(startDate, endDate)}
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
}

function getViewCountsQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      summary_date AS date,
      sumMerge(pageviews_state) AS totalViews
    FROM daily_overview_agg
    WHERE sdk_key = '${sdk_key}'
      AND ${getQueryWhereClause(startDate, endDate)}
    GROUP BY summary_date
    ORDER BY summary_date ASC
  `;
}

function getUsersOverTimeQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start_date,
      toDate('${endDate}')   AS end_date,
      dateDiff('day', start_date, end_date) AS days_diff

    SELECT
      b.date                                     AS date,
      ifNull(d.daily_visitors,  0)               AS daily_users,
      ifNull(w.weekly_visitors, 0)               AS weekly_users,
      ifNull(m.monthly_visitors, 0)              AS monthly_users
    FROM (
      SELECT addDays(start_date, number) AS date
      FROM numbers(days_diff + 1)
    ) AS b

    LEFT JOIN (
      SELECT
        summary_date AS date,
        uniqMerge(visitors_state) AS daily_visitors
      FROM daily_overview_agg
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start_date AND end_date
      GROUP BY summary_date
    ) AS d ON b.date = d.date

    LEFT JOIN (
      SELECT
        end_date  AS date,
        uniqMerge(visitors_state) AS weekly_visitors
      FROM (
        SELECT summary_date AS sdate, visitors_state
        FROM daily_overview_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN addDays(start_date, -6) AND end_date
      )
      ARRAY JOIN
        arrayMap(i -> addDays(sdate, i), range(0, 7)) AS end_date
      WHERE end_date BETWEEN start_date AND end_date
      GROUP BY end_date
    ) AS w ON b.date = w.date

    LEFT JOIN (
      SELECT
        end_date  AS date,
        uniqMerge(visitors_state) AS monthly_visitors
      FROM (
        SELECT summary_date AS sdate, visitors_state
        FROM daily_overview_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN addDays(start_date, -29) AND end_date
      )
      ARRAY JOIN
        arrayMap(i -> addDays(sdate, i), range(0, 30)) AS end_date
      WHERE end_date BETWEEN start_date AND end_date
      GROUP BY end_date
    ) AS m ON b.date = m.date

    ORDER BY b.date ASC
  `;
}

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
        FROM daily_event_agg
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
    SELECT
      page_path,
      sumMerge(page_views_state) AS total_views,
      sumMerge(exits_state) AS total_exits,
      round(total_exits / total_views * 100, 1) AS bounce_rate
    FROM agg_page_content_stats
    WHERE sdk_key = '${sdk_key}'
      AND summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY page_path
    HAVING total_views > 100 AND bounce_rate > 0
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
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT
      d.date AS date,
      data.page_path,
      ifNull(data.page_views, 0) AS page_views,
      ifNull(data.active_users, 0) AS active_users,
      ifNull(data.pageviews_per_user, 0) AS pageviews_per_user,
      ifNull(data.avg_engagement_time_sec, 0) AS avg_engagement_time_sec,
      ifNull(data.total_events, 0) AS total_events
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT
        dpa.summary_date AS date,
        dpa.page_path,
        sumMerge(dpa.pageview_count_state) AS page_views,
        uniqMerge(dpa.unique_users_state) AS active_users,
        round(sumMerge(dpa.pageview_count_state) / nullIf(uniqMerge(dpa.unique_users_state), 0), 2) AS pageviews_per_user,
        round(sumMerge(dpa.total_time_state) / nullIf(uniqMerge(dpa.unique_users_state), 0), 2) AS avg_engagement_time_sec,
        sumMerge(dea.event_count_state) AS total_events
      FROM daily_page_agg AS dpa
      LEFT JOIN daily_event_agg AS dea
        ON dpa.summary_date = dea.summary_date AND dpa.sdk_key = dea.sdk_key
      WHERE dpa.sdk_key = '${sdk_key}'
        AND dpa.summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      GROUP BY dpa.summary_date, dpa.page_path
    ) AS data ON d.date = data.date
    ORDER BY d.date DESC, page_views DESC
  `;
}

function getVisitStatsQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      dateDiff('day', start, end) AS days
    SELECT
      d.date AS date,
      data.page_path,
      ifNull(data.sessions, 0) AS sessions,
      ifNull(data.active_users, 0) AS active_users,
      ifNull(data.new_visitors, 0) AS new_visitors,
      ifNull(data.avg_session_seconds, 0) AS avg_session_seconds
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT
        dpa.summary_date AS date,
        dpa.page_path,
        argMax(dm.visitors, dm.date) AS sessions,
        uniqMerge(dpa.unique_users_state) AS active_users,
        argMax(dm.new_visitors, dm.date) AS new_visitors,
        round(sumMerge(dpa.total_time_state) / nullIf(uniqMerge(dpa.unique_users_state), 0), 2) AS avg_session_seconds
      FROM daily_page_agg AS dpa
      LEFT JOIN daily_metrics AS dm
        ON dpa.summary_date = dm.date AND dpa.sdk_key = dm.sdk_key
      WHERE dpa.sdk_key = '${sdk_key}'
        AND dpa.summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
      GROUP BY dpa.summary_date, dpa.page_path
    ) AS data ON d.date = data.date
    ORDER BY d.date ASC, sessions DESC
  `;
}

function getRevisitQuery(startDate, endDate, sdk_key) {
  return `
    WITH
      toDate('${startDate}') AS start_date,
      toDate('${endDate}')   AS end_date,
      dateDiff('day', start_date, end_date) AS days_diff

    SELECT
      b.date                                      AS date,
      ifNull(d.daily_visitors,  0)                AS dau,
      ifNull(w.weekly_visitors, 0)                AS wau,
      ifNull(m.monthly_visitors, 0)               AS mau,
      round(ifNull(d.daily_visitors, 0)
            / nullIf(ifNull(w.weekly_visitors, 0), 0)
          , 4)                                    AS dau_wau_ratio,
      round(ifNull(d.daily_visitors, 0)
            / nullIf(ifNull(m.monthly_visitors, 0), 0)
          , 4)                                    AS dau_mau_ratio,
      round(ifNull(w.weekly_visitors, 0)
            / nullIf(ifNull(m.monthly_visitors, 0), 0)
          , 4)                                    AS wau_mau_ratio
    FROM (
      SELECT addDays(start_date, number) AS date
      FROM numbers(days_diff + 1)
    ) AS b

    LEFT JOIN (
      SELECT
        summary_date AS date,
        uniqMerge(visitors_state) AS daily_visitors
      FROM daily_overview_agg
      WHERE sdk_key = '${sdk_key}'
        AND summary_date BETWEEN start_date AND end_date
      GROUP BY summary_date
    ) AS d ON b.date = d.date

    LEFT JOIN (
      SELECT
        end_date AS date,
        uniqMerge(visitors_state) AS weekly_visitors
      FROM (
        SELECT summary_date AS sdate, visitors_state
        FROM daily_overview_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN addDays(start_date, -6) AND end_date
      )
      ARRAY JOIN arrayMap(i -> addDays(sdate, i), range(7)) AS end_date
      WHERE end_date BETWEEN start_date AND end_date
      GROUP BY end_date
    ) AS w ON b.date = w.date

    LEFT JOIN (
      SELECT
        end_date AS date,
        uniqMerge(visitors_state) AS monthly_visitors
      FROM (
        SELECT summary_date AS sdate, visitors_state
        FROM daily_overview_agg
        WHERE sdk_key = '${sdk_key}'
          AND summary_date BETWEEN addDays(start_date, -29) AND end_date
      )
      ARRAY JOIN arrayMap(i -> addDays(sdate, i), range(30)) AS end_date
      WHERE end_date BETWEEN start_date AND end_date
      GROUP BY end_date
    ) AS m ON b.date = m.date

    ORDER BY b.date ASC
  `;
}


module.exports = {
  getQueryWhereClause,
  getAvgSessionQuery,
  getSessionsPerUserQuery,
  getClickCountsQuery,
  getViewCountsQuery,
  getUsersOverTimeQuery,
  getEventCountsQuery,
  getPageTimesQuery,
  getBounceRateQuery,
  getPageViewsQuery,
  getPageStatsQuery,
  getVisitStatsQuery,
  getRevisitQuery
};