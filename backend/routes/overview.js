const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");

router.get('/session-duration', async (req, res) => {
  try {
    // const todayQuery = `
    //   SELECT avg(duration) AS avg_s FROM (
    //     SELECT session_id, dateDiff(
    //       'second',
    //       min(toTimeZone(timestamp, 'Asia/Seoul')),
    //       max(toTimeZone(timestamp, 'Asia/Seoul'))
    //     ) AS duration
    //     FROM events
    //     WHERE toTimeZone(timestamp, 'Asia/Seoul') >= now() - INTERVAL 1 DAY
    //     GROUP BY session_id
    //     LIMIT 1000
    //   )
    // `;

    const todayQuery = `
      SELECT toUInt32(avg(duration)) AS avg_s FROM (
        SELECT session_id, dateDiff(
          'second',
          min(toTimeZone(timestamp, 'Asia/Seoul')),
          max(toTimeZone(timestamp, 'Asia/Seoul'))
        ) AS duration
        FROM events
        WHERE toDate(toTimeZone(timestamp, 'Asia/Seoul')) >= now() - INTERVAL 1 DAY
        GROUP BY session_id
        HAVING count(*) > 1
      )
    `;

    const prevQuery = `
      SELECT date, avg_session_seconds
      FROM klicklab.daily_metrics
      WHERE date = yesterday()
    `;

    const [todayRes, prevRes] = await Promise.all([
      clickhouse.query({ query: todayQuery, format: 'JSONEachRow' }).then(r => r.json()),
      clickhouse.query({ query: prevQuery, format: 'JSONEachRow' }).then(r => r.json())
    ]);

    const todayAvgSec = +(todayRes[0]?.avg_s || 0);
    const prevAvgSec = +(prevRes[0]?.avg_session_seconds || 0);
    // console.log(todayAvgSec, prevAvgSec);

    const deltaSec = todayAvgSec - prevAvgSec;
    const deltaMs = deltaSec * 1000;
    const averageSessionTimeMs = todayAvgSec * 1000;

    const formatSeconds = (sec) => {
      if (sec <= 0) return '0초';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      return [
        h > 0 ? `${String(h).padStart(2, '0')}` : '00',
        String(m).padStart(2, '0'),
        String(s).padStart(2, '0')
      ].join(':');
    };

    const formatDelta = (sec) => {
      if (sec === 0) return '변화 없음';
      const sign = sec > 0 ? '+' : '-';
      const abs = Math.abs(sec);
      const m = Math.floor(abs / 60);
      const s = Math.round(abs % 60);
      return `${sign}${m > 0 ? `${m}분 ` : ''}${s > 0 ? `${s}초` : ''}`.trim();
    };

    // const data = {
    //   averageSessionTimeMs,
    //   deltaMs,
    //   formattedDuration: formatSeconds(todayAvgSec),
    //   deltaFormatted: formatDelta(deltaSec),
    //   trend: deltaSec > 0 ? 'up' : deltaSec < 0 ? 'down' : 'flat',
    //   period: '24h',
    //   periodLabel: '최근 24시간'
    // };
    const data = {
      averageDuration: averageSessionTimeMs,
      deltaDuration: deltaMs,
      trend: deltaSec > 0 ? 'up' : deltaSec < 0 ? 'down' : 'flat',
      period: '24h',
      periodLabel: '최근 24시간'
    }
    // console.log(data);
    res.status(200).json(data);
  } catch (err) {
    console.error('Session Duration API ERROR:', err);
    res.status(500).json({
      averageSessionTimeMs: 0,
      deltaMs: 0,
      formattedDuration: '0초',
      deltaFormatted: '변화 없음',
      trend: 'flat',
      period: '24h',
      periodLabel: '최근 24시간'
    });
  }
});

router.get('/conversion-summary', async (req, res) => {
  const fromPage = req.query.from || '/';
  const toPage = req.query.to || '/';
  const period = '7d';
  const periodLabel = '최근 7일';

  const query = `
    WITH
      -- 오늘 데이터
      today_a_sessions AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM events
        WHERE page_path = '${fromPage}' AND toDate(timestamp) = today()
        GROUP BY session_id
      ),
      today_b_sessions AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM events
        WHERE page_path = '${toPage}' AND toDate(timestamp) = today()
        GROUP BY session_id
      ),
      today_joined AS (
        SELECT a.session_id, a.a_time, b.b_time
        FROM today_a_sessions a
        INNER JOIN today_b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),
      today_data AS (
        SELECT count() AS converted, 
              (SELECT count() FROM today_a_sessions) AS total
        FROM today_joined
      ),
      
      -- 지난 6일치 데이터 (오늘 제외)
      past_data AS (
        SELECT 
          sumIf(visitors, date >= today() - 7 AND date < today()) AS total,
          0 AS converted
        FROM daily_metrics
      ),

      -- 과거 7~13일 전 데이터 (변화량 비교용)
      prev_data AS (
        SELECT 
          sumIf(visitors, date >= today() - 14 AND date < today() - 7) AS total,
          0 AS converted
        FROM daily_metrics
      )

    SELECT 
      (t.converted + 0) AS converted,
      (t.total + p.total) AS total,
      round(t.converted / nullIf(t.total + p.total, 0) * 100, 1) AS conversion_rate,
      0 AS past_converted,
      prev.total AS past_total,
      round(0 / nullIf(prev.total, 0) * 100, 1) AS past_rate
    FROM today_data t, past_data p, prev_data prev;
  `;

  try {
    const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
    const [data] = await resultSet.json();

    const { converted, total, conversion_rate, past_rate } = data;

    const delta = isFinite(conversion_rate - past_rate) ? +(conversion_rate - past_rate).toFixed(1) : 0;
    const trend =
      delta > 0 ? 'up' :
      delta < 0 ? 'down' : 'flat';

    const response = {
      conversionRate: total === 0 ? 0 : conversion_rate,
      convertedSessions: converted ?? 0,
      totalSessions: total ?? 0,
      deltaRate: delta,
      trend,
      period,
      periodLabel,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Conversion Rate API ERROR:', err);
    res.status(200).json({
      conversionRate: 0,
      convertedSessions: 0,
      totalSessions: 0,
      deltaRate: 0,
      trend: 'flat',
      period,
      periodLabel,
    });
  }
});

module.exports = router;
