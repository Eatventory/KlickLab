const express = require('express');
const cors = require('cors');
const app = express();
const path = require("path");
const PORT = 3000;

const clickhouse = require("./src/config/clickhouse");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// app.use(cors());
app.use(cors({
  origin: '*',
  methods: ['POST'],
}));

/* stats 라우팅 */
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

/* 데모용 테스트 API */
app.get('/api/button-clicks', async (req, res) => {
  const query = req.query;

  try {
    const where = [
      `event_name = 'auto_click'`,
      `is_button = 1`,
      `target_text REGEXP '^button [1-7]$'`,
      query.platform ? `(device_type = '${query.platform}' OR device_os = '${query.platform}')` : null
    ].filter(Boolean).join(' AND ');

    const result = await clickhouse.query({
      query: `
        SELECT element_path, target_text
        FROM events
        WHERE ${where}
      `,
      format: 'JSON',
    });

    const json = await result.json();
    const { data } = json;

    let clicks = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < data.length; i++) {
      const tmp = data[i].target_text;
      clicks[Number(tmp.charAt(tmp.length - 1))]++;
    }

    const buttonClicks = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => {
        const index = i + 1;
        return [`button${index}`, clicks[index]];
      })
    );

    const clickEvents = data.map(q => ({
      element_path: q.element_path ?? '',
      target_text: q.target_text ?? '',
    }));

    res.status(200).json({ buttonClicks, clickEvents });
  } catch (err) {
    console.error('ClickHouse SELECT ERROR:', err);
    res.status(500).json({ error: 'ClickHouse query failed' });
  }
});

/* ▼ 다른 라우팅 파일로 분리해야 함 */
// Traffic 탭 통합 API
app.get('/api/dashboard/traffic', async (req, res) => {
  try {
    const { period = 'daily', gender = 'all', ageGroup = 'all' } = req.query;
    const now = new Date();
    let startDate, groupBy, dateFormat, dateAlias;

    // 기간별 설정
    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = `formatDateTime(timestamp, '%Y-%m-%d %H')`;
        dateAlias = 'hour';
        break;
      case 'daily':
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        groupBy = `formatDateTime(timestamp, '%Y-%m-%d')`;
        dateAlias = 'day';
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000);
        groupBy = `concat(toString(toISOYear(timestamp)), '-', lpad(toString(toISOWeek(timestamp)), 2, '0'))`;
        dateAlias = 'week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        groupBy = `formatDateTime(timestamp, '%Y-%m')`;
        dateAlias = 'month';
        break;
      default:
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        groupBy = `formatDateTime(timestamp, '%Y-%m-%d')`;
        dateAlias = 'day';
    }
    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endDateStr = now.toISOString().slice(0, 19).replace('T', ' ');

    // 필터 WHERE 조건 생성
    let where = [
      `timestamp >= toDateTime('${startDateStr}')`,
      `timestamp <= toDateTime('${endDateStr}')`,
      `event_name = 'auto_click'`
    ];
    if (gender !== 'all') {
      where.push(`user_gender = '${gender}'`);
    }
    if (ageGroup !== 'all') {
      let ageCond = '';
      switch (ageGroup) {
        case '10s': ageCond = 'user_age >= 10 AND user_age < 20'; break;
        case '20s': ageCond = 'user_age >= 20 AND user_age < 30'; break;
        case '30s': ageCond = 'user_age >= 30 AND user_age < 40'; break;
        case '40s': ageCond = 'user_age >= 40 AND user_age < 50'; break;
        case '50s': ageCond = 'user_age >= 50 AND user_age < 60'; break;
        case '60s+': ageCond = 'user_age >= 60'; break;
      }
      if (ageCond) where.push(ageCond);
    }
    const whereClause = where.join(' AND ');

    // 방문자 추이 쿼리 (unique user_id, total count)
    const visitorTrendQuery = `
      SELECT
        ${groupBy} AS date,
        count() AS visitors,
        uniq(user_id) AS newVisitors,
        (count() - uniq(user_id)) AS returningVisitors
      FROM events
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `;
    const visitorTrendResult = await clickhouse.query({ query: visitorTrendQuery, format: 'JSON' });
    const visitorTrendJson = await visitorTrendResult.json();
    const visitorTrend = visitorTrendJson.data.map(row => ({
      date: row.date,
      visitors: Number(row.visitors),
      newVisitors: Number(row.newVisitors),
      returningVisitors: Number(row.returningVisitors)
    }));

    // 메인 페이지에서 이동하는 페이지 Top 10 쿼리
    const mainPageNavQuery = `
      SELECT
        properties_page_path AS page,
        count() AS clicks,
        uniq(user_id) AS uniqueClicks
      FROM events
      WHERE ${whereClause} AND properties_page_path != '/'
      GROUP BY page
      ORDER BY clicks DESC
      LIMIT 10
    `;
    const mainPageNavResult = await clickhouse.query({ query: mainPageNavQuery, format: 'JSON' });
    const mainPageNavJson = await mainPageNavResult.json();
    const mainPageNavigation = mainPageNavJson.data.map((row, idx) => ({
      name: row.page,
      page: row.page,
      clicks: Number(row.clicks),
      uniqueClicks: Number(row.uniqueClicks),
      clickRate: 0, // 필요시 계산
      avgTimeToClick: 0, // 필요시 계산
      rank: idx + 1,
      id: (idx + 1).toString()
    }));

    res.status(200).json({
      visitorTrend,
      mainPageNavigation,
      filters: { period, gender, ageGroup }
    });
  } catch (err) {
    console.error('ClickHouse Dashboard API ERROR:', err);
    res.status(500).json({ error: 'Failed to get traffic dashboard data' });
  }
});
/* ▲ 다른 라우팅 파일로 분리해야 함 */

app.listen(PORT, () => {
  console.log(`KlickLab 서버 실행 중: http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the KlickLab!');
});