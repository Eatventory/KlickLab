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
    WITH
      toDate('${startDate}') AS start,
      toDate('${endDate}') AS end,
      today() AS today,
      dateDiff('day', start, end) AS days

    SELECT
      base.date AS base_date,
      ifNull(daily.visitors, 0) AS daily_users,
      ifNull(weekly.users, 0) AS weekly_users,
      ifNull(monthly.users, 0) AS monthly_users
    FROM (
      SELECT addDays(start, number) AS date FROM numbers(days + 1)
    ) base

    LEFT JOIN (
      SELECT date, sum(visitors) AS visitors FROM (
        SELECT date, visitors FROM daily_metrics
        WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT toDate(date_time) AS date, visitors FROM hourly_metrics
        WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
        UNION ALL
        SELECT toDate(date_time) AS date, visitors FROM minutes_metrics
        WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
      )
      GROUP BY date
    ) daily ON base.date = daily.date

    LEFT JOIN (
      SELECT ref.date AS date, sumIf(dm.visitors, dm.date BETWEEN ref.date - INTERVAL 6 DAY AND ref.date) AS users
      FROM (
        SELECT addDays(start, number) AS date FROM numbers(days + 1)
      ) ref
      CROSS JOIN (
        SELECT * FROM (
          SELECT date, visitors FROM daily_metrics
          WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
          UNION ALL
          SELECT toDate(date_time) AS date, visitors FROM hourly_metrics
          WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
          UNION ALL
          SELECT toDate(date_time) AS date, visitors FROM minutes_metrics
          WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
        )
      ) dm
      GROUP BY ref.date
    ) weekly ON base.date = weekly.date

    LEFT JOIN (
      SELECT ref.date AS date, sumIf(dm.visitors, dm.date BETWEEN ref.date - INTERVAL 29 DAY AND ref.date) AS users
      FROM (
        SELECT addDays(start, number) AS date FROM numbers(days + 1)
      ) ref
      CROSS JOIN (
        SELECT * FROM (
          SELECT date, visitors FROM daily_metrics
          WHERE ${getQueryWhereClause("daily", startDate, endDate)} AND sdk_key = '${sdk_key}'
          UNION ALL
          SELECT toDate(date_time) AS date, visitors FROM hourly_metrics
          WHERE ${getQueryWhereClause("hourly", startDate, endDate)} AND sdk_key = '${sdk_key}'
          UNION ALL
          SELECT toDate(date_time) AS date, visitors FROM minutes_metrics
          WHERE ${getQueryWhereClause("minutes", startDate, endDate)} AND sdk_key = '${sdk_key}'
        )
      ) dm
      GROUP BY ref.date
    ) monthly ON base.date = monthly.date

    ORDER BY base_date ASC
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
        FROM klicklab.daily_event_agg
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
    SELECT
      dpa.summary_date AS date,
      dpa.page_path,
      sumMerge(dpa.pageview_count_state) AS page_views,
      uniqMerge(dpa.unique_users_state) AS active_users,
      round(page_views / active_users, 2) AS pageviews_per_user,
      round(sumMerge(dpa.total_time_state) / active_users, 2) AS avg_engagement_time_sec,
      sumMerge(dea.event_count_state) AS total_events
    FROM daily_page_agg AS dpa
    LEFT JOIN daily_event_agg AS dea
      ON dpa.summary_date = dea.summary_date AND dpa.sdk_key = dea.sdk_key
    WHERE dpa.sdk_key = '${sdk_key}'
      AND dpa.summary_date BETWEEN toDate('${startDate}') AND toDate('${endDate}')
    GROUP BY dpa.summary_date, dpa.page_path
    ORDER BY date DESC, page_views DESC
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
  getPageStatsQuery
};