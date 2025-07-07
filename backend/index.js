// =========================
// KlickLab API 목록 및 설명
// =========================
//
// 1. 트래픽 대시보드 통합 API
//    GET /api/dashboard/traffic
//    - 방문자 추이(시간/일/주/월), 메인페이지 클릭 랭킹 등 대시보드용 데이터 제공
//    - 쿼리 파라미터: period, gender, ageGroup
//    - 예시: /api/dashboard/traffic?period=hourly&gender=all&ageGroup=all
//
// 2. 버튼 클릭 통계 API (데모)
//    GET /api/button-clicks
//    - 버튼별 클릭 수, 클릭 이벤트 목록 제공
//    - 쿼리 파라미터: platform (선택)
//    - 예시: /api/button-clicks?platform=mobile
//
// 3. 이벤트 수집 API
//    POST /api/analytics/collect
//    - 클라이언트에서 사용자 행동 데이터 수집용
//    - body: { event_name, timestamp, ... }
//
// (필요시 추가 분석 API: /api/dashboard/channel, /api/dashboard/timezone 등)
//
// =========================
const express = require('express');
const cors = require('cors');
const app = express();
const path = require("path");
const PORT = 3000;
const metricsPort = 9091; // 메트릭 전용 포트
const client = require('prom-client');

// Prometheus 메트릭을 담을 전용 공간(레지스트리)을 생성
const register = new client.Registry();

// CPU, 메모리 등 기본적인 Node.js 프로세스 메트릭을 수집하고, 우리가 만든 register에 등록
client.collectDefaultMetrics({ register });

// HTTP 요청 카운터
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'], // '어떤 방식', '어떤 경로', '어떤 상태코드'로 요청이 왔는지 구분하기 위한 라벨
});
register.registerMetric(httpRequestCounter);

// HTTP 요청 지연 시간 히스토그램
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000], // 응답 시간을 담을 구간(버킷)을 정의
});
register.registerMetric(httpRequestDurationMicroseconds);

const clickhouse = require("./src/config/clickhouse");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// app.use(cors());
app.use(cors({
  origin: '*',
  methods: ['POST'],
}));

// 메트릭 수집 미들웨어
app.use((req, res, next) => {
  // 1. 요청이 들어오는 순간, 타이머를 시작하고 '종료 함수(end)'를 받아둔다.
  const end = httpRequestDurationMicroseconds.startTimer();
  // 2. 이 요청에 대한 응답(res)이 완전히 끝나면('finish' 이벤트) 아래 함수를 실행.
  res.on('finish', () => {
    // 3. 경로를 깔끔하게 정리. (e.g., /users/123 -> /users/:id)
    const route = req.route ? req.route.path : req.path;
    // 4. HTTP 요청 카운터(Counter)의 값을 1 증가.
    // 어떤 요청이었는지 라벨(method, route, status_code)과 함께 기록.
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
    // 5. 요청 시작부터 지금까지의 시간을 계산하여 히스토그램에 기록.
    //    마찬가지로 라벨과 함께 기록.
    end({ route, code: res.statusCode, method: req.method });
  });
  // 6. 다음 미들웨어 또는 실제 API 로직을 실행.
  next();
});

/* stats 라우팅 */
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

// Prometheus 메트릭 엔드포인트
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

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

// 이벤트 데이터 수집을 위한 POST API 엔드포인트를 ClickHouse 기반으로 리팩토링
app.post('/api/analytics/collect', async (req, res) => {
  const data = req.body;
  try {
    // UTC → KST 변환
    const utcDate = new Date(data.timestamp);
    const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    // ClickHouse INSERT 쿼리 작성 (컬럼명은 events 테이블 구조에 맞게 조정 필요)
    const insertQuery = `
      INSERT INTO events (
        event_name, timestamp, client_id, user_id, session_id,
        page_path, page_title, referrer,
        device_type, os, browser, language,
        timezone, traffic_medium, traffic_source, traffic_campaign,
        user_gender, user_age,
        properties, context
      ) VALUES
    `;
    // JSON 컬럼은 문자열로 변환
    const values = [
      data.event_name,
      kstDate.toISOString().replace('T', ' ').slice(0, 19),
      data.client_id,
      data.user_id,
      data.session_id,
      data.properties?.page_path ?? null,
      data.properties?.page_title ?? null,
      data.properties?.referrer ?? null,
      data.context?.device?.device_type ?? null,
      data.context?.device?.os ?? null,
      data.context?.device?.browser ?? null,
      data.context?.device?.language ?? null,
      data.context?.geo?.timezone ?? null,
      data.context?.traffic_source?.traffic_medium ?? null,
      data.context?.traffic_source?.traffic_source ?? null,
      data.context?.traffic_source?.campaign ?? null,
      data.user_gender,
      data.user_age,
      JSON.stringify(data.properties ?? {}),
      JSON.stringify(data.context ?? {})
    ];
    // ClickHouse는 VALUES (...) 형식의 다중 행 삽입 지원
    const valuesStr = `(${values.map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`).join(', ')})`;
    const fullQuery = insertQuery + valuesStr;
    await clickhouse.query({ query: fullQuery, format: 'JSON' });
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('ClickHouse INSERT ERROR:', err);
    res.status(500).json({ error: 'ClickHouse insert failed' });
  }
});

app.listen(PORT, () => {
   console.log(`KlickLab API server listening on port ${mainPort}`);
});

app.listen(metricsPort, () => {
  console.log(`Metrics server listening on port ${metricsPort}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the KlickLab!');
});
