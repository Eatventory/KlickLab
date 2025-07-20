function getQueryWhereClause (table = "minutes", startDate, endDate) {
  if (!startDate || !endDate) return '1 = 1';
  
  if (table === "daily") {
    return `date BETWEEN toDate('${startDate}') AND toDate('${endDate}')`;
  } else {
    return `date_time BETWEEN toDateTime('${startDate} 00:00:00') AND toDateTime('${endDate} 23:59:59')`;
  }
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
        toDate(date_time) AS date,
        round(avg(avg_session_seconds), 2) AS avgSessionSeconds
      FROM (
        SELECT cast(date AS DateTime) AS date_time, avg_session_seconds FROM daily_metrics
        WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, avg_session_seconds FROM hourly_metrics
        WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, avg_session_seconds FROM minutes_metrics
        WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
      )
      GROUP BY date
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
      ifNull(userData.totalClicks, 0) AS totalClicks,
      ifNull(userData.sessionsPerUser, 0) AS sessionsPerUser
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) d
    LEFT JOIN (
      SELECT
        toDate(date_time) AS date,
        sum(visitors) AS totalVisitors,
        sum(clicks) AS totalClicks,
        round(sum(clicks) / nullIf(sum(visitors), 0), 2) AS sessionsPerUser
      FROM (
        SELECT cast(date AS DateTime) AS date_time, clicks, visitors FROM daily_metrics
        WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, clicks, visitors FROM hourly_metrics
        WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, clicks, visitors FROM minutes_metrics
        WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
      )
      GROUP BY date
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
      SELECT toDate(date_time) AS date, sum(clicks) AS totalClicks
      FROM (
        SELECT cast(date AS DateTime) AS date_time, clicks FROM daily_metrics
        WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, clicks FROM hourly_metrics
        WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT date_time, clicks FROM minutes_metrics
        WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
      )
      GROUP BY date
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
      SELECT date, sum(views) AS totalViews FROM (
        SELECT date, sum(page_views) AS views FROM daily_page_stats
        WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
        GROUP BY date
        UNION ALL
        SELECT toDate(date_time) AS date, sum(page_views) AS views FROM hourly_page_stats
        WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
        GROUP BY date
        UNION ALL
        SELECT toDate(date_time) AS date, sum(page_views) AS views FROM minutes_page_stats
        WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
        GROUP BY date
      )
      GROUP BY date
    ) AS v ON d.date = v.date
    ORDER BY d.date ASC
  `;
}

function getUsersOverTimeQuery(startDate, endDate, sdk_key) {
  return `
    SELECT
      formatDateTime(date_time, '%Y-%m-%d %H:00:00') AS datetime,
      sum(visitors) AS total_visitors,
      sum(existing_visitors) AS existing_visitors,
      sum(new_visitors) AS new_visitors
    FROM klicklab.hourly_metrics
    WHERE date_time BETWEEN toDateTime('${startDate} 00:00:00') AND toDateTime('${startDate} 23:59:59')
      AND sdk_key = '${sdk_key}'
    GROUP BY datetime
    ORDER BY datetime ASC
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
      round(sum(avg_time_on_page_seconds * page_views) / sum(page_views), 1) AS averageTime
    FROM (
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM daily_page_stats
      WHERE ${getQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM hourly_page_stats
      WHERE ${getQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, avg_time_on_page_seconds, page_views
      FROM minutes_page_stats
      WHERE ${getQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY page
    ORDER BY averageTime DESC
    LIMIT ${limit}
  `;
}

function getBounceRateQuery(startDate, endDate, sdk_key, limit = 10) {
  return `
    SELECT
      page_path,
      sum(page_views) AS total_views,
      sum(page_exits) AS total_exits,
      round(total_exits / total_views * 100, 1) AS bounce_rate
    FROM (
      SELECT page_path, page_views, page_exits
      FROM daily_page_stats
      WHERE ${getQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views, page_exits
      FROM hourly_page_stats
      WHERE ${getQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views, page_exits
      FROM minutes_page_stats
      WHERE ${getQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
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
      sum(page_views) AS totalViews
    FROM (
      SELECT page_path, page_views
      FROM daily_page_stats
      WHERE ${getQueryWhereClause("daily", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views
      FROM hourly_page_stats
      WHERE ${getQueryWhereClause("hourly", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
      UNION ALL
      SELECT page_path, page_views
      FROM minutes_page_stats
      WHERE ${getQueryWhereClause("minutes", startDate, endDate)}
        AND sdk_key = '${sdk_key}'
    )
    GROUP BY page
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
        AND dpa.summary_date BETWEEN start AND end
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
      FROM daily_page_agg dpa
      LEFT JOIN daily_metrics dm
        ON dpa.summary_date = dm.date AND dpa.sdk_key = '${sdk_key}'
      WHERE dpa.sdk_key = '${sdk_key}'
        AND dpa.summary_date BETWEEN start AND end
      GROUP BY dpa.summary_date, dpa.page_path
    ) AS data ON d.date = data.date
    ORDER BY d.date ASC, sessions DESC
  `;
}

function getRevisitQuery(startDate, endDate, sdk_key) {
  return `
    WITH date_series AS (
      SELECT toDate('${startDate}') + number AS date
      FROM numbers(datediff('day', toDate('${startDate}'), toDate('${endDate}')) + 1)
    ),
    dau_table AS (
      SELECT date, visitors AS dau
      FROM klicklab.daily_metrics
      WHERE sdk_key = '${sdk_key}' AND date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    ),
    wau_table AS (
      SELECT date, visitors AS wau
      FROM klicklab.weekly_metrics
      WHERE sdk_key = '${sdk_key}'
    ),
    mau_table AS (
      SELECT date, visitors AS mau
      FROM klicklab.weekly_metrics
      WHERE sdk_key = '${sdk_key}'
    )
    SELECT
      ds.date AS date,
      dt.dau,
      wt.wau,
      mt.mau,
      round(dt.dau / wt.wau, 4) AS dau_wau_ratio,
      round(dt.dau / mt.mau, 4) AS dau_mau_ratio,
      round(wt.wau / mt.mau, 4) AS wau_mau_ratio
    FROM date_series ds
    LEFT JOIN dau_table dt ON ds.date = dt.date
    LEFT JOIN wau_table wt ON wt.date = toStartOfWeek(ds.date)
    LEFT JOIN mau_table mt ON mt.date = toStartOfMonth(ds.date)
    ORDER BY ds.date ASC
  `;
}

module.exports = {
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
  getRevisitQuery,
};