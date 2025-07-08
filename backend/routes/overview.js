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

    // const formatSeconds = (sec) => {
    //   if (sec <= 0) return '0초';
    //   const h = Math.floor(sec / 3600);
    //   const m = Math.floor((sec % 3600) / 60);
    //   const s = Math.floor(sec % 60);
    //   return [
    //     h > 0 ? `${String(h).padStart(2, '0')}` : '00',
    //     String(m).padStart(2, '0'),
    //     String(s).padStart(2, '0')
    //   ].join(':');
    // };

    // const formatDelta = (sec) => {
    //   if (sec === 0) return '변화 없음';
    //   const sign = sec > 0 ? '+' : '-';
    //   const abs = Math.abs(sec);
    //   const m = Math.floor(abs / 60);
    //   const s = Math.round(abs % 60);
    //   return `${sign}${m > 0 ? `${m}분 ` : ''}${s > 0 ? `${s}초` : ''}`.trim();
    // };

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
    res.status(200).json(data);
  } catch (err) {
    console.error('Session Duration API ERROR:', err);
    res.status(500).json({ error: 'Failed to get session duration data' });
    // res.status(500).json({
    //   averageSessionTimeMs: 0,
    //   deltaMs: 0,
    //   formattedDuration: '0초',
    //   deltaFormatted: '변화 없음',
    //   trend: 'flat',
    //   period: '24h',
    //   periodLabel: '최근 24시간'
    // });
  }
});

router.get('/conversion-summary', async (req, res) => {
  const fromPage = req.query.from || '/cart';
  const toPage = req.query.to || '/checkout/success';
  const period = '7d';
  const periodLabel = '최근 7일';

  const query = `
    WITH
      -- 오늘 포함 최근 7일 간 A, B 페이지 진입 세션
      a_sessions AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM events
        WHERE page_path = '${fromPage}' AND toDate(timestamp) >= today() - 6
        GROUP BY session_id
      ),
      b_sessions AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM events
        WHERE page_path = '${toPage}' AND toDate(timestamp) >= today() - 6
        GROUP BY session_id
      ),
      joined AS (
        SELECT a.session_id, a.a_time, b.b_time
        FROM a_sessions a
        INNER JOIN b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),

      -- 지난 7일간 데이터
      recent_data AS (
        SELECT 
          (SELECT count() FROM joined) AS converted,
          (SELECT count() FROM a_sessions) AS total
      ),

      -- 그 이전 7일간 데이터 (변화 비교용)
      prev_a_sessions AS (
        SELECT session_id, min(timestamp) AS a_time
        FROM events
        WHERE page_path = '${fromPage}' AND toDate(timestamp) BETWEEN today() - 13 AND today() - 7
        GROUP BY session_id
      ),
      prev_b_sessions AS (
        SELECT session_id, min(timestamp) AS b_time
        FROM events
        WHERE page_path = '${toPage}' AND toDate(timestamp) BETWEEN today() - 13 AND today() - 7
        GROUP BY session_id
      ),
      prev_joined AS (
        SELECT a.session_id, a.a_time, b.b_time
        FROM prev_a_sessions a
        INNER JOIN prev_b_sessions b ON a.session_id = b.session_id AND a.a_time < b.b_time
      ),
      prev_data AS (
        SELECT 
          (SELECT count() FROM prev_joined) AS converted,
          (SELECT count() FROM prev_a_sessions) AS total
      )

    SELECT 
      r.converted AS converted,
      r.total AS total,
      round(r.converted / nullIf(r.total, 0) * 100, 1) AS conversion_rate,
      p.converted AS past_converted,
      p.total AS past_total,
      round(p.converted / nullIf(p.total, 0) * 100, 1) AS past_rate
    FROM recent_data r, prev_data p
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
    // console.log(response);
    res.status(200).json(response);
  } catch (err) {
    console.error('Conversion Rate API ERROR:', err);
    res.status(500).json({ error: 'Failed to get conversion rate data' });
  }
});

module.exports = router;
